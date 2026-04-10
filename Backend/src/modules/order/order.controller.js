import { prisma } from "../../database/prisma.js";
import notificationService from "../notifications/notification.service.js";
import { isValidNepaliPhone } from "../../utils/validation.js";
import logger from "../../utils/logger.js";
import { decryptText } from "../../utils/encryption.js";
import config from "../../config/environment.js";

const ORDER_STATUS_ENUM_VALUES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_TRANSITIONS = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();
const ALLOWED_PAYMENT_METHODS = ["CASH_ON_DELIVERY", "ESEWA", "KHALTI"];
const STANDARD_DELIVERY_FEE = 40;
const KHALTI_SUCCESS_STATUS = "COMPLETED";
const KHALTI_HOLD_STATUSES = ["PENDING", "INITIATED"];
const KHALTI_FAILED_STATUSES = ["EXPIRED", "USER CANCELED", "FAILED", "REFUNDED"];

const normalizePhoneNumber = (value) => String(value || "").replace(/\D/g, "").trim();

const formatShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return "";
  }

  const fullName = String(shippingAddress.fullName || "").trim();
  const phone = normalizePhoneNumber(shippingAddress.phone);
  const label = String(shippingAddress.label || "").trim();
  const region = String(shippingAddress.region || "").trim();
  const city = String(shippingAddress.city || "").trim();
  const area = String(shippingAddress.area || "").trim();
  const street = String(shippingAddress.street || shippingAddress.buildingStreet || "").trim();
  const landmark = String(
    shippingAddress.landmark || shippingAddress.colonyLandmark || ""
  ).trim();

  const addressParts = [street, area, city, region].filter(Boolean);
  let addressLine = addressParts.join(", ");

  if (landmark) {
    addressLine = addressLine ? `${addressLine}, near ${landmark}` : landmark;
  }

  const prefix = [fullName, phone].filter(Boolean).join(", ");
  const suffix = label ? ` (${label})` : "";

  if (prefix && addressLine) {
    return `${prefix} - ${addressLine}${suffix}`;
  }

  return `${prefix || addressLine}${suffix}`.trim();
};

const resolveRequestedItemIds = (itemIds) => {
  const explicitIds = Array.isArray(itemIds) ? itemIds : [];
  return [...new Set(explicitIds.filter(Boolean).map(String))];
};

const normalizePayloadItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      id: item?.id || item?.medicineId || item?.inventoryId || null,
      medicineId: String(item?.medicineId || item?.inventoryId || item?.id || "").trim(),
      pharmacyId: String(item?.pharmacyId || "").trim(),
      quantity: Number(item?.quantity || 1),
      medicineName: item?.medicineName || null,
      genericName: item?.genericName || null,
    }))
    .filter((item) => item.medicineId);
};

const createHttpError = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const normalizeKhaltiStatus = (status) => String(status || "").trim().toUpperCase();

const getKhaltiBaseUrl = () => {
  const raw = String(
    process.env.KHALTI_API_BASE_URL ||
      (config.isProduction()
        ? "https://khalti.com/api/v2"
        : "https://dev.khalti.com/api/v2")
  ).trim();

  return raw.replace(/\/+$/, "");
};

const buildKhaltiAuthHeader = (secretKey) => `Key ${String(secretKey || "").trim()}`;

const resolveKhaltiUrls = () => {
  const frontendUrl = String(process.env.FRONTEND_URL || config.frontend.url || "").trim();

  if (!frontendUrl) {
    throw createHttpError(500, "FRONTEND_URL is not configured");
  }

  const base = frontendUrl.replace(/\/+$/, "");
  return {
    websiteUrl: base,
    returnUrl: `${base}/patient/payment/khalti/callback`,
  };
};

const parseKhaltiErrorBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveKhaltiApiError = (body, fallbackMessage) => {
  const detail = String(body?.detail || "").trim();

  if (detail.toLowerCase() === "invalid token.") {
    return createHttpError(
      400,
      "Invalid Khalti secret key configured for this pharmacy. Reconnect merchant settings using a valid live_secret_key.",
      {
        errorCode: "KHALTI_INVALID_SECRET",
        data: body,
      }
    );
  }

  if (detail.toLowerCase() === "authentication credentials were not provided.") {
    return createHttpError(
      400,
      "Khalti secret key is missing for this pharmacy. Please reconnect Khalti merchant settings.",
      {
        errorCode: "KHALTI_SECRET_MISSING",
        data: body,
      }
    );
  }

  return createHttpError(400, detail || body?.error_key || fallbackMessage, { data: body });
};

const callKhaltiInitiate = async (payload, secretKey) => {
  const response = await fetch(`${getKhaltiBaseUrl()}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: buildKhaltiAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseKhaltiErrorBody(response);

  if (!response.ok) {
    const err = resolveKhaltiApiError(body, "Failed to initiate Khalti payment");
    err.statusCode = response.status;
    throw err;
  }

  return body;
};

const callKhaltiLookup = async (pidx, secretKey) => {
  const response = await fetch(`${getKhaltiBaseUrl()}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: buildKhaltiAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const body = await parseKhaltiErrorBody(response);

  if (!response.ok && !body?.status) {
    const err = resolveKhaltiApiError(body, "Failed to verify Khalti payment");
    err.statusCode = response.status;
    throw err;
  }

  return body;
};

const getPharmacyKhaltiSecret = async (pharmacyId) => {
  const configEntry = await prisma.pharmacyPaymentConfig.findUnique({
    where: { pharmacyId },
    select: {
      isKhaltiConnected: true,
      khaltiPublicKey: true,
      khaltiSecretKeyEncrypted: true,
    },
  });

  if (!configEntry?.isKhaltiConnected || !configEntry.khaltiSecretKeyEncrypted) {
    throw createHttpError(400, "Pharmacy Khalti merchant is not connected");
  }

  return {
    publicKey: configEntry.khaltiPublicKey,
    secretKey: decryptText(configEntry.khaltiSecretKeyEncrypted),
  };
};

const mapKhaltiStatusToPaymentStatus = (status) => {
  const normalized = normalizeKhaltiStatus(status);

  if (normalized === KHALTI_SUCCESS_STATUS) {
    return "COMPLETED";
  }

  if (KHALTI_HOLD_STATUSES.includes(normalized)) {
    return normalized;
  }

  if (KHALTI_FAILED_STATUSES.includes(normalized)) {
    return "FAILED";
  }

  return "HOLD";
};

const ORDER_STATUS_PATIENT_MESSAGES = {
  PENDING: "Your order is pending confirmation.",
  ACCEPTED: "Your order has been accepted by the pharmacy.",
  PREPARING: "Your order is being prepared.",
  READY: "Your order is now Out for Delivery.",
  COMPLETED: "Your order has been completed.",
  CANCELLED: "Your order has been cancelled.",
};

const shouldAttemptInventoryDeduction = (nextStatus) =>
  nextStatus === "ACCEPTED" || nextStatus === "COMPLETED";

const NEXT_STATUS_HINTS = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const deductOrderInventory = async (tx, order, pharmacyId) => {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    throw createHttpError(400, "Order has no items to deduct from inventory");
  }

  for (const item of items) {
    const updated = await tx.inventory.updateMany({
      where: {
        id: item.inventoryId,
        pharmacyId,
        quantity: { gte: item.quantity },
      },
      data: {
        quantity: { decrement: item.quantity },
      },
    });

    if (updated.count !== 1) {
      throw createHttpError(
        409,
        `Insufficient inventory for ${item.medicineName || "an order item"}`
      );
    }
  }
};

export const placeOrderFromCart = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.userId || req.user?.id;
  const {
    mode,
    itemIds,
    items,
    deliveryAddress,
    shippingAddress,
    paymentMethod,
    contactNumber,
    summary,
    latitude,
    longitude,
  } = req.body || {};

  // Direct purchase: "buy-now" mode means items come directly from the medicine page,
  // not from the Cart table. The frontend always sends `mode` explicitly.
  const isDirectPurchase = mode === "buy-now";

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const normalizedDeliveryAddress = String(
    deliveryAddress || formatShippingAddress(shippingAddress)
  ).trim();
  const normalizedPaymentMethod = String(paymentMethod || "").trim().toUpperCase();
  const normalizedContactNumber = normalizePhoneNumber(
    contactNumber || shippingAddress?.phone
  );
  const payloadItems = normalizePayloadItems(items);
  const requestedItemIds = resolveRequestedItemIds(itemIds);
  const clientItemsTotal = summary?.itemsTotal === undefined ? null : Number(summary.itemsTotal);
  const clientDeliveryFee = summary?.deliveryFee === undefined ? null : Number(summary.deliveryFee);
  const clientTotal = summary?.total === undefined ? null : Number(summary.total);

  if (!normalizedDeliveryAddress) {
    return res.status(400).json({
      success: false,
      message: "Delivery address is required",
    });
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
    return res.status(400).json({
      success: false,
      message: "Valid payment method is required",
    });
  }

  const parsedLatitude = latitude === null || latitude === undefined || latitude === ""
    ? null
    : Number(latitude);
  const parsedLongitude = longitude === null || longitude === undefined || longitude === ""
    ? null
    : Number(longitude);

  if ((parsedLatitude === null) !== (parsedLongitude === null)) {
    return res.status(400).json({
      success: false,
      message: "Both latitude and longitude are required when sending GPS location",
    });
  }

  if (
    (parsedLatitude !== null && Number.isNaN(parsedLatitude)) ||
    (parsedLongitude !== null && Number.isNaN(parsedLongitude))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude/longitude format",
    });
  }

  if (
    (clientItemsTotal !== null && Number.isNaN(clientItemsTotal)) ||
    (clientDeliveryFee !== null && Number.isNaN(clientDeliveryFee)) ||
    (clientTotal !== null && Number.isNaN(clientTotal))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid checkout summary",
    });
  }

  if (payloadItems.length === 0 && requestedItemIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide either items or itemIds for checkout",
    });
  }

  try {
    const patient = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
      },
    });

    const finalContactNumber = normalizedContactNumber || normalizePhoneNumber(patient?.phone);
    if (!isValidNepaliPhone(finalContactNumber)) {
      return res.status(400).json({
        success: false,
        message: "A valid 10-digit Nepali contact number is required for checkout",
      });
    }

    let cart = null;
    let eligibleItems = isDirectPurchase || requestedItemIds.length === 0 ? payloadItems : [];

    if (eligibleItems.length === 0) {
      // Fallback for legacy cart-driven checkout when payload items are not sent.
      cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }

      eligibleItems = requestedItemIds.length > 0
        ? cart.items.filter(
            (item) =>
              requestedItemIds.includes(String(item.id)) ||
              requestedItemIds.includes(String(item.medicineId))
          )
        : cart.items.filter((item) => item.selected);

      if (eligibleItems.length === 0) {
        return res.status(400).json({ success: false, message: "No cart items selected for checkout" });
      }
    }

    const invalidPayloadItems = eligibleItems.filter(
      (item) => !item.pharmacyId || !Number.isInteger(item.quantity) || item.quantity <= 0
    );
    if (invalidPayloadItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Each checkout item must include medicineId, pharmacyId, and a positive quantity",
      });
    }

    const pharmacyIds = [...new Set(eligibleItems.map((item) => item.pharmacyId))];
    if (pharmacyIds.length > 1) {
      return res.status(409).json({
        success: false,
        errorCode: "PHARMACY_MISMATCH",
        message: "Selected items must be from a single pharmacy",
      });
    }

    const pharmacyId = pharmacyIds[0];
    const createdOrder = await prisma.$transaction(async (tx) => {
      const inventoryIds = eligibleItems.map((item) => item.medicineId);
      const inventoryList = await tx.inventory.findMany({
        where: {
          id: { in: inventoryIds },
          pharmacyId,
        },
        select: {
          id: true,
          name: true,
          genericName: true,
          quantity: true,
          price: true,
          expiryDate: true,
        },
      });

      const inventoryById = new Map(inventoryList.map((entry) => [entry.id, entry]));
      const insufficientItems = eligibleItems
        .map((item) => {
          const inv = inventoryById.get(item.medicineId);
          if (!inv) {
            return {
              itemId: item.id,
              medicineId: item.medicineId,
              reason: "NOT_FOUND",
            };
          }

          if (inv.quantity < item.quantity) {
            return {
              itemId: item.id,
              medicineId: item.medicineId,
              requestedQuantity: item.quantity,
              availableQuantity: inv.quantity,
              reason: "INSUFFICIENT_STOCK",
            };
          }

          return null;
        })
        .filter(Boolean);

      if (insufficientItems.length > 0) {
        throw createHttpError(409, "One or more items are out of stock", {
          errorCode: "INSUFFICIENT_INVENTORY",
          data: { insufficientItems },
        });
      }

      const itemsSubtotal = eligibleItems.reduce((sum, item) => {
        const inv = inventoryById.get(item.medicineId);
        const unitPrice = Number(inv?.price || 0);
        return sum + unitPrice * Number(item.quantity || 0);
      }, 0);
      const deliveryFee = eligibleItems.length > 0 ? STANDARD_DELIVERY_FEE : 0;
      const grandTotal = itemsSubtotal + deliveryFee;
      const persistedTotal = clientTotal !== null ? clientTotal : grandTotal;

      if (
        (clientItemsTotal !== null && Math.abs(clientItemsTotal - itemsSubtotal) > 0.01) ||
        (clientDeliveryFee !== null && Math.abs(clientDeliveryFee - deliveryFee) > 0.01) ||
        (clientTotal !== null && Math.abs(clientTotal - grandTotal) > 0.01)
      ) {
        throw createHttpError(409, "Order total changed. Please review your cart and try again.");
      }

      const isKhaltiPayment = normalizedPaymentMethod === "KHALTI";
      const order = await tx.order.create({
        data: {
          patientId: userId,
          pharmacyId,
          status: "PENDING",
          inventoryDeducted: !isKhaltiPayment,
          paymentStatus: isKhaltiPayment ? "INITIATED" : "NOT_REQUIRED",
          totalAmount: persistedTotal,
          deliveryAddress: normalizedDeliveryAddress,
          paymentMethod: normalizedPaymentMethod,
          contactNumber: finalContactNumber,
          ...(parsedLatitude !== null ? { latitude: parsedLatitude } : {}),
          ...(parsedLongitude !== null ? { longitude: parsedLongitude } : {}),
        },
      });

      await tx.orderItem.createMany({
        data: eligibleItems.map((item) => {
          const inv = inventoryById.get(item.medicineId);
          const unitPrice = Number(inv?.price || 0);
          const quantity = Number(item.quantity || 0);

          return {
            orderId: order.id,
            inventoryId: item.medicineId,
            medicineName: inv?.name || item.medicineName,
            genericName: inv?.genericName || item.genericName || null,
            unitPrice,
            quantity,
            lineTotal: unitPrice * quantity,
          };
        }),
      });

      if (!isKhaltiPayment) {
        for (const item of eligibleItems) {
          const updated = await tx.inventory.updateMany({
            where: {
              id: item.medicineId,
              pharmacyId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });

          if (updated.count !== 1) {
            throw createHttpError(409, "Inventory changed during checkout. Please try again.");
          }
        }
      }

      if (!isDirectPurchase && cart && !isKhaltiPayment) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            id: { in: eligibleItems.map((item) => item.id) },
          },
        });
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
    });

    let checkoutResponse = {
      order: createdOrder,
      payment: null,
    };

    if (normalizedPaymentMethod === "KHALTI") {
      try {
        const { websiteUrl, returnUrl } = resolveKhaltiUrls();
        const { secretKey } = await getPharmacyKhaltiSecret(createdOrder.pharmacyId);
        const amountInPaisa = Math.round(Number(createdOrder.totalAmount || 0) * 100);
        const purchaseOrderId = `order-${createdOrder.id}`;

        const khaltiInitPayload = {
          return_url: returnUrl,
          website_url: websiteUrl,
          amount: amountInPaisa,
          purchase_order_id: purchaseOrderId,
          purchase_order_name: `PharmEasy Order ${createdOrder.id.slice(0, 8)}`,
          customer_info: {
            name: String(req.user?.name || "PharmEasy Customer").slice(0, 100),
            email: String(req.user?.email || "customer@pharmeasy.app").slice(0, 120),
            phone: finalContactNumber,
          },
          amount_breakdown: [
            {
              label: "Medicine Total",
              amount: Math.round((Number(createdOrder.totalAmount || 0) - STANDARD_DELIVERY_FEE) * 100),
            },
            {
              label: "Delivery Fee",
              amount: STANDARD_DELIVERY_FEE * 100,
            },
          ],
        };

        const khaltiResponse = await callKhaltiInitiate(khaltiInitPayload, secretKey);

        const updatedOrder = await prisma.order.update({
          where: { id: createdOrder.id },
          data: {
            khaltiPidx: khaltiResponse.pidx,
            paymentStatus: "PENDING",
            notes: JSON.stringify({
              ...(createdOrder.notes ? { previousNotes: createdOrder.notes } : {}),
              purchaseOrderId,
              paymentExpiresAt: khaltiResponse.expires_at,
            }),
          },
          include: { items: true },
        });

        checkoutResponse = {
          order: updatedOrder,
          payment: {
            provider: "KHALTI",
            pidx: khaltiResponse.pidx,
            paymentUrl: khaltiResponse.payment_url,
            expiresAt: khaltiResponse.expires_at,
            expiresIn: khaltiResponse.expires_in,
            status: "PENDING",
          },
        };
      } catch (khaltiError) {
        await prisma.order.update({
          where: { id: createdOrder.id },
          data: {
            paymentStatus: "FAILED",
            notes: JSON.stringify({
              initError: khaltiError?.message || "Khalti initiate failed",
              failedAt: new Date().toISOString(),
            }),
          },
        });

        return res.status(400).json({
          success: false,
          message: khaltiError?.message || "Unable to start Khalti payment",
          ...(khaltiError?.data ? { data: khaltiError.data } : {}),
        });
      }
    }

    try {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
        select: {
          userId: true,
          pharmacyName: true,
        },
      });

      if (pharmacy?.userId && normalizedPaymentMethod !== "KHALTI") {
        await notificationService.createNotification(
          pharmacy.userId,
          "New Order Received",
          `A new patient order has been placed at ${pharmacy.pharmacyName || "your pharmacy"}.`,
          "NEW_ORDER",
          {
            orderId: createdOrder.id,
            link: "/pharmacy/orders",
            sound: "standard",
          },
          "PHARMACY",
          "high"
        );

        const io = req.app.get("io");
        if (io) {
          io.emit("NEW_ORDER", {
            orderId: createdOrder.id,
            recipientId: pharmacy.userId,
            pharmacyId,
            patientId: userId,
          });
        }
      }
    } catch (notificationError) {
      console.error("[CHECKOUT NOTIFICATION ERROR]", notificationError.message, notificationError.stack);
      logger.error("ORDER", "Checkout succeeded but notification dispatch failed", notificationError);
    }

    logger.info("ORDER", "Checkout completed", {
      userId,
      orderId: createdOrder.id,
      pharmacyId,
      itemCount: createdOrder.items?.length || 0,
      duration: `${Date.now() - startTime}ms`,
    });

    return res.status(201).json({
      success: true,
      data: checkoutResponse,
      message:
        normalizedPaymentMethod === "KHALTI"
          ? "Order created. Complete payment in Khalti to confirm."
          : "Order placed successfully",
    });
  } catch (error) {
    console.error("[CHECKOUT CRASH]", error.message, error.stack);
    logger.error("ORDER", "Checkout failed", error);
    const statusCode = Number(error?.statusCode || error?.status) || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to place order",
      ...(error?.errorCode ? { errorCode: error.errorCode } : {}),
      ...(error?.data ? { data: error.data } : {}),
    });
  }
};

export const verifyKhaltiPayment = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const pidx = String(req.body?.pidx || req.query?.pidx || "").trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!pidx) {
    return res.status(400).json({ success: false, message: "pidx is required" });
  }

  try {
    const result = await verifyKhaltiPaymentInternal({
      pidx,
      userId,
      app: req.app,
    });

    return res.status(result.statusCode).json(result.payload);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status) || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to verify Khalti payment",
      ...(error?.data ? { data: error.data } : {}),
    });
  }
};

const resolveOrderIdFromPurchaseOrderId = (purchaseOrderId) => {
  const value = String(purchaseOrderId || "").trim();
  if (!value) return null;
  const prefix = "order-";
  if (!value.startsWith(prefix)) return null;
  const orderId = value.slice(prefix.length).trim();
  return orderId || null;
};

const verifyKhaltiPaymentInternal = async ({ pidx, userId = null, purchaseOrderId = null, app }) => {
  const orderIdFromPurchase = resolveOrderIdFromPurchaseOrderId(purchaseOrderId);

  const whereClause = {
    khaltiPidx: pidx,
    ...(userId ? { patientId: userId } : {}),
    ...(orderIdFromPurchase ? { id: orderIdFromPurchase } : {}),
  };

  const order = await prisma.order.findFirst({
    where: whereClause,
    include: {
      items: {
        select: {
          inventoryId: true,
          medicineName: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    throw createHttpError(404, "Order not found for callback verification");
  }

  const { secretKey } = await getPharmacyKhaltiSecret(order.pharmacyId);
  const lookup = await callKhaltiLookup(pidx, secretKey);
  const normalizedKhaltiStatus = normalizeKhaltiStatus(lookup?.status);
  const expectedTotalPaisa = Math.round(Number(order.totalAmount || 0) * 100);
  const khaltiTotalPaisa = Number(lookup?.total_amount || 0);

  if (!Number.isFinite(khaltiTotalPaisa) || khaltiTotalPaisa <= 0) {
    throw createHttpError(400, "Invalid lookup amount returned by Khalti");
  }

  if (khaltiTotalPaisa !== expectedTotalPaisa) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "HOLD",
      },
    });

    throw createHttpError(409, "Payment amount mismatch detected. Order moved to hold state.", {
      data: {
        expectedTotalPaisa,
        khaltiTotalPaisa,
        pidx,
      },
    });
  }

  const internalPaymentStatus = mapKhaltiStatusToPaymentStatus(normalizedKhaltiStatus);
  const isSuccess = normalizedKhaltiStatus === KHALTI_SUCCESS_STATUS;

  let paymentJustCompleted = false;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        patientId: true,
        pharmacyId: true,
        paymentStatus: true,
        inventoryDeducted: true,
        items: {
          select: {
            inventoryId: true,
            medicineName: true,
            quantity: true,
          },
        },
      },
    });

    if (!currentOrder) {
      throw createHttpError(404, "Order not found");
    }

    if (isSuccess && !currentOrder.inventoryDeducted) {
      await deductOrderInventory(tx, currentOrder, currentOrder.pharmacyId);
    }

    paymentJustCompleted = isSuccess && currentOrder.paymentStatus !== "COMPLETED";

    const nextOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        ...(isSuccess && currentOrder.status === "PENDING" ? { status: "ACCEPTED" } : {}),
        paymentStatus: internalPaymentStatus,
        paymentTransactionId: lookup?.transaction_id || lookup?.tidx || null,
        paymentVerifiedAt: isSuccess ? new Date() : null,
        ...(isSuccess && !currentOrder.inventoryDeducted ? { inventoryDeducted: true } : {}),
      },
      include: { items: true },
    });

    if (isSuccess) {
      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: currentOrder.patientId,
          },
          medicineId: {
            in: currentOrder.items.map((item) => item.inventoryId),
          },
        },
      });
    }

    return nextOrder;
  });

  if (paymentJustCompleted) {
    try {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: updatedOrder.pharmacyId },
        select: { userId: true, pharmacyName: true },
      });

      if (pharmacy?.userId) {
        await notificationService.createNotification(
          pharmacy.userId,
          "New Paid Order Received",
          `A Khalti-paid order is ready for processing at ${pharmacy.pharmacyName || "your pharmacy"}.`,
          "NEW_ORDER",
          {
            orderId: updatedOrder.id,
            link: "/pharmacy/orders",
            sound: "standard",
          },
          "PHARMACY",
          "high"
        );

        const io = app?.get?.("io");
        if (io) {
          io.emit("NEW_ORDER", {
            orderId: updatedOrder.id,
            recipientId: pharmacy.userId,
            pharmacyId: updatedOrder.pharmacyId,
            patientId: updatedOrder.patientId,
          });
        }
      }
    } catch (notificationError) {
      logger.error("ORDER", "Khalti payment verified but pharmacy notification failed", {
        orderId: updatedOrder.id,
        error: notificationError?.message,
      });
    }
  }

  const statusCode = isSuccess ? 200 : 202;
  return {
    statusCode,
    payload: {
      success: isSuccess,
      data: {
        order: updatedOrder,
        payment: {
          provider: "KHALTI",
          pidx,
          status: normalizedKhaltiStatus,
          transactionId: lookup?.transaction_id || lookup?.tidx || null,
          totalAmountPaisa: Number(lookup?.total_amount || 0),
          refunded: Boolean(lookup?.refunded),
          feePaisa: Number(lookup?.fee || 0),
          final: isSuccess,
        },
      },
      message: isSuccess
        ? "Payment verified and completed"
        : "Payment not completed yet. Service is on hold until successful verification.",
    },
  };
};

export const verifyKhaltiPaymentFromCallback = async (req, res) => {
  const pidx = String(req.body?.pidx || req.query?.pidx || "").trim();
  const purchaseOrderId = String(
    req.body?.purchaseOrderId || req.body?.purchase_order_id || req.query?.purchase_order_id || ""
  ).trim();

  if (!pidx) {
    return res.status(400).json({ success: false, message: "pidx is required" });
  }

  if (!purchaseOrderId) {
    return res.status(400).json({
      success: false,
      message: "purchase_order_id is required for callback verification",
    });
  }

  try {
    const result = await verifyKhaltiPaymentInternal({
      pidx,
      purchaseOrderId,
      app: req.app,
    });

    return res.status(result.statusCode).json(result.payload);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status) || 500;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to verify Khalti callback payment",
      ...(error?.data ? { data: error.data } : {}),
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  const userId = req.user?.userId;
  const orderId = String(req.params?.orderId || req.params?.id || "").trim();
  const nextStatus = normalizeStatus(req.body?.status);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order id is required" });
  }

  if (!nextStatus || !ORDER_STATUS_ENUM_VALUES.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid order status. Allowed values: ${ORDER_STATUS_ENUM_VALUES.join(", ")}`,
    });
  }

  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!pharmacy?.id) {
      return res.status(404).json({ success: false, message: "Pharmacy not found" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          pharmacyId: true,
          patientId: true,
          inventoryDeducted: true,
          items: {
            select: {
              inventoryId: true,
              medicineName: true,
              quantity: true,
            },
          },
        },
      });

      if (!order || order.pharmacyId !== pharmacy.id) {
        throw createHttpError(404, "Order not found");
      }

      const currentStatus = normalizeStatus(order.status);
      const allowed = STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(nextStatus)) {
        throw createHttpError(
          400,
          `Cannot transition order from ${currentStatus} to ${nextStatus}`
        );
      }

      if (
        order.paymentMethod === "KHALTI" &&
        order.paymentStatus !== "COMPLETED" &&
        nextStatus !== "CANCELLED"
      ) {
        throw createHttpError(
          409,
          "Khalti payment is not completed yet. This order cannot be processed."
        );
      }

      if (shouldAttemptInventoryDeduction(nextStatus) && !order.inventoryDeducted) {
        await deductOrderInventory(tx, order, pharmacy.id);
      }

      const markInventoryDeducted =
        shouldAttemptInventoryDeduction(nextStatus) && !order.inventoryDeducted;

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          ...(markInventoryDeducted ? { inventoryDeducted: true } : {}),
        },
      });
    });

    try {
      const statusMessage =
        ORDER_STATUS_PATIENT_MESSAGES[nextStatus] ||
        `Your order status is now ${nextStatus.replaceAll("_", " ")}.`;

      await notificationService.createNotification(
        updated.patientId,
        "Order Status Updated",
        statusMessage,
        "NEW_ORDER",
        {
          orderId: updated.id,
          status: nextStatus,
          link: "/patient/orders",
          sound: "standard",
        },
        "PATIENT",
        "normal"
      );

      const io = req.app.get("io");
      if (io) {
        io.emit("NEW_ORDER", {
          orderId: updated.id,
          recipientId: updated.patientId,
          status: nextStatus,
          message: statusMessage,
        });
      }
    } catch (notificationError) {
      logger.error("ORDER", "Order status updated but patient notification failed", {
        orderId: updated.id,
        patientId: updated.patientId,
        error: notificationError.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: { order: updated },
      message: "Order status updated",
    });
  } catch (error) {
    console.error("[ORDER] updateOrderStatus error", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getPharmacyOrderDetails = async (req, res) => {
  const userId = req.user?.userId;
  const orderId = String(req.params?.orderId || "").trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order id is required" });
  }

  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId },
      select: { id: true, pharmacyName: true },
    });

    if (!pharmacy?.id) {
      return res.status(404).json({ success: false, message: "Pharmacy not found" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          select: {
            id: true,
            medicineName: true,
            genericName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order || order.pharmacyId !== pharmacy.id) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const itemCount = order.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const medicineCount = order.items.length;
    const subtotal = order.items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const deliveryFee = Math.max(Number(order.totalAmount || 0) - subtotal, 0);

    let nextAllowedStatuses = NEXT_STATUS_HINTS[order.status] || [];
    if (order.paymentMethod === "KHALTI" && order.paymentStatus !== "COMPLETED") {
      nextAllowedStatuses = nextAllowedStatuses.filter((status) => status === "CANCELLED");
    }

    return res.status(200).json({
      success: true,
      data: {
        order,
        summary: {
          medicineCount,
          itemCount,
          subtotal,
          deliveryFee,
          total: Number(order.totalAmount || 0),
        },
        process: {
          currentStatus: order.status,
          nextAllowedStatuses,
        },
      },
      message: "Order details fetched successfully",
    });
  } catch (error) {
    logger.error("ORDER", "Failed to fetch pharmacy order details", {
      orderId,
      userId,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pharmacy order details",
    });
  }
};
