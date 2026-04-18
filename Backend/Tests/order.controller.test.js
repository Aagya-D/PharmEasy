import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  pharmacy: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const notificationServiceMock = {
  createNotification: jest.fn(),
};

const isValidNepaliPhoneMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
  info: jest.fn(),
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/modules/notifications/notification.service.js", () => ({
  default: notificationServiceMock,
}));

jest.unstable_mockModule("../src/utils/validation.js", () => ({
  isValidNepaliPhone: isValidNepaliPhoneMock,
}));

jest.unstable_mockModule("../src/utils/logger.js", () => ({
  default: loggerMock,
}));

jest.unstable_mockModule("../src/utils/encryption.js", () => ({
  decryptText: jest.fn((value) => value),
}));

jest.unstable_mockModule("../src/config/environment.js", () => ({
  default: {
    frontend: { url: "http://localhost:5173" },
    isProduction: () => false,
  },
}));

const orderController = await import("../src/modules/order/order.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("order.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    isValidNepaliPhoneMock.mockReturnValue(true);
    notificationServiceMock.createNotification.mockResolvedValue({ id: "notif-1" });
  });

  it("rejects invalid status values in updateOrderStatus", async () => {
    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
      body: { status: "shipped" },
    };
    const res = createRes();

    await orderController.updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Invalid order status"),
      })
    );
  });

  it("returns 404 when pharmacy is not found during updateOrderStatus", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
      body: { status: "ACCEPTED" },
      app: { get: jest.fn() },
    };
    const res = createRes();

    await orderController.updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Pharmacy not found" })
    );
  });

  it("updates an order status and notifies the patient", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: "ord-1",
            status: "PENDING",
            paymentMethod: "CASH_ON_DELIVERY",
            paymentStatus: "NOT_REQUIRED",
            pharmacyId: "ph-1",
            patientId: "p-1",
            inventoryDeducted: false,
            items: [
              { inventoryId: "inv-1", medicineName: "Paracetamol", quantity: 2 },
            ],
          }),
          update: jest.fn().mockResolvedValue({
            id: "ord-1",
            patientId: "p-1",
            status: "ACCEPTED",
          }),
        },
        inventory: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      })
    );

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
      body: { status: "ACCEPTED" },
      app: { get: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };
    const res = createRes();

    await orderController.updateOrderStatus(req, res);

    expect(notificationServiceMock.createNotification).toHaveBeenCalledWith(
      "p-1",
      "Order Status Updated",
      expect.stringContaining("accepted"),
      "NEW_ORDER",
      expect.objectContaining({ orderId: "ord-1", status: "ACCEPTED" }),
      "PATIENT",
      "normal"
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects invalid order state transitions", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: "ord-1",
            status: "COMPLETED",
            paymentMethod: "CASH_ON_DELIVERY",
            paymentStatus: "NOT_REQUIRED",
            pharmacyId: "ph-1",
            patientId: "p-1",
            inventoryDeducted: true,
            items: [],
          }),
        },
      })
    );

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
      body: { status: "ACCEPTED" },
      app: { get: jest.fn() },
    };
    const res = createRes();

    await orderController.updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Cannot transition order"),
      })
    );
  });

  it("blocks non-complete Khalti orders from progressing", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: "ord-1",
            status: "PENDING",
            paymentMethod: "KHALTI",
            paymentStatus: "PENDING",
            pharmacyId: "ph-1",
            patientId: "p-1",
            inventoryDeducted: false,
            items: [],
          }),
        },
      })
    );

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
      body: { status: "ACCEPTED" },
      app: { get: jest.fn() },
    };
    const res = createRes();

    await orderController.updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Khalti payment is not completed yet. This order cannot be processed.",
      })
    );
  });

  it("returns pharmacy order details with summary and process data", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1", pharmacyName: "City Pharmacy" });
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord-1",
      pharmacyId: "ph-1",
      status: "PENDING",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "NOT_REQUIRED",
      totalAmount: 340,
      patient: {
        id: "p-1",
        name: "Patient",
        email: "patient@example.com",
        phone: "9800000000",
      },
      items: [
        { id: "item-1", medicineName: "Paracetamol", genericName: "Acetaminophen", quantity: 2, unitPrice: 100, lineTotal: 200 },
        { id: "item-2", medicineName: "Ibuprofen", genericName: "Ibuprofen", quantity: 1, unitPrice: 100, lineTotal: 100 },
      ],
    });

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
    };
    const res = createRes();

    await orderController.getPharmacyOrderDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({ medicineCount: 2, itemCount: 3, subtotal: 300, deliveryFee: 40, total: 340 }),
          process: expect.objectContaining({ currentStatus: "PENDING" }),
        }),
      })
    );
  });

  it("limits next allowed statuses until Khalti payment is completed", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1", pharmacyName: "City Pharmacy" });
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord-1",
      pharmacyId: "ph-1",
      status: "PENDING",
      paymentMethod: "KHALTI",
      paymentStatus: "PENDING",
      totalAmount: 340,
      patient: { id: "p-1", name: "Patient", email: "patient@example.com", phone: "9800000000" },
      items: [],
    });

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
    };
    const res = createRes();

    await orderController.getPharmacyOrderDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          process: expect.objectContaining({ nextAllowedStatuses: ["CANCELLED"] }),
        }),
      })
    );
  });

  it("returns 404 when the requested order belongs to another pharmacy", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1", pharmacyName: "City Pharmacy" });
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord-1",
      pharmacyId: "ph-other",
      status: "PENDING",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "NOT_REQUIRED",
      totalAmount: 100,
      patient: { id: "p-1", name: "Patient", email: "patient@example.com", phone: "9800000000" },
      items: [],
    });

    const req = {
      user: { userId: "ph-user-1" },
      params: { orderId: "ord-1" },
    };
    const res = createRes();

    await orderController.getPharmacyOrderDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Order not found" })
    );
  });
});
