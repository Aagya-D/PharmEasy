/**
 * Chat Controller
 * GET /api/chat/conversations - List active chat conversations
 * GET /api/chat/:sosRequestId - Retrieve chat history for an SOS request
 * Security: Only the patient or the pharmacy involved can access.
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

/**
 * GET /api/chat/conversations
 * Returns SOS requests that have been accepted by this pharmacy user's pharmacy,
 * along with the latest message and unread indicator.
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("Authentication required", 401));

    // Find the pharmacy owned by this user
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!pharmacy) {
      return res.status(200).json({ success: true, data: { conversations: [] } });
    }

    // Find all accepted SOS requests for this pharmacy
    const sosRequests = await prisma.sOSRequest.findMany({
      where: { acceptedBy: pharmacy.id, status: "accepted" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        patientName: true,
        medicineName: true,
        urgencyLevel: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            sender: { select: { name: true } },
          },
        },
      },
    });

    const conversations = sosRequests.map((sos) => {
      const lastMsg = sos.messages[0] || null;
      return {
        sosRequestId: sos.id,
        patientName: sos.patientName,
        medicineName: sos.medicineName,
        urgencyLevel: sos.urgencyLevel,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              senderName: lastMsg.sender?.name || "Unknown",
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
            }
          : null,
        updatedAt: sos.updatedAt,
      };
    });

    return res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/:sosRequestId
 * Returns all messages for a given SOS request, sorted oldest-first.
 */
export const getChatHistory = async (req, res, next) => {
  try {
    const { sosRequestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    if (!sosRequestId) {
      return next(new AppError("sosRequestId is required", 400));
    }

    // Fetch the SOS request to verify authorization
    const sosRequest = await prisma.sOSRequest.findUnique({
      where: { id: sosRequestId },
      select: {
        id: true,
        patientId: true,
        acceptedBy: true,
        status: true,
      },
    });

    if (!sosRequest) {
      return next(new AppError("SOS request not found", 404));
    }

    // Check if the requesting user is the patient
    const isPatient = userId === sosRequest.patientId;

    // Check if the requesting user is the pharmacy owner
    let isPharmacy = false;
    if (sosRequest.acceptedBy) {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: sosRequest.acceptedBy },
        select: { userId: true },
      });
      isPharmacy = pharmacy?.userId === userId;
    }

    if (!isPatient && !isPharmacy) {
      return next(new AppError("You are not authorized to view this chat", 403));
    }

    // Fetch messages sorted by createdAt ascending (oldest first)
    const messages = await prisma.message.findMany({
      where: { sosRequestId },
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
      sosRequestId: msg.sosRequestId,
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: { messages: formattedMessages },
    });
  } catch (error) {
    next(error);
  }
};
