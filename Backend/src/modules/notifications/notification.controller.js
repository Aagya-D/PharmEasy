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
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, skip = 0 } = req.query;

    if (isNaN(limit) || isNaN(skip)) {
      throw new BadRequestError("Invalid limit or skip parameters");
    }

    const notifications = await notificationService.getUserNotifications(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    console.log(`[NOTIFICATION CONTROLLER] Fetched ${notifications.length} notifications for user ${userId}`);

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
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    console.log(`[NOTIFICATION CONTROLLER] Unread count for user ${userId}: ${count}`);

    res.success({
      data: { unreadCount: count },
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
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);

    console.log(`[NOTIFICATION CONTROLLER] Marked ${count} notifications as read for user ${userId}`);

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
