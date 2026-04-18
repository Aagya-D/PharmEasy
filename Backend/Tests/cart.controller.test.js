import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  cart: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  cartItem: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const cartController = await import("../src/modules/cart/cart.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("cart.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 404 when removeItem cannot find the cart item", async () => {
    prismaMock.cart.upsert.mockResolvedValue({ id: "cart-1" });
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 0 });

    const req = {
      user: { userId: "u-1" },
      params: { itemId: "missing-item" },
    };
    const res = createRes();

    await cartController.removeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Cart item not found" })
    );
  });

  it("returns the current cart for an authenticated user", async () => {
    prismaMock.cart.upsert.mockResolvedValue({ id: "cart-1", items: [] });

    const req = { user: { userId: "u-1" } };
    const res = createRes();

    await cartController.getCart(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Cart retrieved successfully",
      })
    );
  });

  it("rejects addToCart when required fields are missing", async () => {
    const req = {
      user: { userId: "u-1" },
      body: { medicineId: "med-1", pharmacyId: "ph-1" },
    };
    const res = createRes();

    await cartController.addToCart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "medicineId, pharmacyId, medicineName and price are required",
      })
    );
  });

  it("adds an item to the cart and refreshes the cart", async () => {
    prismaMock.cart.upsert.mockResolvedValue({ id: "cart-1" });
    prismaMock.cartItem.upsert.mockResolvedValue({ id: "item-1" });
    prismaMock.cart.findUnique.mockResolvedValue({ id: "cart-1", items: [{ id: "item-1" }] });

    const req = {
      user: { userId: "u-1" },
      body: {
        medicineId: "med-1",
        pharmacyId: "ph-1",
        medicineName: "Paracetamol",
        price: 100,
        quantity: 2,
      },
    };
    const res = createRes();

    await cartController.addToCart(req, res);

    expect(prismaMock.cartItem.upsert).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Item added to cart" })
    );
  });

  it("updates cart item quantity", async () => {
    prismaMock.cart.upsert.mockResolvedValue({ id: "cart-1" });
    prismaMock.cartItem.findFirst.mockResolvedValue({ id: "item-1" });
    prismaMock.cartItem.update.mockResolvedValue({ id: "item-1" });
    prismaMock.cart.findUnique.mockResolvedValue({ id: "cart-1", items: [] });

    const req = {
      user: { userId: "u-1" },
      params: { itemId: "item-1" },
      body: { quantity: 3, selected: false },
    };
    const res = createRes();

    await cartController.updateQuantity(req, res);

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({ quantity: 3, selected: false }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
