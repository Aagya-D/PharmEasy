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

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/distance.js", () => ({
  calculateDistance: calculateDistanceMock,
}));

jest.unstable_mockModule("../src/utils/logger.js", () => ({
  default: loggerMock,
}));

const { default: notificationService } = await import("../src/modules/notifications/notification.service.js");

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

  it("creates a notification for a single user", async () => {
    prismaMock.notification.create.mockResolvedValue({ id: "n-1", userId: "u-1" });

    const result = await notificationService.createNotification(
      "u-1",
      "Title",
      "Message",
      "SYSTEM_MESSAGE"
    );

    expect(result).toEqual({ id: "n-1", userId: "u-1" });
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u-1", title: "Title", type: "SYSTEM_MESSAGE" }),
      })
    );
  });

  it("returns the query result when broadcasting to multiple users", async () => {
    prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

    const count = await notificationService.broadcastNotification(
      ["u-1", "u-2"],
      "Title",
      "Message",
      "SYSTEM_MESSAGE"
    );

    expect(count).toBe(2);
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u-1" }),
          expect.objectContaining({ userId: "u-2" }),
        ]),
      })
    );
  });

  it("returns zero when broadcasting with an empty user list", async () => {
    const count = await notificationService.broadcastNotification([], "t", "m", "SYSTEM_MESSAGE");

    expect(count).toBe(0);
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("builds strict admin unread count query when strictGlobal is enabled", async () => {
    prismaMock.notification.count.mockResolvedValue(5);

    const count = await notificationService.getUnreadCount("u-admin", "ADMIN", {
      strictGlobal: true,
    });

    expect(count).toBe(5);
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: {
        userId: "u-admin",
        isRead: false,
        targetRole: "ADMIN",
        type: { in: ["SYSTEM_MESSAGE", "SOS_ALERT", "CMS_ALERT"] },
      },
    });
  });

  it("returns notifications for the requested role and global audience", async () => {
    prismaMock.notification.findMany.mockResolvedValue([{ id: "n-1" }]);

    const notifications = await notificationService.getUserNotifications("u-1", 10, 0, "PHARMACY");

    expect(notifications).toEqual([{ id: "n-1" }]);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "u-1",
        OR: [{ targetRole: "PHARMACY" }, { targetRole: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 0,
    });
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

  it("marks one notification as read", async () => {
    prismaMock.notification.update.mockResolvedValue({ id: "n-1", isRead: true });

    const result = await notificationService.markAsRead("n-1");

    expect(result).toEqual({ id: "n-1", isRead: true });
    expect(prismaMock.notification.update).toHaveBeenCalledWith({
      where: { id: "n-1" },
      data: { isRead: true },
    });
  });

  it("marks all notifications as read for a user", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });

    const count = await notificationService.markAllAsRead("u-1");

    expect(count).toBe(4);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-1", isRead: false },
      data: { isRead: true },
    });
  });

  it("deletes a notification by id", async () => {
    prismaMock.notification.delete.mockResolvedValue({ id: "n-1" });

    const result = await notificationService.deleteNotification("n-1");

    expect(result).toEqual({ id: "n-1" });
    expect(prismaMock.notification.delete).toHaveBeenCalledWith({ where: { id: "n-1" } });
  });

  it("returns a high-priority flag when unread high priority notifications exist", async () => {
    prismaMock.notification.count.mockResolvedValue(1);

    const hasHigh = await notificationService.hasUnreadHighPriority("u-1", "PHARMACY");

    expect(hasHigh).toBe(true);
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

  it("creates a low stock notification when no duplicate exists", async () => {
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({ id: "n-low-1" });

    const result = await notificationService.notifyLowStock("u-1", {
      id: "inv-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
      quantity: 4,
    });

    expect(result).toEqual({ id: "n-low-1" });
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-1",
          type: "LOW_STOCK_WARNING",
          priority: "normal",
        }),
      })
    );
  });

});
