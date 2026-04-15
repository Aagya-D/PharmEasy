// Chat controller for room list, room messages, unread counts, and message actions.

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

// Return chat rooms for authenticated patient or pharmacy user.
export const getChatRooms = async (req, res, next) => {
  try {
    // Read authenticated user ID and optional status filter.
    const userId = req.user?.userId;
    const statusFilter = String(req.query?.status || "").trim().toLowerCase();

    const ACTIVE_STATUSES = ["pending", "accepted", "PENDING", "ACCEPTED"];
    const COMPLETED_STATUSES = [
      "completed",
      "expired",
      "rejected",
      "declined",
      "COMPLETED",
      "EXPIRED",
      "REJECTED",
      "DECLINED",
    ];

    // Allowed sidebar status filter values.
    const allowedFilters = new Set(["", "all", "active", "completed", "archive"]);
    if (!allowedFilters.has(statusFilter)) {
      return next(new AppError("status must be one of: active, completed, archive, all", 400));
    }

    // Require authenticated user.
    if (!userId) return next(new AppError("Authentication required", 401));

    // Resolve user role to patient/pharmacy room scope.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) return next(new AppError("User not found", 404));

    const isPatient  = user.roleId === 3;
    const isPharmacy = user.roleId === 2;

    // Non-patient/non-pharmacy roles get empty room list.
    if (!isPatient && !isPharmacy) {
      return res.status(200).json({ success: true, data: { chatRooms: [] } });
    }

    // Build where clause by role scope.
    const whereClause = isPatient
      ? { patientId: userId }
      : { pharmacyId: userId };

    // Apply active/completed status filters when requested.
    if (statusFilter === "active") {
      whereClause.sosRequest = {
        is: {
          status: { in: ACTIVE_STATUSES },
        },
      };
    } else if (statusFilter === "completed" || statusFilter === "archive") {
      whereClause.sosRequest = {
        is: {
          status: { in: COMPLETED_STATUSES },
        },
      };
    }

    // Load rooms with related entities in one query.
    const rooms = await prisma.chatRoom.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        // Pharmacy is stored as User; profile details are nested in user.pharmacy.
        pharmacy: {
          select: {
            id: true,
            name: true,                     // User.name (fallback display name)
            pharmacy: {
              select: {
                pharmacyName: true,
                address: true,
              },
            },
          },
        },
        patient: {
          select: { id: true, name: true },
        },
        sosRequest: {
          select: {
            id: true,
            medicineName: true,
            urgencyLevel: true,             // schema field
            status: true,
            patientName: true,
            contactNumber: true,
            createdAt: true,
          },
        },
        // Fetch latest message snippet for room list sidebar.
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
    });

    // Count unread messages per room using grouped query.
    const unreadGroups = await prisma.chatMessage.groupBy({
      by: ["roomId"],
      where: {
        roomId:   { in: rooms.map((r) => r.id) },
        senderId: { not: userId },
        isRead:   false,
      },
      _count: { id: true },
    });
    const unreadMap = Object.fromEntries(
      unreadGroups.map((g) => [g.roomId, g._count.id])
    );

    // Shape response to match frontend room list contract.
    const chatRooms = rooms.map((room) => ({
      id:           room.id,
      sosRequestId: room.sosRequestId,
      patientId:    room.patientId,
      pharmacyId:   room.pharmacyId,
      createdAt:    room.createdAt,

      // Pharmacy summary for room list cards.
      pharmacy: {
        id:   room.pharmacy.id,
        name: room.pharmacy.pharmacy?.pharmacyName || room.pharmacy.name,
      },

      // Patient summary for pharmacy-side view.
      patient: {
        id:   room.patient.id,
        name: room.patient.name,
      },

      // SOS metadata used by chat header and status UI.
      sosRequest: room.sosRequest
        ? {
            id:            room.sosRequest.id,
            medicineName:  room.sosRequest.medicineName,
            urgency:       room.sosRequest.urgencyLevel,
            urgencyLevel:  room.sosRequest.urgencyLevel,
            status:        room.sosRequest.status,
            patientName:   room.sosRequest.patientName,
            contactNumber: room.sosRequest.contactNumber,
            createdAt:     room.sosRequest.createdAt,
          }
        : null,

      lastMessage: room.messages[0] ?? null,
      unreadCount: unreadMap[room.id] ?? 0,
    }));

    return res.status(200).json({ success: true, data: { chatRooms } });
  } catch (error) {
    console.error("[CHAT ERROR] getChatRooms:", error.message, error.stack);
    next(error);
  }
};

// Return all messages for one chat room.
export const getChatMessages = async (req, res, next) => {
  try {
    // Read room and user identifiers.
    const { roomId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roomId) {
      return next(new AppError("roomId is required", 400));
    }

    // Load room metadata for authorization checks.
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        patientId: true,
        pharmacyId: true,
        sosRequest: {
          select: {
            medicineName: true,
            urgencyLevel: true,
            prescriptionUrl: true,
            additionalNotes: true,
          },
        },
      },
    });

    if (!chatRoom) {
      return next(new AppError("Chat room not found", 404));
    }

    // Permit only room participants.
    const isAuthorized =
      userId === chatRoom.patientId || userId === chatRoom.pharmacyId;

    if (!isAuthorized) {
      return next(new AppError("You are not authorized to view this chat", 403));
    }

    // Fetch messages in chronological order.
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Normalize message payload for frontend.
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      senderName: msg.sender?.name || "Unknown",
      isRead: msg.isRead,
      roomId: msg.roomId,
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        room: {
          id: chatRoom.id,
          sosDetails: chatRoom.sosRequest,
        },
        messages: formattedMessages,
      },
    });
  } catch (error) {
    console.error("[CHAT ERROR] getChatMessages:", error.message, error.stack);
    next(error);
  }
};

// Return total unread message count for current user.
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("Authentication required", 401));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Determine room scope from user role.
    let chatRoomIds = [];

    // Load room IDs by role scope.
    if (user.roleId === 3) {
      chatRoomIds = await prisma.chatRoom.findMany({
        where: { patientId: userId },
        select: { id: true },
      });
    } else if (user.roleId === 2) {
      chatRoomIds = await prisma.chatRoom.findMany({
        where: { pharmacyId: userId },
        select: { id: true },
      });
    }

    const roomIds = chatRoomIds.map((room) => room.id);

    // Count unread messages sent by other participants.
    const unreadCount = await prisma.chatMessage.count({
      where: {
        roomId: { in: roomIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("[CHAT ERROR] getUnreadCount:", error.message, error.stack);
    next(error);
  }
};

// Send one message to a chat room.
export const sendMessage = async (req, res, next) => {
  try {
    // Read route/body/user values.
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    if (!content || content.trim() === "") {
      return next(new AppError("Message content is required", 400));
    }

    // Validate room existence and user participation.
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        patientId: true,
        pharmacyId: true,
      },
    });

    if (!chatRoom) {
      return next(new AppError("Chat room not found", 404));
    }

    const isAuthorized =
      userId === chatRoom.patientId || userId === chatRoom.pharmacyId;

    if (!isAuthorized) {
      return next(new AppError("You are not authorized to send messages in this chat", 403));
    }

    // Persist message row.
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    // Emit realtime events for REST-created messages.
    const io = req.app.get("io");
    if (io) {
      const roomName = `chatroom_${roomId}`;
      const payload = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.sender?.name,
        roomId: message.roomId,
        isRead: message.isRead,
        createdAt: message.createdAt,
      };
      io.to(roomName).emit("receive_message", payload);

      // Build recipient notification payload for sidebar updates.
      const recipientId =
        userId === chatRoom.patientId ? chatRoom.pharmacyId : chatRoom.patientId;

      const notifPayload = {
        roomId,
        recipientId,
        senderId: userId,
        senderName: message.sender?.name,
        preview: content.trim().substring(0, 80),
        createdAt: message.createdAt,
      };

      // Canonical event consumed by NotificationContext.
      io.emit("NEW_MESSAGE", notifPayload);

      // Legacy alias for backward compatibility.
      io.emit("new_message_notification", notifPayload);
    }

    return res.status(201).json({
      success: true,
      data: {
        message: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.sender?.name,
          isRead: message.isRead,
          roomId: message.roomId,
          createdAt: message.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("[CHAT ERROR] sendMessage:", error.message, error.stack);
    next(error);
  }
};

// Resolve SOS request ID to chat room ID.
export const getRoomBySosRequest = async (req, res, next) => {
  try {
    const { sosRequestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) return next(new AppError("Authentication required", 401));
    if (!sosRequestId) return next(new AppError("sosRequestId is required", 400));

    const chatRoom = await prisma.chatRoom.findFirst({
      where: { sosRequestId },
      select: { id: true, patientId: true, pharmacyId: true },
    });

    if (!chatRoom) {
      // Return soft 404 so client can retry gracefully.
      return res.status(404).json({
        success: false,
        notInitialized: true,
        message: "Chat room not yet initialized",
      });
    }

    if (userId !== chatRoom.patientId && userId !== chatRoom.pharmacyId) {
      return next(new AppError("You are not authorized to access this chat room", 403));
    }

    return res.status(200).json({ success: true, data: { roomId: chatRoom.id } });
  } catch (error) {
    console.error("[CHAT ERROR] getRoomBySosRequest:", error.message, error.stack);
    next(error);
  }
};

// Mark all unread room messages as read for current user.
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Verify room exists and user is a participant.
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        patientId: true,
        pharmacyId: true,
      },
    });

    if (!chatRoom) {
      return next(new AppError("Chat room not found", 404));
    }

    const isAuthorized =
      userId === chatRoom.patientId || userId === chatRoom.pharmacyId;

    if (!isAuthorized) {
      return next(new AppError("You are not authorized to access this chat", 403));
    }

    // Mark unread messages from other participant as read.
    await prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("[CHAT ERROR] markMessagesAsRead:", error.message, error.stack);
    next(error);
  }
};
