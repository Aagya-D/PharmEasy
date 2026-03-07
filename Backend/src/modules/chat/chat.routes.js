/**
 * Chat Routes
 * GET /api/chat/rooms - List all chat rooms for the user
 * GET /api/chat/rooms/:roomId/messages - Get messages for a room
 * GET /api/chat/unread-count - Get unread message count
 * POST /api/chat/rooms/:roomId/messages - Send a message
 * PUT /api/chat/rooms/:roomId/mark-read - Mark messages as read
 */

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

// GET /api/chat/rooms — list all chat rooms for the authenticated user
router.get("/rooms", authenticate(), getChatRooms);

// GET /api/chat/unread-count — get total unread message count
router.get("/unread-count", authenticate(), getUnreadCount);

// GET /api/chat/rooms/by-sos/:sosRequestId — resolve SOS ID to ChatRoom ID
// Must be defined BEFORE /rooms/:roomId/messages so Express does not treat
// the literal string "by-sos" as a roomId parameter.
router.get("/rooms/by-sos/:sosRequestId", authenticate(), getRoomBySosRequest);

// GET /api/chat/rooms/:roomId/messages — retrieve messages for a room
router.get("/rooms/:roomId/messages", authenticate(), getChatMessages);

// POST /api/chat/rooms/:roomId/messages — send a new message
router.post("/rooms/:roomId/messages", authenticate(), sendMessage);

// PUT /api/chat/rooms/:roomId/mark-read — mark all messages in room as read
router.put("/rooms/:roomId/mark-read", authenticate(), markMessagesAsRead);

export default router;
