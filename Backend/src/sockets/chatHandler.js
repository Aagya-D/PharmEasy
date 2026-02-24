/**
 * Chat Handler for Socket.IO
 * Manages real-time messaging between Patient and Pharmacy per SOS request.
 *
 * Events:
 *   join_room      - Client joins a room scoped to an SOS request
 *   send_message   - Client sends a message; server persists and broadcasts
 *   leave_room     - Client leaves the chat room
 */

import { prisma } from "../database/prisma.js";
import logger from "../utils/logger.js";

export default function chatHandler(io) {
  io.on("connection", (socket) => {
    logger.info(`[SOCKET] Client connected: ${socket.id}`);

    /**
     * join_room
     * Payload: { sosRequestId: string }
     * Joins the socket to room_<sosRequestId>
     */
    socket.on("join_room", async ({ sosRequestId }) => {
      if (!sosRequestId) {
        socket.emit("chat_error", { message: "sosRequestId is required" });
        return;
      }

      try {
        // Verify the SOS request exists and is accepted
        const sosRequest = await prisma.sOSRequest.findUnique({
          where: { id: sosRequestId },
          select: { id: true, status: true },
        });

        if (!sosRequest) {
          socket.emit("chat_error", { message: "SOS request not found" });
          return;
        }

        if (sosRequest.status !== "accepted") {
          socket.emit("chat_error", {
            message: "Chat is only available after the SOS request is accepted",
          });
          return;
        }

        const roomName = `room_${sosRequestId}`;
        socket.join(roomName);
        logger.info(`[SOCKET] ${socket.id} joined ${roomName}`);

        socket.emit("room_joined", {
          room: roomName,
          sosRequestId,
        });
      } catch (error) {
        logger.error(`[SOCKET] join_room error: ${error.message}`);
        socket.emit("chat_error", { message: "Failed to join chat room" });
      }
    });

    /**
     * send_message
     * Payload: { sosRequestId: string, senderId: string, content: string }
     * Persists message to DB and broadcasts to the room
     */
    socket.on("send_message", async ({ sosRequestId, senderId, content }) => {
      if (!sosRequestId || !senderId || !content) {
        socket.emit("chat_error", {
          message: "sosRequestId, senderId, and content are required",
        });
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        socket.emit("chat_error", { message: "Message content cannot be empty" });
        return;
      }

      try {
        // Verify sender is part of this SOS transaction
        const sosRequest = await prisma.sOSRequest.findUnique({
          where: { id: sosRequestId },
          select: { patientId: true, acceptedBy: true, status: true },
        });

        if (!sosRequest || sosRequest.status !== "accepted") {
          socket.emit("chat_error", {
            message: "Cannot send messages - SOS request is not accepted",
          });
          return;
        }

        // Find the pharmacy's userId from the pharmacy record
        let pharmacyUserId = null;
        if (sosRequest.acceptedBy) {
          const pharmacy = await prisma.pharmacy.findUnique({
            where: { id: sosRequest.acceptedBy },
            select: { userId: true },
          });
          pharmacyUserId = pharmacy?.userId || null;
        }

        const isPatient = senderId === sosRequest.patientId;
        const isPharmacy = senderId === pharmacyUserId;

        if (!isPatient && !isPharmacy) {
          socket.emit("chat_error", {
            message: "You are not authorized to send messages in this chat",
          });
          return;
        }

        // Persist message to database
        const message = await prisma.message.create({
          data: {
            content: trimmedContent,
            senderId,
            sosRequestId,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        const roomName = `room_${sosRequestId}`;

        // Broadcast to entire room (including sender for confirmation)
        io.to(roomName).emit("receive_message", {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.sender?.name || "Unknown",
          sosRequestId: message.sosRequestId,
          createdAt: message.createdAt,
        });

        logger.info(
          `[SOCKET] Message in ${roomName} by ${senderId}: ${trimmedContent.substring(0, 50)}`
        );
      } catch (error) {
        logger.error(`[SOCKET] send_message error: ${error.message}`);
        socket.emit("chat_error", { message: "Failed to send message" });
      }
    });

    /**
     * leave_room
     * Payload: { sosRequestId: string }
     */
    socket.on("leave_room", ({ sosRequestId }) => {
      if (sosRequestId) {
        const roomName = `room_${sosRequestId}`;
        socket.leave(roomName);
        logger.info(`[SOCKET] ${socket.id} left ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });
}
