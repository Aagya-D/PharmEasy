import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findMany: jest.fn(),
  },
  pharmacy: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
};

const calculateDistanceMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
  info: jest.fn(),
};

jest.unstable_mockModule("../../database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../../utils/distance.js", () => ({
  calculateDistance: calculateDistanceMock,
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: loggerMock,
}));

const { default: notificationService } = await import("./notification.service.js");

describe("notification.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns active system admin user IDs", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "a-1" }, { id: "a-2" }]);

    const ids = await notificationService.getSystemAdminUserIds();

    expect(ids).toEqual(["a-1", "a-2"]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { roleId: 1, isActive: true },
      select: { id: true },
    });
  });

  it("returns zero when broadcasting with an empty user list", async () => {
    const count = await notificationService.broadcastNotification([], "t", "m", "SYSTEM_MESSAGE");

    expect(count).toBe(0);
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("builds role-aware unread count query for non-strict role filtering", async () => {
    prismaMock.notification.count.mockResolvedValue(3);

    const count = await notificationService.getUnreadCount("u-1", "PHARMACY");

    expect(count).toBe(3);
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: {
        userId: "u-1",
        OR: [
          { targetRole: "PHARMACY", isRead: false },
          { targetRole: null, isRead: false },
        ],
        AND: [{ userId: "u-1" }],
      },
    });
  });

  it("notifies all verified pharmacies when SOS has no coordinates", async () => {
    prismaMock.pharmacy.findMany.mockResolvedValue([{ userId: "u-1" }, { userId: "u-2" }]);
    prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

    const sent = await notificationService.notifyNearbyPharmacies({
      id: "sos-1",
      patientName: "Patient",
      medicineName: "Paracetamol",
      address: "Kathmandu",
      latitude: null,
      longitude: null,
    });

    expect(sent).toBe(2);
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u-1", type: "SOS_ALERT", targetRole: "PHARMACY" }),
          expect.objectContaining({ userId: "u-2", type: "SOS_ALERT", targetRole: "PHARMACY" }),
        ]),
      })
    );
  });

  it("deduplicates low stock notifications if an unread one already exists", async () => {
    const existing = { id: "n-1", type: "LOW_STOCK_WARNING" };
    prismaMock.notification.findFirst.mockResolvedValue(existing);

    const result = await notificationService.notifyLowStock("u-1", {
      id: "inv-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
      quantity: 4,
    });

    expect(result).toEqual(existing);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it("skips expiry alerts when medicine expiry is outside threshold", async () => {
    const farFutureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const result = await notificationService.notifyExpiringSoon("u-1", {
      id: "inv-1",
      name: "Amoxicillin",
      genericName: "Amoxicillin",
      expiryDate: farFutureDate,
    });

    expect(result).toBeNull();
  });
});
