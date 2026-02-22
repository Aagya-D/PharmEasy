/**
 * Notification Controller - API endpoints for notification management
 * 
 * Routes:
 * - GET /api/notifications - Get user's notifications (paginated)
 * - GET /api/notifications/unread-count - Get unread badge count
 * - PUT /api/notifications/:id/read - Mark single as read
 * - PUT /api/notifications/read-all - Mark all notifications as read
 * - DELETE /api/notifications/:id - Delete a notification
 */

import notificationService from "./notification.service.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";
import logger from "../../utils/logger.js";

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 * Query params: limit=20, skip=0
 * Role-based filtering: Pharmacy sees only PHARMACY-targeted notifications
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { limit = 20, skip = 0 } = req.query;

    if (isNaN(limit) || isNaN(skip)) {
      throw new BadRequestError("Invalid limit or skip parameters");
    }

    // Map JWT role to notification targetRole filter
    const roleMap = {
      PHARMACY_ADMIN: "PHARMACY",
      PATIENT: "PATIENT",
      SYSTEM_ADMIN: "ADMIN",
    };
    const targetRole = roleMap[req.user.role] || null;

    const notifications = await notificationService.getUserNotifications(
      userId,
      parseInt(limit),
      parseInt(skip),
      targetRole
    );

    res.success({
      data: notifications,
      meta: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: notifications.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get unread notification count (for badge)
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;

    const roleMap = {
      PHARMACY_ADMIN: "PHARMACY",
      PATIENT: "PATIENT",
      SYSTEM_ADMIN: "ADMIN",
    };
    const targetRole = roleMap[req.user.role] || null;

    const count = await notificationService.getUnreadCount(userId, targetRole);

    // Check if any unread notification is high-priority (SOS)
    let hasHighPriority = false;
    if (count > 0) {
      hasHighPriority = await notificationService.hasUnreadHighPriority(userId, targetRole);
    }

    res.success({
      data: { unreadCount: count, hasHighPriority },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Notification ID is required");
    }

    const notification = await notificationService.markAsRead(id);

    console.log(`[NOTIFICATION CONTROLLER] Marked notification ${id} as read`);

    res.success({
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return next(new NotFoundError("Notification not found"));
    }
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all unread notifications as read for user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const count = await notificationService.markAllAsRead(userId);

    res.success({
      data: { markedCount: count },
      message: `${count} notification(s) marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Notification ID is required");
    }

    await notificationService.deleteNotification(id);

    console.log(`[NOTIFICATION CONTROLLER] Deleted notification ${id}`);

    res.success({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return next(new NotFoundError("Notification not found"));
    }
    next(error);
  }
};
