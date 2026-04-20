import { prisma } from "../../database/prisma.js";
import notificationService from "../notifications/notification.service.js";
import { isValidNepaliPhone } from "../../utils/validation.js";
import logger from "../../utils/logger.js";
import { decryptText } from "../../utils/encryption.js";
import config from "../../config/environment.js";

// Allowed order statuses used across pharmacy workflow.
const ORDER_STATUS_ENUM_VALUES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

// Valid state transitions for order lifecycle updates.
const STATUS_TRANSITIONS = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// Normalize status input from client/API callbacks.
const normalizeStatus = (status) => String(status || "").trim().toUpperCase();
// Supported checkout payment methods.
const ALLOWED_PAYMENT_METHODS = ["CASH_ON_DELIVERY", "ESEWA", "KHALTI"];
// Flat delivery fee currently applied at checkout.
const STANDARD_DELIVERY_FEE = 40;
// Khalti status constants used for mapping.
const KHALTI_SUCCESS_STATUS = "COMPLETED";
const KHALTI_HOLD_STATUSES = ["PENDING", "INITIATED"];
const KHALTI_FAILED_STATUSES = ["EXPIRED", "USER CANCELED", "FAILED", "REFUNDED"];

// Keep phone numbers in normalized digits-only format.
const normalizePhoneNumber = (value) => String(value || "").replace(/\D/g, "").trim();

// Build a printable delivery address from structured shipping fields.
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

// Deduplicate and normalize explicit item IDs.
const resolveRequestedItemIds = (itemIds) => {
  const explicitIds = Array.isArray(itemIds) ? itemIds : [];
  return [...new Set(explicitIds.filter(Boolean).map(String))];
};

// Normalize checkout item payload from multiple frontend shapes.
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

// Create consistent HTTP errors with optional metadata.
const createHttpError = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const parseOrderNotes = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

// Normalize Khalti status values from remote API.
const normalizeKhaltiStatus = (status) => String(status || "").trim().toUpperCase();

// Resolve Khalti API base URL based on environment config.
const getKhaltiBaseUrl = () => {
  const raw = String(
    process.env.KHALTI_API_BASE_URL ||
      (config.isProduction()
        ? "https://khalti.com/api/v2"
        : "https://dev.khalti.com/api/v2")
  ).trim();

  return raw.replace(/\/+$/, "");
};

// Build auth header for Khalti API requests.
const buildKhaltiAuthHeader = (secretKey) => `Key ${String(secretKey || "").trim()}`;

// Resolve frontend URLs used in Khalti initiate payload.
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

// Parse API error body safely without crashing on invalid JSON.
const parseKhaltiErrorBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Map Khalti API error payload to user-facing error messages.
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

// Call Khalti initiate endpoint and throw normalized API errors.
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

// Call Khalti lookup endpoint and return lookup body.
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

// Fetch and decrypt pharmacy-specific Khalti secret key.
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

// Convert Khalti status to local paymentStatus enum.
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

// Patient-facing message copy for each order status.
const ORDER_STATUS_PATIENT_MESSAGES = {
  PENDING: "Your order is pending confirmation.",
  ACCEPTED: "Your order has been accepted by the pharmacy.",
  PREPARING: "Your order is being prepared.",
  READY: "Your order is now Out for Delivery.",
  COMPLETED: "Your order has been completed.",
  CANCELLED: "Your order has been cancelled.",
};

// Deduct inventory when order reaches active processing states.
const shouldAttemptInventoryDeduction = (nextStatus) =>
  nextStatus === "ACCEPTED" || nextStatus === "COMPLETED";

// Suggest next statuses for pharmacy dashboard actions.
const NEXT_STATUS_HINTS = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// Deduct inventory for each order line item inside DB transaction.
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

// Revert previously deducted inventory for each order line item.
const revertOrderInventory = async (tx, order, pharmacyId) => {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    const updated = await tx.inventory.updateMany({
      where: {
        id: item.inventoryId,
        pharmacyId,
      },
      data: {
        quantity: { increment: item.quantity },
      },
    });

    if (updated.count !== 1) {
      throw createHttpError(
        409,
        `Unable to restore inventory for ${item.medicineName || "an order item"}`
      );
    }
  }
};

export const placeOrderFromCart = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.userId || req.user?.id;
  // Normalize checkout-level request fields.
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

  // Buy-now mode skips the cart and checks out the selected items directly.
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

  // Checkout requires a persisted delivery address string.
  if (!normalizedDeliveryAddress) {
    return res.status(400).json({
      success: false,
      message: "Delivery address is required",
    });
  }

  // Payment method must match the allow-list.
  if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
    return res.status(400).json({
      success: false,
      message: "Valid payment method is required",
    });
  }

  // Parse optional delivery GPS coordinates.
  const parsedLatitude = latitude === null || latitude === undefined || latitude === ""
    ? null
    : Number(latitude);
  const parsedLongitude = longitude === null || longitude === undefined || longitude === ""
    ? null
    : Number(longitude);

  // Validate GPS pair integrity.
  if ((parsedLatitude === null) !== (parsedLongitude === null)) {
    return res.status(400).json({
      success: false,
      message: "Both latitude and longitude are required when sending GPS location",
    });
  }

  // Validate numeric GPS formatting.
  if (
    (parsedLatitude !== null && Number.isNaN(parsedLatitude)) ||
    (parsedLongitude !== null && Number.isNaN(parsedLongitude))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude/longitude format",
    });
  }

  // Validate summary fields when provided by client.
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

  // Require either payload items or item ID list.
  if (payloadItems.length === 0 && requestedItemIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide either items or itemIds for checkout",
    });
  }

  try {
    // Read patient profile to fill contact fallback.
    const patient = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
      },
    });

    // Validate final contact number used for delivery.
    const finalContactNumber = normalizedContactNumber || normalizePhoneNumber(patient?.phone);
    if (!isValidNepaliPhone(finalContactNumber)) {
      return res.status(400).json({
        success: false,
        message: "A valid 10-digit Nepali contact number is required for checkout",
      });
    }

    // Resolve eligible checkout items from direct payload or cart selection.
    let cart = null;
    let eligibleItems = isDirectPurchase || requestedItemIds.length === 0 ? payloadItems : [];

    if (eligibleItems.length === 0) {
      // Fall back to the saved cart when the client does not send item details.
      // Load cart with stable ordering for deterministic checkout.
      cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              medicineId: true,
              pharmacyId: true,
              quantity: true,
              medicineName: true,
              genericName: true,
              createdAt: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }

      // If the request specifies item IDs, only those items are checked out.
      eligibleItems = requestedItemIds.length > 0
        ? cart.items.filter(
            (item) =>
              requestedItemIds.includes(String(item.id)) ||
              requestedItemIds.includes(String(item.medicineId))
          )
        : cart.items.filter((item) => item.selected !== false);

      if (eligibleItems.length === 0) {
        return res.status(400).json({ success: false, message: "No cart items selected for checkout" });
      }
    }

    // Validate each item has pharmacy, medicine, and positive quantity.
    const invalidPayloadItems = eligibleItems.filter(
      (item) => !item.pharmacyId || !Number.isInteger(item.quantity) || item.quantity <= 0
    );
    if (invalidPayloadItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Each checkout item must include medicineId, pharmacyId, and a positive quantity",
      });
    }

    const groupedItemsByPharmacy = new Map();
    for (const item of eligibleItems) {
      const pharmacyKey = String(item.pharmacyId);
      if (!groupedItemsByPharmacy.has(pharmacyKey)) {
        groupedItemsByPharmacy.set(pharmacyKey, []);
      }
      groupedItemsByPharmacy.get(pharmacyKey).push(item);
    }

    const groupedPharmacyIds = [...groupedItemsByPharmacy.keys()];
    const isKhaltiPayment = normalizedPaymentMethod === "KHALTI";

    // Split checkout into one order per pharmacy inside a single transaction.
    const createdOrders = await prisma.$transaction(async (tx) => {
      const pharmacies = await tx.pharmacy.findMany({
        where: {
          id: { in: groupedPharmacyIds },
        },
        select: {
          id: true,
          userId: true,
          pharmacyName: true,
        },
      });

      const pharmacyById = new Map(pharmacies.map((pharmacy) => [String(pharmacy.id), pharmacy]));

      const inventoryIds = [...new Set(eligibleItems.map((item) => item.medicineId))];
      const inventoryList = await tx.inventory.findMany({
        where: {
          id: { in: inventoryIds },
          pharmacyId: { in: groupedPharmacyIds },
        },
        select: {
          id: true,
          pharmacyId: true,
          name: true,
          genericName: true,
          quantity: true,
          price: true,
          expiryDate: true,
        },
      });

      const inventoryByCompositeKey = new Map(
        inventoryList.map((entry) => [`${entry.pharmacyId}::${entry.id}`, entry])
      );

      const getPharmacyName = (pharmacyId) =>
        String(pharmacyById.get(String(pharmacyId))?.pharmacyName || "Unknown Pharmacy");

      const buildOutOfStockError = ({ medicineName, pharmacyName }) =>
        createHttpError(
          400,
          `Order failed: ${medicineName || "Medicine"} is out of stock at ${pharmacyName || "Unknown Pharmacy"}.`,
          {
            errorCode: "INSUFFICIENT_INVENTORY",
          }
        );

      const insufficientItems = eligibleItems
        .map((item) => {
          const key = `${item.pharmacyId}::${item.medicineId}`;
          const inv = inventoryByCompositeKey.get(key);
          if (!inv) {
            return {
              itemId: item.id,
              medicineId: item.medicineId,
              pharmacyId: item.pharmacyId,
              medicineName: item.medicineName || item.genericName || "Medicine",
              pharmacyName: getPharmacyName(item.pharmacyId),
              reason: "NOT_FOUND",
            };
          }

          if (inv.quantity < item.quantity) {
            return {
              itemId: item.id,
              medicineId: item.medicineId,
              pharmacyId: item.pharmacyId,
              medicineName: inv.name || item.medicineName || item.genericName || "Medicine",
              pharmacyName: getPharmacyName(item.pharmacyId),
              requestedQuantity: item.quantity,
              availableQuantity: inv.quantity,
              reason: "INSUFFICIENT_STOCK",
            };
          }

          return null;
        })
        .filter(Boolean);

      if (insufficientItems.length > 0) {
        throw buildOutOfStockError(insufficientItems[0]);
      }

      const pharmacySubtotals = new Map();
      for (const [pharmacyId, itemsForPharmacy] of groupedItemsByPharmacy.entries()) {
        const subtotal = itemsForPharmacy.reduce((sum, item) => {
          const inv = inventoryByCompositeKey.get(`${pharmacyId}::${item.medicineId}`);
          return sum + Number(inv?.price || 0) * Number(item.quantity || 0);
        }, 0);
        pharmacySubtotals.set(pharmacyId, subtotal);
      }

      const itemsSubtotal = [...pharmacySubtotals.values()].reduce((sum, value) => sum + value, 0);
      const deliveryFee = eligibleItems.length > 0 ? STANDARD_DELIVERY_FEE : 0;
      const grandTotal = itemsSubtotal + deliveryFee;

      if (
        (clientItemsTotal !== null && Math.abs(clientItemsTotal - itemsSubtotal) > 0.01) ||
        (clientDeliveryFee !== null && Math.abs(clientDeliveryFee - deliveryFee) > 0.01) ||
        (clientTotal !== null && Math.abs(clientTotal - grandTotal) > 0.01)
      ) {
        throw createHttpError(409, "Order total changed. Please review your cart and try again.");
      }

      const orderIds = [];
      const groupedEntries = [...groupedItemsByPharmacy.entries()];
      const patientCart = await tx.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      for (let index = 0; index < groupedEntries.length; index += 1) {
        const [pharmacyId, itemsForPharmacy] = groupedEntries[index];
        const pharmacyItemsSubtotal = pharmacySubtotals.get(pharmacyId) || 0;
        const pharmacyDeliveryFee = index === 0 ? deliveryFee : 0;
        const orderTotalAmount = pharmacyItemsSubtotal + pharmacyDeliveryFee;
        const pharmacy = pharmacyById.get(String(pharmacyId));

        const order = await tx.order.create({
          data: {
            patientId: userId,
            pharmacyId,
            status: "PENDING",
            inventoryDeducted: true,
            paymentStatus: isKhaltiPayment ? "INITIATED" : "NOT_REQUIRED",
            totalAmount: orderTotalAmount,
            deliveryAddress: normalizedDeliveryAddress,
            paymentMethod: normalizedPaymentMethod,
            contactNumber: finalContactNumber,
            ...(parsedLatitude !== null ? { latitude: parsedLatitude } : {}),
            ...(parsedLongitude !== null ? { longitude: parsedLongitude } : {}),
          },
        });

        await tx.orderItem.createMany({
          data: itemsForPharmacy.map((item) => {
            const inv = inventoryByCompositeKey.get(`${pharmacyId}::${item.medicineId}`);
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

        // Deduct inventory immediately per split order so checkout reserves stock atomically.
        for (const item of itemsForPharmacy) {
          const inv = inventoryByCompositeKey.get(`${pharmacyId}::${item.medicineId}`);
          const updated = await tx.inventory.updateMany({
            where: {
              id: item.medicineId,
              pharmacyId,
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });

          if (updated.count !== 1) {
            throw buildOutOfStockError({
              medicineName: inv?.name || item.medicineName || item.genericName || "Medicine",
              pharmacyName: getPharmacyName(pharmacyId),
            });
          }
        }

        // Persist per-pharmacy order notification (with sound metadata) in the same transaction.
        if (pharmacy?.userId) {
          await tx.notification.create({
            data: {
              userId: pharmacy.userId,
              title: "New Order Received",
              message: `A new patient order has been placed at ${pharmacy.pharmacyName || "your pharmacy"}.`,
              type: "NEW_ORDER",
              metadata: {
                orderId: order.id,
                pharmacyId,
                link: "/pharmacy/orders",
                sound: "new-order-alert",
              },
              targetRole: "PHARMACY",
              priority: "high",
            },
          });
        }

        orderIds.push(order.id);
      }

      // Clear cart only after all split orders are created successfully.
      if (patientCart?.id) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: patientCart.id,
          },
        });
      }

      return tx.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true },
      });
    });

    const orderedCheckoutOrders = createdOrders.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const primaryOrder = orderedCheckoutOrders[0] || null;
    const checkoutGroupId = `checkout_${Date.now()}_${String(userId).slice(-6)}`;

    let checkoutResponse = {
      order: primaryOrder,
      orders: orderedCheckoutOrders,
      payment: null,
      summary: {
        orderCount: orderedCheckoutOrders.length,
        totalAmount: orderedCheckoutOrders.reduce(
          (sum, order) => sum + Number(order.totalAmount || 0),
          0
        ),
      },
    };

    if (normalizedPaymentMethod === "KHALTI") {
      try {
        if (!primaryOrder) {
          throw createHttpError(500, "No orders were created for Khalti checkout");
        }

        const { websiteUrl, returnUrl } = resolveKhaltiUrls();
        const { secretKey } = await getPharmacyKhaltiSecret(primaryOrder.pharmacyId);
        const totalAmount = checkoutResponse.summary.totalAmount;
        const amountInPaisa = Math.round(Number(totalAmount || 0) * 100);
        const purchaseOrderId = `order-${primaryOrder.id}`;

        const khaltiInitPayload = {
          return_url: returnUrl,
          website_url: websiteUrl,
          amount: amountInPaisa,
          purchase_order_id: purchaseOrderId,
          purchase_order_name: `PharmEasy Checkout ${checkoutGroupId}`,
          customer_info: {
            name: String(req.user?.name || "PharmEasy Customer").slice(0, 100),
            email: String(req.user?.email || "customer@pharmeasy.app").slice(0, 120),
            phone: finalContactNumber,
          },
          amount_breakdown: [
            {
              label: "Medicine Total",
              amount: Math.round((Number(totalAmount || 0) - STANDARD_DELIVERY_FEE) * 100),
            },
            {
              label: "Delivery Fee",
              amount: STANDARD_DELIVERY_FEE * 100,
            },
          ],
        };

        const khaltiResponse = await callKhaltiInitiate(khaltiInitPayload, secretKey);
        const allOrderIds = orderedCheckoutOrders.map((order) => order.id);
        const secondaryOrderIds = allOrderIds.filter((id) => id !== primaryOrder.id);

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: primaryOrder.id },
            data: {
              khaltiPidx: khaltiResponse.pidx,
              paymentStatus: "PENDING",
              notes: JSON.stringify({
                checkoutGroupId,
                paymentScope: "MULTI_VENDOR",
                groupOrderIds: allOrderIds,
                primaryOrderId: primaryOrder.id,
                purchaseOrderId,
                paymentExpiresAt: khaltiResponse.expires_at,
              }),
            },
          });

          if (secondaryOrderIds.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: secondaryOrderIds } },
              data: {
                paymentStatus: "PENDING",
                notes: JSON.stringify({
                  checkoutGroupId,
                  paymentScope: "MULTI_VENDOR",
                  primaryOrderId: primaryOrder.id,
                  linkedKhaltiPidx: khaltiResponse.pidx,
                  purchaseOrderId,
                }),
              },
            });
          }
        });

        const refreshedOrders = await prisma.order.findMany({
          where: { id: { in: allOrderIds } },
          include: { items: true },
        });

        const refreshedById = new Map(refreshedOrders.map((order) => [order.id, order]));
        const orderedRefreshedOrders = allOrderIds
          .map((orderId) => refreshedById.get(orderId))
          .filter(Boolean);

        checkoutResponse = {
          ...checkoutResponse,
          order: orderedRefreshedOrders[0] || null,
          orders: orderedRefreshedOrders,
          payment: {
            provider: "KHALTI",
            checkoutGroupId,
            orderIds: allOrderIds,
            pidx: khaltiResponse.pidx,
            paymentUrl: khaltiResponse.payment_url,
            expiresAt: khaltiResponse.expires_at,
            expiresIn: khaltiResponse.expires_in,
            status: "PENDING",
          },
        };
      } catch (khaltiError) {
        await prisma.order.updateMany({
          where: { id: { in: orderedCheckoutOrders.map((order) => order.id) } },
          data: {
            paymentStatus: "FAILED",
            notes: JSON.stringify({
              checkoutGroupId,
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
      const io = req.app.get("io");
      if (io) {
        const pharmacies = await prisma.pharmacy.findMany({
          where: {
            id: { in: [...new Set(orderedCheckoutOrders.map((order) => order.pharmacyId))] },
          },
          select: {
            id: true,
            userId: true,
          },
        });

        const pharmacyById = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));

        for (const order of orderedCheckoutOrders) {
          const pharmacy = pharmacyById.get(order.pharmacyId);
          if (!pharmacy?.userId) continue;

          io.emit("NEW_ORDER", {
            orderId: order.id,
            checkoutGroupId,
            recipientId: pharmacy.userId,
            pharmacyId: order.pharmacyId,
            patientId: userId,
            sound: "new-order-alert",
          });
        }
      }
    } catch (notificationError) {
      console.error("[CHECKOUT NOTIFICATION ERROR]", notificationError.message, notificationError.stack);
      logger.error("ORDER", "Checkout succeeded but notification dispatch failed", notificationError);
    }

    logger.info("ORDER", "Checkout completed", {
      userId,
      checkoutGroupId,
      orderIds: orderedCheckoutOrders.map((order) => order.id),
      pharmacyCount: [...new Set(orderedCheckoutOrders.map((order) => order.pharmacyId))].length,
      itemCount: orderedCheckoutOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0),
      duration: `${Date.now() - startTime}ms`,
    });

    return res.status(201).json({
      success: true,
      data: checkoutResponse,
      message:
        normalizedPaymentMethod === "KHALTI"
          ? "Orders created. Complete payment in Khalti to confirm."
          : "Orders placed successfully",
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
  // Resolve authenticated user and payment identifier.
  const userId = req.user?.userId || req.user?.id;
  const pidx = String(req.body?.pidx || req.query?.pidx || "").trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!pidx) {
    return res.status(400).json({ success: false, message: "pidx is required" });
  }

  // Verify payment with user scoping to prevent cross-account access.
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
  // Convert purchase_order_id format (order-<id>) into order ID.
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

  const primaryOrder = await prisma.order.findFirst({
    where: whereClause,
    select: {
      id: true,
      patientId: true,
      pharmacyId: true,
      notes: true,
    },
  });

  if (!primaryOrder) {
    throw createHttpError(404, "Order not found for callback verification");
  }

  const primaryNotes = parseOrderNotes(primaryOrder.notes);
  const requestedGroupOrderIds = Array.isArray(primaryNotes.groupOrderIds)
    ? primaryNotes.groupOrderIds.filter(Boolean).map(String)
    : [];

  const orderIds = requestedGroupOrderIds.length > 0
    ? requestedGroupOrderIds
    : [String(primaryOrder.id)];

  const groupedOrders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      ...(userId ? { patientId: userId } : {}),
    },
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

  if (groupedOrders.length === 0) {
    throw createHttpError(404, "No orders found for this payment session");
  }

  const orderById = new Map(groupedOrders.map((order) => [String(order.id), order]));
  const orderedGroup = orderIds
    .map((id) => orderById.get(String(id)))
    .filter(Boolean);

  const verificationSourceOrder = orderedGroup[0] || groupedOrders[0];
  const { secretKey } = await getPharmacyKhaltiSecret(verificationSourceOrder.pharmacyId);
  const lookup = await callKhaltiLookup(pidx, secretKey);
  const normalizedKhaltiStatus = normalizeKhaltiStatus(lookup?.status);

  const expectedTotalPaisa = Math.round(
    orderedGroup.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) * 100
  );
  const khaltiTotalPaisa = Number(lookup?.total_amount || 0);

  if (!Number.isFinite(khaltiTotalPaisa) || khaltiTotalPaisa <= 0) {
    throw createHttpError(400, "Invalid lookup amount returned by Khalti");
  }

  if (khaltiTotalPaisa !== expectedTotalPaisa) {
    await prisma.order.updateMany({
      where: { id: { in: orderedGroup.map((order) => order.id) } },
      data: { paymentStatus: "HOLD" },
    });

    throw createHttpError(409, "Payment amount mismatch detected. Orders moved to hold state.", {
      data: {
        expectedTotalPaisa,
        khaltiTotalPaisa,
        pidx,
        orderIds: orderedGroup.map((order) => order.id),
      },
    });
  }

  const internalPaymentStatus = mapKhaltiStatusToPaymentStatus(normalizedKhaltiStatus);
  const isSuccess = normalizedKhaltiStatus === KHALTI_SUCCESS_STATUS;
  const paymentJustCompletedOrderIds = [];

  const updatedOrders = await prisma.$transaction(async (tx) => {
    const nextOrders = [];
    const allInventoryIdsForCartCleanup = new Set();

    for (const baseOrder of orderedGroup) {
      const currentOrder = await tx.order.findUnique({
        where: { id: baseOrder.id },
        select: {
          id: true,
          status: true,
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

      if (isSuccess && currentOrder.paymentStatus !== "COMPLETED") {
        paymentJustCompletedOrderIds.push(currentOrder.id);
      }

      const nextOrder = await tx.order.update({
        where: { id: currentOrder.id },
        data: {
          ...(isSuccess && currentOrder.status === "PENDING" ? { status: "ACCEPTED" } : {}),
          paymentStatus: internalPaymentStatus,
          paymentTransactionId: lookup?.transaction_id || lookup?.tidx || null,
          paymentVerifiedAt: isSuccess ? new Date() : null,
          ...(isSuccess && !currentOrder.inventoryDeducted ? { inventoryDeducted: true } : {}),
        },
        include: { items: true },
      });

      currentOrder.items.forEach((item) => allInventoryIdsForCartCleanup.add(item.inventoryId));
      nextOrders.push(nextOrder);
    }

    if (isSuccess) {
      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: verificationSourceOrder.patientId,
          },
          medicineId: {
            in: [...allInventoryIdsForCartCleanup],
          },
        },
      });
    }

    return nextOrders;
  });

  if (paymentJustCompletedOrderIds.length > 0) {
    try {
      const completedOrders = updatedOrders.filter((order) =>
        paymentJustCompletedOrderIds.includes(order.id)
      );

      const pharmacies = await prisma.pharmacy.findMany({
        where: {
          id: { in: [...new Set(completedOrders.map((order) => order.pharmacyId))] },
        },
        select: {
          id: true,
          userId: true,
          pharmacyName: true,
        },
      });

      const pharmacyById = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));
      const io = app?.get?.("io");

      for (const completedOrder of completedOrders) {
        const pharmacy = pharmacyById.get(completedOrder.pharmacyId);
        if (!pharmacy?.userId) continue;

        await notificationService.createNotification(
          pharmacy.userId,
          "New Paid Order Received",
          `A Khalti-paid order is ready for processing at ${pharmacy.pharmacyName || "your pharmacy"}.`,
          "NEW_ORDER",
          {
            orderId: completedOrder.id,
            link: "/pharmacy/orders",
            sound: "standard",
          },
          "PHARMACY",
          "high"
        );

        if (io) {
          io.emit("NEW_ORDER", {
            orderId: completedOrder.id,
            recipientId: pharmacy.userId,
            pharmacyId: completedOrder.pharmacyId,
            patientId: completedOrder.patientId,
          });
        }
      }
    } catch (notificationError) {
      logger.error("ORDER", "Khalti payment verified but pharmacy notification failed", {
        orderIds: paymentJustCompletedOrderIds,
        error: notificationError?.message,
      });
    }
  }

  const statusCode = isSuccess ? 200 : 202;
  const primaryUpdatedOrder = updatedOrders.find((order) => order.id === primaryOrder.id) || updatedOrders[0] || null;

  return {
    statusCode,
    payload: {
      success: isSuccess,
      data: {
        order: primaryUpdatedOrder,
        orders: updatedOrders,
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
  // Read callback payment identifiers from body or query.
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
  // Read authenticated pharmacy user and target order/status inputs.
  const userId = req.user?.userId;
  const orderId = String(req.params?.orderId || req.params?.id || "").trim();
  const requestedStatus = normalizeStatus(req.body?.status);
  const nextStatus = requestedStatus === "DECLINED" ? "CANCELLED" : requestedStatus;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order id is required" });
  }

  // Validate requested next status.
  if (!nextStatus || !ORDER_STATUS_ENUM_VALUES.includes(nextStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid order status. Allowed values: ${[...ORDER_STATUS_ENUM_VALUES, "DECLINED"].join(", ")}`,
    });
  }

  try {
    // Resolve pharmacy by logged-in user account.
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!pharmacy?.id) {
      return res.status(404).json({ success: false, message: "Pharmacy not found" });
    }

    // Perform status update and inventory adjustments in one transaction.
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

      // Validate requested transition against transition map.
      if (!allowed.includes(nextStatus)) {
        throw createHttpError(
          400,
          `Cannot transition order from ${currentStatus} to ${nextStatus}`
        );
      }

      // Hold status changes until Khalti payment is completed.
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

      // Deduct inventory only for active fulfillment statuses.
      if (shouldAttemptInventoryDeduction(nextStatus) && !order.inventoryDeducted) {
        await deductOrderInventory(tx, order, pharmacy.id);
      }

      // Declined/cancelled orders must not keep reserved stock deducted.
      if (nextStatus === "CANCELLED" && order.inventoryDeducted) {
        await revertOrderInventory(tx, order, pharmacy.id);
      }

      const markInventoryDeducted =
        shouldAttemptInventoryDeduction(nextStatus) && !order.inventoryDeducted;
      const markInventoryReverted = nextStatus === "CANCELLED" && order.inventoryDeducted;

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          ...(markInventoryDeducted ? { inventoryDeducted: true } : {}),
          ...(markInventoryReverted ? { inventoryDeducted: false } : {}),
        },
      });
    });

    // Notify patient after successful status transition.
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
  // Resolve current pharmacy and requested order ID.
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

    // Load order with patient and line-item details.
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

    // Build summary metrics for pharmacy detail screen.
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
