/**
 * Chat Controller
 * GET /api/chat/rooms - List active chat rooms
 * GET /api/chat/rooms/:roomId - Get chat room details
 * GET /api/chat/rooms/:roomId/messages - Retrieve chat messages for a room
 * GET /api/chat/unread-count - Get unread message count
 * POST /api/chat/rooms/:roomId/messages - Send a message
 * PUT /api/chat/rooms/:roomId/mark-read - Mark messages as read
 * Security: Only the patient or the pharmacy involved can access.
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

/**
 * GET /api/chat/rooms
 * Returns all chat rooms for the authenticated user.
 * Response shape matches what the frontend PatientChat component expects:
 *   { success, data: { chatRooms: [ { id, pharmacy, patient, sosRequest, lastMessage, unreadCount } ] } }
 */
export const getChatRooms = async (req, res, next) => {
  try {
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

    const allowedFilters = new Set(["", "all", "active", "completed", "archive"]);
    if (!allowedFilters.has(statusFilter)) {
      return next(new AppError("status must be one of: active, completed, archive, all", 400));
    }

    if (!userId) return next(new AppError("Authentication required", 401));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) return next(new AppError("User not found", 404));

    const isPatient  = user.roleId === 3;
    const isPharmacy = user.roleId === 2;

    // Neither patient nor pharmacy — return empty list gracefully
    if (!isPatient && !isPharmacy) {
      return res.status(200).json({ success: true, data: { chatRooms: [] } });
    }

    const whereClause = isPatient
      ? { patientId: userId }
      : { pharmacyId: userId };

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

    // Single query — fetch rooms with all data needed in one round-trip
    const rooms = await prisma.chatRoom.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        // pharmacy is a User; its Pharmacy profile lives at pharmacy.pharmacy
        pharmacy: {
          select: {
            id: true,
            name: true,                     // User.name (fallback display name)
            pharmacy: {
              select: {
                pharmacyName: true,         // Pharmacy.pharmacyName (preferred)
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
        // Grab only the single most-recent message for sidebar "last message" snippet
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

    // Efficient unread counting — one groupBy query instead of N separate counts
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

    // Build the response in the shape the frontend expects
    const chatRooms = rooms.map((room) => ({
      id:           room.id,                   // frontend uses room.id everywhere
      sosRequestId: room.sosRequestId,
      patientId:    room.patientId,
      pharmacyId:   room.pharmacyId,
      createdAt:    room.createdAt,

      // pharmacy.name — frontend getPharmacyName() reads room.pharmacy.name
      pharmacy: {
        id:   room.pharmacy.id,
        name: room.pharmacy.pharmacy?.pharmacyName || room.pharmacy.name,
      },

      // patient.name — used by pharmacy-side view
      patient: {
        id:   room.patient.id,
        name: room.patient.name,
      },

      // sosRequest — frontend reads .medicineName, .urgency, .status, .createdAt
      sosRequest: room.sosRequest
        ? {
            id:            room.sosRequest.id,
            medicineName:  room.sosRequest.medicineName,
            urgency:       room.sosRequest.urgencyLevel,  // alias for frontend
            urgencyLevel:  room.sosRequest.urgencyLevel,  // keep original too
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

/**
 * GET /api/chat/rooms/:roomId/messages
 * Returns all messages for a chat room
 */
export const getChatMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roomId) {
      return next(new AppError("roomId is required", 400));
    }

    // Fetch the chat room to verify authorization
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

    // Check if the requesting user is authorized
    const isAuthorized =
      userId === chatRoom.patientId || userId === chatRoom.pharmacyId;

    if (!isAuthorized) {
      return next(new AppError("You are not authorized to view this chat", 403));
    }

    // Fetch messages sorted by createdAt ascending (oldest first)
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

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

/**
 * GET /api/chat/unread-count
 * Returns total unread message count for the authenticated user
 */
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

    let chatRoomIds = [];

    // Get chat room IDs for the user
    if (user.roleId === 3) {
      // Patient
      chatRoomIds = await prisma.chatRoom.findMany({
        where: { patientId: userId },
        select: { id: true },
      });
    } else if (user.roleId === 2) {
      // Pharmacy
      chatRoomIds = await prisma.chatRoom.findMany({
        where: { pharmacyId: userId },
        select: { id: true },
      });
    }

    const roomIds = chatRoomIds.map((room) => room.id);

    // Count unread messages from other users
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

/**
 * POST /api/chat/rooms/:roomId/messages
 * Send a new message in a chat room
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    if (!content || content.trim() === "") {
      return next(new AppError("Message content is required", 400));
    }

    // Verify the chat room exists and user is authorized
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

    // Create the message
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

    // Emit via Socket.IO so both sides receive the message in real-time
    // (covers the REST path — socket send_message handler covers the WS path)
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

      // Sidebar notification for the recipient
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

      // Canonical NEW_MESSAGE event — consumed by NotificationContext
      io.emit("NEW_MESSAGE", notifPayload);

      // Legacy alias kept for backward-compat with PharmacyNotificationBell
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

/**
 * GET /api/chat/rooms/by-sos/:sosRequestId
 * Resolves a SOS request ID to its associated ChatRoom ID.
 * Used by the frontend ChatWindow to obtain the roomId needed for
 * history fetching and socket join_room.
 */
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
      // Return a soft 404 so the frontend can retry with a placeholder instead of crashing
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

/**
 * PUT /api/chat/rooms/:roomId/mark-read
 * Mark all messages in a room as read for the current user
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Verify the chat room exists and user is authorized
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

    // Mark all messages from other users as read
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
