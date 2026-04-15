// Notification routes (all require authentication).

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./notification.controller.js";

const router = express.Router();

// Shared auth middleware for all notification routes.
const auth = authenticate();

// Get paginated notifications for current user.
router.get("/", auth, getUserNotifications);

// Get unread notification count.
router.get("/unread-count", auth, getUnreadCount);

// Mark a single notification as read.
router.put("/:id/read", auth, markAsRead);

// Mark all unread notifications as read.
router.put("/read-all", auth, markAllAsRead);

// Delete a notification.
router.delete("/:id", auth, deleteNotification);

export default router;
