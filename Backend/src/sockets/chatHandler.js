/**
 * Chat Handler for Socket.IO
 * Manages real-time messaging between Patient and Pharmacy per ChatRoom.
 *
 * Events:
 *   join_room      - Client joins a chat room
 *   send_message   - Client sends a message; server persists and broadcasts
 *   leave_room     - Client leaves the chat room
 *   typing_start   - Client starts typing
 *   typing_stop    - Client stops typing
 */

import { prisma } from "../database/prisma.js";
import logger from "../utils/logger.js";

export default function chatHandler(io) {
  io.on("connection", (socket) => {
    logger.info(`[SOCKET] Client connected: ${socket.id}`);

    /**
     * join_room
     * Payload: { roomId: string, userId: string }
     * Joins the socket to chatroom_<roomId>
     */
    socket.on("join_room", async ({ roomId, userId }) => {
      if (!roomId || !userId) {
        socket.emit("chat_error", { message: "roomId and userId are required" });
        return;
      }

      try {
        // Verify the chat room exists and user is authorized
        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          select: {
            id: true,
            patientId: true,
            pharmacyId: true,
            sosRequest: {
              select: { status: true },
            },
          },
        });

        if (!chatRoom) {
          socket.emit("chat_error", { message: "Chat room not found" });
          return;
        }

        // Verify user is authorized (either patient or pharmacy)
        const isAuthorized =
          userId === chatRoom.patientId || userId === chatRoom.pharmacyId;

        if (!isAuthorized) {
          socket.emit("chat_error", {
            message: "You are not authorized to join this chat room",
          });
          return;
        }

        const roomName = `chatroom_${roomId}`;
        socket.join(roomName);
        socket.userId = userId; // Store userId on socket for later use
        socket.currentRoom = roomName;
        logger.info(`[SOCKET] ${socket.id} (user: ${userId}) joined ${roomName}`);

        socket.emit("room_joined", {
          room: roomName,
          roomId,
        });
      } catch (error) {
        logger.error(`[SOCKET] join_room error: ${error.message}`);
        socket.emit("chat_error", { message: "Failed to join chat room" });
      }
    });

    /**
     * send_message
     * Payload: { roomId: string, senderId: string, content: string }
     * Persists message to DB and broadcasts to the room
     */
    socket.on("send_message", async ({ roomId, senderId, content }) => {
      if (!roomId || !senderId || !content) {
        socket.emit("chat_error", {
          message: "roomId, senderId, and content are required",
        });
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        socket.emit("chat_error", { message: "Message content cannot be empty" });
        return;
      }

      try {
        // Verify chat room exists and user is authorized
        const chatRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          select: {
            id: true,
            patientId: true,
            pharmacyId: true,
            sosRequestId: true,
          },
        });

        if (!chatRoom) {
          socket.emit("chat_error", { message: "Chat room not found" });
          return;
        }

        const isAuthorized =
          senderId === chatRoom.patientId || senderId === chatRoom.pharmacyId;

        if (!isAuthorized) {
          socket.emit("chat_error", {
            message: "You are not authorized to send messages in this chat",
          });
          return;
        }

        // Persist message to database
        const message = await prisma.chatMessage.create({
          data: {
            content: trimmedContent,
            senderId,
            roomId,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        const roomName = `chatroom_${roomId}`;

        // Broadcast to entire room (including sender for confirmation)
        io.to(roomName).emit("receive_message", {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.sender?.name || "Unknown",
          roomId: message.roomId,
          isRead: message.isRead,
          createdAt: message.createdAt,
        });

        // Emit a notification event for unread count update
        // Send to the recipient (not the sender)
        const recipientId =
          senderId === chatRoom.patientId
            ? chatRoom.pharmacyId
            : chatRoom.patientId;

        io.emit("new_message_notification", {
          roomId,
          sosRequestId: chatRoom.sosRequestId,
          recipientId,
          senderId,
          senderName: message.sender?.name || "Unknown",
          preview: trimmedContent.substring(0, 80),
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
     * typing_start
     * Payload: { roomId: string, userId: string, userName: string }
     * Broadcasts typing indicator to other users in the room
     */
    socket.on("typing_start", ({ roomId, userId, userName }) => {
      if (!roomId || !userId) return;

      const roomName = `chatroom_${roomId}`;
      socket.to(roomName).emit("user_typing", {
        userId,
        userName: userName || "Someone",
        isTyping: true,
      });
    });

    /**
     * typing_stop
     * Payload: { roomId: string, userId: string }
     * Broadcasts stop typing indicator to other users in the room
     */
    socket.on("typing_stop", ({ roomId, userId }) => {
      if (!roomId || !userId) return;

      const roomName = `chatroom_${roomId}`;
      socket.to(roomName).emit("user_typing", {
        userId,
        isTyping: false,
      });
    });

    /**
     * leave_room
     * Payload: { roomId: string }
     */
    socket.on("leave_room", ({ roomId }) => {
      if (roomId) {
        const roomName = `chatroom_${roomId}`;
        socket.leave(roomName);
        logger.info(`[SOCKET] ${socket.id} left ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });
}
