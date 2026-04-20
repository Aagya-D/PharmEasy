import { prisma } from "../../database/prisma.js";

const cartItemSelect = {
  id: true,
  medicineId: true,
  pharmacyId: true,
  medicineName: true,
  genericName: true,
  price: true,
  quantity: true,
  selected: true,
  inStock: true,
  expiryDate: true,
  pharmacyName: true,
  pharmacyAddress: true,
  pharmacyContact: true,
  createdAt: true,
  updatedAt: true,
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "desc" },
    select: cartItemSelect,
  },
};

const getOrCreateCart = async (userId) => {
  // Every user gets one cart, and this creates it on demand.
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
};

const hydrateCartImages = async (cart) => {
  if (!cart?.items?.length) {
    return cart;
  }

  const medicineIds = [...new Set(cart.items
    .filter((item) => item.medicineId)
    .map((item) => item.medicineId))];

  if (!medicineIds.length) {
    return cart;
  }

  const inventoryItems = await prisma.inventory.findMany({
    where: {
      id: { in: medicineIds },
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });

  const imageMap = new Map(inventoryItems.map((item) => [item.id, item.imageUrl || null]));

  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      imageUrl: imageMap.get(item.medicineId) || null,
      medicine: {
        imageUrl: imageMap.get(item.medicineId) || null,
      },
    })),
  };
};

export const getCart = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    // Return the full cart so the frontend can render it in one request.
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    });

    const hydratedCart = await hydrateCartImages(cart);

    return res.status(200).json({
      success: true,
      data: { cart: hydratedCart },
      message: "Cart retrieved successfully",
    });
  } catch (error) {
    console.error("[CART] getCart error", error.message);
    return res.status(500).json({ success: false, message: "Failed to retrieve cart" });
  }
};

export const addToCart = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const {
    medicineId,
    pharmacyId,
    medicineName,
    genericName,
    price,
    quantity,
    inStock,
    expiryDate,
    pharmacyName,
    pharmacyAddress,
    pharmacyContact,
  } = req.body || {};

  if (!medicineId || !pharmacyId || !medicineName || price === undefined || price === null) {
    return res.status(400).json({
      success: false,
      message: "medicineId, pharmacyId, medicineName and price are required",
    });
  }

  const safeQuantity = Math.max(1, Number.parseInt(quantity || 1, 10) || 1);
  const safePrice = Number(price);

  if (!Number.isFinite(safePrice) || safePrice < 0) {
    return res.status(400).json({ success: false, message: "Invalid price" });
  }

  try {
    // Start from the current user's cart so items never leak across accounts.
    const cart = await getOrCreateCart(userId);

    await prisma.cartItem.upsert({
      where: {
        cartId_medicineId_pharmacyId: {
          cartId: cart.id,
          medicineId: String(medicineId),
          pharmacyId: String(pharmacyId),
        },
      },
      update: {
        quantity: { increment: safeQuantity },
        selected: true,
        price: safePrice,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        genericName: genericName || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        pharmacyName: pharmacyName || null,
        pharmacyAddress: pharmacyAddress || null,
        pharmacyContact: pharmacyContact || null,
      },
      create: {
        cartId: cart.id,
        medicineId: String(medicineId),
        pharmacyId: String(pharmacyId),
        medicineName: String(medicineName),
        genericName: genericName || null,
        price: safePrice,
        quantity: safeQuantity,
        selected: true,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        pharmacyName: pharmacyName || null,
        pharmacyAddress: pharmacyAddress || null,
        pharmacyContact: pharmacyContact || null,
      },
      select: { id: true },
    });

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    const hydratedCart = await hydrateCartImages(refreshed);

    return res.status(200).json({
      success: true,
      data: { cart: hydratedCart },
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("[CART] addToCart error", error.message);
    return res.status(500).json({ success: false, message: "Failed to add item to cart" });
  }
};

export const updateQuantity = async (req, res) => {
  const userId = req.user?.userId;
  const { itemId } = req.params;
  const { quantity, selected } = req.body || {};

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    // Reload the cart after the change so totals stay current in the UI.
    const cart = await getOrCreateCart(userId);

    const existing = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    const updateData = {};

    if (quantity !== undefined) {
      const safeQuantity = Number.parseInt(quantity, 10);
      if (!Number.isFinite(safeQuantity) || safeQuantity < 1) {
        return res.status(400).json({ success: false, message: "quantity must be at least 1" });
      }
      updateData.quantity = safeQuantity;
    }

    if (selected !== undefined) {
      updateData.selected = Boolean(selected);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: updateData,
      select: { id: true },
    });

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    const hydratedCart = await hydrateCartImages(refreshed);

    return res.status(200).json({
      success: true,
      data: { cart: hydratedCart },
      message: "Cart item updated",
    });
  } catch (error) {
    console.error("[CART] updateQuantity error", error.message);
    return res.status(500).json({ success: false, message: "Failed to update cart item" });
  }
};

export const removeItem = async (req, res) => {
  const userId = req.user?.userId;
  const { itemId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    // Remove only the item that belongs to this user's cart.
    const cart = await getOrCreateCart(userId);
    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    const hydratedCart = await hydrateCartImages(refreshed);

    return res.status(200).json({
      success: true,
      data: { cart: hydratedCart },
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("[CART] removeItem error", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove cart item" });
  }
};
