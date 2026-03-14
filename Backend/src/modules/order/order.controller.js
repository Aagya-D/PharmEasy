import { prisma } from "../../database/prisma.js";
import notificationService from "../notifications/notification.service.js";
import { isValidNepaliPhone } from "../../utils/validation.js";
import logger from "../../utils/logger.js";

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

      const order = await tx.order.create({
        data: {
          patientId: userId,
          pharmacyId,
          status: "PENDING",
          inventoryDeducted: true,
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

      if (!isDirectPurchase && cart) {
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

    try {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
        select: {
          userId: true,
          pharmacyName: true,
        },
      });

      if (pharmacy?.userId) {
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
      data: { order: createdOrder },
      message: "Order placed successfully",
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
