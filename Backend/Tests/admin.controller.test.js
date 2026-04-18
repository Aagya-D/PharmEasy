import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  pharmacy: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  sOSRequest: {
    findMany: jest.fn(),
  },
  inventory: {
    findMany: jest.fn(),
  },
  inventoryItem: {
    findMany: jest.fn(),
    fields: {
      reorderLevel: 10,
    },
  },
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
  log: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const compareMock = jest.fn();
const hashMock = jest.fn();
const createLogMock = jest.fn();
const getActivityLogsMock = jest.fn();
const notificationServiceMock = {
  notifyAnnouncement: jest.fn(),
};

const LOG_ACTIONS = {
  PHARMACY_APPROVED: "PHARMACY_APPROVED",
  PHARMACY_REJECTED: "PHARMACY_REJECTED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  CONTENT_CREATED: "CONTENT_CREATED",
  CONTENT_UPDATED: "CONTENT_UPDATED",
  CONTENT_DELETED: "CONTENT_DELETED",
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: compareMock,
    hash: hashMock,
  },
}));

jest.unstable_mockModule("../src/utils/activityLogger.js", () => ({
  createLog: createLogMock,
  getLogs: getActivityLogsMock,
  LOG_ACTIONS,
}));

jest.unstable_mockModule("../src/modules/notifications/notification.service.js", () => ({
  default: notificationServiceMock,
}));

const adminController = await import("../src/controllers/admin.controller.js");

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
  user: { userId: "admin-1" },
  app: { get: jest.fn() },
  ...overrides,
});

describe("admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("approves a pharmacy and writes an audit log", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      userId: "u-1",
      user: { roleId: 2 },
    });
    prismaMock.$transaction.mockResolvedValue([
      {
        id: "ph-1",
        pharmacyName: "City Pharmacy",
        licenseNumber: "LIC-1001",
        userId: "u-1",
        user: { name: "Owner" },
      },
      { id: "u-1" },
    ]);

    const req = createReq({ params: { id: "ph-1" } });
    const res = createRes();
    const next = jest.fn();

    await adminController.approvePharmacy(req, res, next);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(createLogMock).toHaveBeenCalledWith(
      "admin-1",
      LOG_ACTIONS.PHARMACY_APPROVED,
      expect.stringContaining("City Pharmacy"),
      "PHARMACY",
      expect.objectContaining({ pharmacyId: "ph-1" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Pharmacy approved successfully",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects approving your own pharmacy", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      userId: "admin-1",
      user: { roleId: 2 },
    });

    const req = createReq({ params: { id: "ph-1" } });
    const res = createRes();
    const next = jest.fn();

    await adminController.approvePharmacy(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Cannot approve your own pharmacy" }));
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a pharmacy only when a reason is provided", async () => {
    const req = createReq({ params: { id: "ph-1" }, body: { reason: "   " } });
    const res = createRes();
    const next = jest.fn();

    await adminController.rejectPharmacy(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Rejection reason is required" }));
  });

  it("updates the admin profile and checks email uniqueness", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin Updated",
      phone: "9800000000",
      roleId: 1,
      role: { name: "SYSTEM_ADMIN", displayName: "System Admin" },
    });

    const req = createReq({
      body: {
        name: "Admin Updated",
        email: "Admin@Example.com",
        phone: "9800000000",
      },
    });
    const res = createRes();
    const next = jest.fn();

    await adminController.updateProfile(req, res, next);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-1" },
        data: {
          name: "Admin Updated",
          email: "admin@example.com",
          phone: "9800000000",
        },
      })
    );
    expect(createLogMock).toHaveBeenCalledWith(
      "admin-1",
      LOG_ACTIONS.PROFILE_UPDATED,
      expect.stringContaining("updated their profile"),
      "SYSTEM",
      expect.objectContaining({ updatedFields: ["name", "email", "phone"] })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects password changes when the current password is wrong", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      password: "stored-hash",
      name: "Admin",
    });
    compareMock.mockResolvedValueOnce(false);

    const req = createReq({
      body: {
        currentPassword: "old-pass",
        newPassword: "new-password-123",
      },
    });
    const res = createRes();
    const next = jest.fn();

    await adminController.changePassword(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "The current password you entered is incorrect." })
    );
    expect(hashMock).not.toHaveBeenCalled();
  });

  it("sends a restock alert to affected pharmacies", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      {
        quantity: 5,
        pharmacy: {
          id: "ph-1",
          pharmacyName: "City Pharmacy",
          contactPhone: "9800000000",
          contactEmail: "city@example.com",
        },
      },
    ]);
    createLogMock.mockResolvedValue({ id: "log-1" });

    const req = createReq({
      body: { genericName: "Paracetamol", message: "Please restock" },
    });
    const res = createRes();
    const next = jest.fn();

    await adminController.sendRestockAlert(req, res, next);

    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalled();
    expect(createLogMock).toHaveBeenCalledWith(
      "admin-1",
      "INVENTORY_ALERT_SENT",
      "INVENTORY",
      null,
      expect.stringContaining("Paracetamol")
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Restock alert sent successfully",
        data: expect.objectContaining({ pharmaciesNotified: 1 }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
