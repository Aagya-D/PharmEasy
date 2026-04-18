import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  chatRoom: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  chatMessage: {
    groupBy: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const chatController = await import("../src/modules/chat/chat.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("chat.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("requires message content when sending a chat message", async () => {
    const req = {
      user: { userId: "u-1" },
      params: { roomId: "room-1" },
      body: { content: "  " },
      app: { get: jest.fn() },
    };
    const res = createRes();
    const next = jest.fn();

    await chatController.sendMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Message content is required" })
    );
  });

  it("returns soft 404 when room is not initialized for SOS request", async () => {
    prismaMock.chatRoom.findFirst.mockResolvedValue(null);

    const req = {
      user: { userId: "u-1" },
      params: { sosRequestId: "sos-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await chatController.getRoomBySosRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        notInitialized: true,
        message: "Chat room not yet initialized",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks markMessagesAsRead for non-participants", async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({
      patientId: "patient-1",
      pharmacyId: "pharmacy-1",
    });

    const req = {
      user: { userId: "other-user" },
      params: { roomId: "room-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await chatController.markMessagesAsRead(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You are not authorized to access this chat" })
    );
  });

  it("rejects invalid chat room status filters", async () => {
    const req = {
      user: { userId: "u-1" },
      query: { status: "bad-filter" },
    };
    const res = createRes();
    const next = jest.fn();

    await chatController.getChatRooms(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("status must be one of") })
    );
  });

  it("returns patient chat rooms for the active filter", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ roleId: 3 });
    prismaMock.chatRoom.findMany.mockResolvedValue([
      {
        id: "room-1",
        sosRequestId: "sos-1",
        patientId: "u-1",
        pharmacyId: "ph-1",
        createdAt: new Date(),
        pharmacy: { id: "ph-1", name: "City Pharmacy", pharmacy: { pharmacyName: "City Pharmacy" } },
        patient: { id: "u-1", name: "Patient" },
        sosRequest: {
          id: "sos-1",
          medicineName: "Paracetamol",
          urgencyLevel: "HIGH",
          status: "pending",
          patientName: "Patient",
          contactNumber: "9800000000",
          createdAt: new Date(),
        },
        messages: [{ id: "msg-1", content: "Hi", senderId: "u-1", isRead: false, createdAt: new Date() }],
      },
    ]);
    prismaMock.chatMessage.groupBy.mockResolvedValue([{ roomId: "room-1", _count: { id: 2 } }]);

    const req = { user: { userId: "u-1" }, query: { status: "active" } };
    const res = createRes();
    const next = jest.fn();

    await chatController.getChatRooms(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ chatRooms: [expect.objectContaining({ id: "room-1" })] }),
      })
    );
  });

  it("returns chat messages for an authorized participant", async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({
      id: "room-1",
      patientId: "u-1",
      pharmacyId: "ph-1",
      sosRequest: { medicineName: "Paracetamol", urgencyLevel: "HIGH" },
    });
    prismaMock.chatMessage.findMany.mockResolvedValue([
      {
        id: "msg-1",
        content: "Need medicine",
        senderId: "u-1",
        sender: { id: "u-1", name: "Patient" },
        isRead: false,
        roomId: "room-1",
        createdAt: new Date(),
      },
    ]);

    const req = { user: { userId: "u-1" }, params: { roomId: "room-1" } };
    const res = createRes();
    const next = jest.fn();

    await chatController.getChatMessages(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ messages: [expect.objectContaining({ id: "msg-1" })] }),
      })
    );
  });

  it("returns unread count for a patient user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ roleId: 3 });
    prismaMock.chatRoom.findMany.mockResolvedValue([{ id: "room-1" }]);
    prismaMock.chatMessage.count.mockResolvedValue(4);

    const req = { user: { userId: "u-1" } };
    const res = createRes();
    const next = jest.fn();

    await chatController.getUnreadCount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { unreadCount: 4 } })
    );
  });

  it("persists sent messages and emits socket events", async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({
      id: "room-1",
      patientId: "u-1",
      pharmacyId: "ph-1",
    });
    prismaMock.chatMessage.create.mockResolvedValue({
      id: "msg-1",
      content: "Hello",
      senderId: "u-1",
      sender: { name: "Patient" },
      isRead: false,
      roomId: "room-1",
      createdAt: new Date(),
    });
    const emitMock = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: emitMock });
    const ioMock = { to: toMock, emit: jest.fn() };

    const req = {
      user: { userId: "u-1" },
      params: { roomId: "room-1" },
      body: { content: " Hello " },
      app: { get: jest.fn().mockReturnValue(ioMock) },
    };
    const res = createRes();
    const next = jest.fn();

    await chatController.sendMessage(req, res, next);

    expect(prismaMock.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ content: "Hello" }) })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(ioMock.emit).toHaveBeenCalledWith("NEW_MESSAGE", expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns the chat room id for a participant SOS request", async () => {
    prismaMock.chatRoom.findFirst.mockResolvedValue({
      id: "room-1",
      patientId: "u-1",
      pharmacyId: "ph-1",
    });

    const req = { user: { userId: "u-1" }, params: { sosRequestId: "sos-1" } };
    const res = createRes();
    const next = jest.fn();

    await chatController.getRoomBySosRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { roomId: "room-1" } })
    );
  });

  it("marks room messages as read for the participant", async () => {
    prismaMock.chatRoom.findUnique.mockResolvedValue({ patientId: "u-1", pharmacyId: "ph-1" });
    prismaMock.chatMessage.updateMany.mockResolvedValue({ count: 2 });

    const req = { user: { userId: "u-1" }, params: { roomId: "room-1" } };
    const res = createRes();
    const next = jest.fn();

    await chatController.markMessagesAsRead(req, res, next);

    expect(prismaMock.chatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ roomId: "room-1", senderId: { not: "u-1" } }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
