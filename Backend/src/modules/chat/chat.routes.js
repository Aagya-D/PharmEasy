// Chat routes for room listing, messages, unread counts, and read-state updates.

import { Router } from "express";
import {
  getChatRooms,
  getChatMessages,
  getUnreadCount,
  sendMessage,
  markMessagesAsRead,
  getRoomBySosRequest,
} from "./chat.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

// List chat rooms for authenticated user.
router.get("/rooms", authenticate(), getChatRooms);

// Get unread message count.
router.get("/unread-count", authenticate(), getUnreadCount);

// Resolve SOS request ID to chat room ID.
// Keep this route before /rooms/:roomId/messages to avoid route conflicts.
router.get("/rooms/by-sos/:sosRequestId", authenticate(), getRoomBySosRequest);

// Retrieve messages for one room.
router.get("/rooms/:roomId/messages", authenticate(), getChatMessages);

// Send a new message to room.
router.post("/rooms/:roomId/messages", authenticate(), sendMessage);

// Mark room messages as read for current user.
router.put("/rooms/:roomId/mark-read", authenticate(), markMessagesAsRead);

export default router;
