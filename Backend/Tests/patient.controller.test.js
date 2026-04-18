import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
  },
  sOSRequest: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  pharmacy: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  favoriteMedicine: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
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

const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
};

const createLogMock = jest.fn();

const notificationServiceMock = {
  notifyGlobalSosAlert: jest.fn(),
  notifyNearbyPharmacies: jest.fn(),
  broadcastNotification: jest.fn(),
};

const isValidNepaliPhoneMock = jest.fn();

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/logger.js", () => ({
  default: loggerMock,
}));

jest.unstable_mockModule("../src/utils/activityLogger.js", () => ({
  createLog: createLogMock,
  LOG_ACTIONS: { PATIENT_UPDATED: "PATIENT_UPDATED" },
}));

jest.unstable_mockModule("../src/modules/notifications/notification.service.js", () => ({
  default: notificationServiceMock,
}));

jest.unstable_mockModule("../src/utils/validation.js", () => ({
  isValidNepaliPhone: isValidNepaliPhoneMock,
}));

const patientController = await import("../src/modules/patient/patient.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("patient.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    isValidNepaliPhoneMock.mockReturnValue(true);
  });

  it("rejects SOS submission when required fields are missing", async () => {
    const req = {
      user: { userId: "p-1" },
      body: { medicineName: "Paracetamol" },
      app: { get: jest.fn() },
    };
    const res = createRes();

    await patientController.submitSOSRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Missing required fields: medicineName, patientName, contactNumber, address",
      })
    );
  });

  it("rejects SOS submission when GPS coordinates are invalid", async () => {
    const req = {
      user: { userId: "p-1" },
      body: {
        medicineName: "Paracetamol",
        patientName: "Patient",
        contactNumber: "9800000000",
        address: "Kathmandu",
        latitude: "0",
        longitude: "85.3",
      },
      app: { get: jest.fn() },
    };
    const res = createRes();

    await patientController.submitSOSRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Valid GPS coordinates are required for SOS requests.",
      })
    );
  });

  it("upserts favorite medicine successfully", async () => {
    prismaMock.favoriteMedicine.upsert.mockResolvedValue({
      id: "fav-1",
      userId: "p-1",
      medicineName: "Paracetamol",
    });

    const req = {
      user: { userId: "p-1" },
      body: {
        medicineName: "Paracetamol",
        genericName: "Acetaminophen",
        lastPrice: "100",
      },
    };
    const res = createRes();

    await patientController.addFavorite(req, res);

    expect(prismaMock.favoriteMedicine.upsert).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Medicine added to favorites",
      })
    );
  });

  it("returns dashboard data with order stats", async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: "order-1" },
      { id: "order-2" },
    ]);
    prismaMock.orderItem.findMany.mockResolvedValue([
      { medicineName: "Paracetamol", genericName: "Acetaminophen" },
      { medicineName: "Paracetamol", genericName: "Acetaminophen" },
      { medicineName: "Ibuprofen", genericName: "Ibuprofen" },
    ]);

    const req = { user: { userId: "p-1" } };
    const res = createRes();

    await patientController.getDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stats: expect.objectContaining({ totalOrders: 2, purchasedMedicines: 2 }),
        }),
      })
    );
  });

  it("returns the patient profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Patient",
      email: "patient@example.com",
      phone: "9800000000",
      createdAt: new Date(),
    });

    const req = { user: { userId: "p-1" } };
    const res = createRes();

    await patientController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ patient: expect.objectContaining({ id: "p-1" }) }),
      })
    );
  });

  it("rejects invalid phone numbers in profile updates", async () => {
    isValidNepaliPhoneMock.mockReturnValueOnce(false);

    const req = {
      user: { userId: "p-1" },
      body: { phone: "123" },
    };
    const res = createRes();

    await patientController.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
      })
    );
  });

  it("updates the patient profile and records the change", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "p-1",
      name: "New Name",
      email: "patient@example.com",
      phone: "9800000000",
    });

    const req = {
      user: { userId: "p-1" },
      body: { name: "New Name", phone: "9800000000" },
    };
    const res = createRes();

    await patientController.updateProfile(req, res);

    expect(createLogMock).toHaveBeenCalledWith(
      "p-1",
      "PATIENT_UPDATED",
      expect.stringContaining("New Name"),
      "PATIENT",
      expect.objectContaining({ name: "New Name", phone: "9800000000" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns orders filtered by status", async () => {
    prismaMock.order.findMany.mockResolvedValue([{ id: "order-1" }]);

    const req = {
      user: { userId: "p-1" },
      query: { status: "pending", limit: "5" },
    };
    const res = createRes();

    await patientController.getOrders(req, res);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "p-1", status: "PENDING" },
        take: 5,
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("groups purchased medicines in the summary list", async () => {
    prismaMock.orderItem.findMany.mockResolvedValue([
      {
        medicineName: "Paracetamol",
        genericName: "Acetaminophen",
        inventoryId: "inv-1",
        inventory: { imageUrl: "img-1" },
        quantity: 1,
        lineTotal: 100,
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
        order: { id: "order-1", createdAt: new Date("2026-04-15T00:00:00.000Z"), pharmacy: { pharmacyName: "City Pharmacy" } },
      },
      {
        medicineName: "Paracetamol",
        genericName: "Acetaminophen",
        inventoryId: "inv-1",
        inventory: { imageUrl: "img-1" },
        quantity: 2,
        lineTotal: 200,
        createdAt: new Date("2026-04-16T00:00:00.000Z"),
        order: { id: "order-2", createdAt: new Date("2026-04-16T00:00:00.000Z"), pharmacy: { pharmacyName: "City Pharmacy" } },
      },
    ]);

    const req = { user: { userId: "p-1" } };
    const res = createRes();

    await patientController.getMedications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ medications: expect.arrayContaining([
          expect.objectContaining({ purchaseCount: 2, totalQuantity: 3, totalSpent: 300 }),
        ]) }),
      })
    );
  });

  it("creates an SOS request and notifies pharmacies", async () => {
    prismaMock.sOSRequest.create.mockResolvedValue({
      id: "sos-1",
      medicineName: "Paracetamol",
      address: "Kathmandu, Bagmati",
      createdAt: new Date(),
    });
    notificationServiceMock.notifyGlobalSosAlert.mockResolvedValue(undefined);
    notificationServiceMock.notifyNearbyPharmacies.mockResolvedValue(2);

    const req = {
      user: { userId: "p-1" },
      body: {
        medicineName: "Paracetamol",
        patientName: "Patient",
        contactNumber: "9800000000",
        address: "Kathmandu, Bagmati",
        latitude: "27.7",
        longitude: "85.3",
      },
      app: { get: jest.fn().mockReturnValue(null) },
    };
    const res = createRes();

    await patientController.submitSOSRequest(req, res);

    expect(prismaMock.sOSRequest.create).toHaveBeenCalled();
    expect(notificationServiceMock.notifyGlobalSosAlert).toHaveBeenCalled();
    expect(notificationServiceMock.notifyNearbyPharmacies).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns SOS history for the last 7 days", async () => {
    prismaMock.sOSRequest.findMany.mockResolvedValue([]);

    const req = { user: { userId: "p-1" }, query: { filter: "7days" } };
    const res = createRes();

    await patientController.getSOSHistory(req, res);

    expect(prismaMock.sOSRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: "p-1", createdAt: expect.any(Object) }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when SOS details are missing", async () => {
    prismaMock.sOSRequest.findFirst.mockResolvedValue(null);

    const req = { user: { userId: "p-1" }, params: { sosId: "sos-missing" } };
    const res = createRes();

    await patientController.getSOSDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "SOS request not found" })
    );
  });
});
