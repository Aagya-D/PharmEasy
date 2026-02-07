/**
 * Notification Routes
 * 
 * All routes require authentication (user must be logged in)
 * Patient can only access their own notifications
 */

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

// Create auth middleware for authenticated routes
const auth = authenticate();

/**
 * @route   GET /api/notifications
 * @access  Private (Authenticated users only)
 * @desc    Get user's notifications with pagination
 * @query   limit=20 (optional) - Results per page
 * @query   skip=0 (optional) - Pagination offset
 * @returns {Object} { success: true, data: [...notifications], meta: {...} }
 */
router.get("/", auth, getUserNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @access  Private (Authenticated users only)
 * @desc    Get count of unread notifications for navbar badge
 * @returns {Object} { success: true, data: { unreadCount: 5 } }
 */
router.get("/unread-count", auth, getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @access  Private (Authenticated users only)
 * @desc    Mark a single notification as read
 * @param   id - Notification ID
 * @returns {Object} { success: true, data: {...notification}, message: "..." }
 */
router.put("/:id/read", auth, markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @access  Private (Authenticated users only)
 * @desc    Mark all unread notifications as read
 * @returns {Object} { success: true, data: { markedCount: 3 }, message: "..." }
 */
router.put("/read-all", auth, markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @access  Private (Authenticated users only)
 * @desc    Delete a notification
 * @param   id - Notification ID
 * @returns {Object} { success: true, message: "..." }
 */
router.delete("/:id", auth, deleteNotification);

export default router;
