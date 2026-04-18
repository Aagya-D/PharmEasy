import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  sOSRequest: {
    findMany: jest.fn(),
  },
  pharmacy: {
    findMany: jest.fn(),
  },
  inventory: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  healthTip: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  announcement: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const logActivityMock = jest.fn();
const notificationServiceMock = {
  notifyAnnouncement: jest.fn(),
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/activityLogger.js", () => ({
  logActivity: logActivityMock,
}));

jest.unstable_mockModule("../src/modules/notifications/notification.service.js", () => ({
  default: notificationServiceMock,
}));

const adminExtendedController = await import("../src/modules/admin/admin-extended.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  user: { id: "admin-1" },
  app: { get: jest.fn() },
  ...overrides,
});

describe("admin-extended.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns SOS requests with map metadata", async () => {
    prismaMock.sOSRequest.findMany.mockResolvedValue([
      {
        id: "sos-1",
        latitude: 27.7,
        longitude: 85.3,
        medicineName: "Paracetamol",
        genericName: "Acetaminophen",
        quantity: 2,
        urgencyLevel: "HIGH",
        patientName: "Patient",
        contactNumber: "9800000000",
        address: "Kathmandu",
        additionalNotes: "Urgent",
        prescriptionRequired: false,
        prescriptionUrl: null,
        status: "pending",
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
        updatedAt: new Date("2026-04-15T00:00:00.000Z"),
      },
    ]);

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.getSOSRequests(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ id: "sos-1" })],
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("maps inventory insights and converts shortage values to numbers", async () => {
    prismaMock.inventory.groupBy.mockResolvedValue([
      { genericName: "Paracetamol", _count: { id: 2 }, _sum: { quantity: 5 } },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([
      {
        genericName: "Paracetamol",
        totalPharmacies: "3",
        outOfStockCount: "1",
        avgQuantity: "4.5",
      },
    ]);

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.getInventoryInsights(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          inventory: [
            { genericName: "Paracetamol", _count: { id: 2 }, _sum: { quantity: 5 } },
          ],
          shortages: [
            {
              genericName: "Paracetamol",
              totalPharmacies: 3,
              outOfStockCount: 1,
              avgQuantity: 4.5,
            },
          ],
        },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("sends a restock alert and logs the action", async () => {
    prismaMock.pharmacy.findMany.mockResolvedValue([
      {
        id: "ph-1",
        pharmacyName: "City Pharmacy",
        user: { id: "u-1" },
      },
    ]);
    logActivityMock.mockResolvedValue({ id: "log-1" });

    const req = createReq({
      body: { genericName: "Paracetamol", message: "Please restock" },
    });
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.sendRestockAlert(req, res, next);

    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "RESTOCK_ALERT_SENT",
        userId: "admin-1",
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
          message: "Restock alert sent to 1 pharmacies",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns verified pharmacy locations for the map", async () => {
    prismaMock.pharmacy.findMany.mockResolvedValue([
      {
        id: "ph-1",
        pharmacyName: "City Pharmacy",
        address: "Kathmandu",
        latitude: 27.7,
        longitude: 85.3,
        contactNumber: "9800000000",
        licenseNumber: "LIC-1",
        verificationStatus: "VERIFIED",
      },
    ]);

    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.getPharmacyLocations(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ id: "ph-1" })],
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("creates a health tip and logs the activity", async () => {
    prismaMock.healthTip.create.mockResolvedValue({ id: "tip-1", title: "Stay Hydrated" });
    logActivityMock.mockResolvedValue({ id: "log-1" });

    const req = createReq({
      body: {
        title: "Stay Hydrated",
        content: "Drink water",
        category: "wellness",
      },
    });
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.createHealthTip(req, res, next);

    expect(prismaMock.healthTip.create).toHaveBeenCalled();
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "HEALTH_TIP_CREATED", userId: "admin-1" })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ id: "tip-1" }) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("creates an announcement and notifies target users", async () => {
    prismaMock.announcement.create.mockResolvedValue({ id: "ann-1", title: "System Update" });
    logActivityMock.mockResolvedValue({ id: "log-2" });
    notificationServiceMock.notifyAnnouncement.mockResolvedValue(3);

    const req = createReq({
      body: {
        title: "System Update",
        message: "Maintenance tonight",
        type: "info",
        priority: "normal",
      },
    });
    const res = createRes();
    const next = jest.fn();

    await adminExtendedController.createAnnouncement(req, res, next);

    expect(prismaMock.announcement.create).toHaveBeenCalled();
    expect(notificationServiceMock.notifyAnnouncement).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ id: "ann-1" }) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});