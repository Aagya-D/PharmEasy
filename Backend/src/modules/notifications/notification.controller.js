// Notification controller for listing, counting, reading, and deleting notifications.

import notificationService from "./notification.service.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";
import logger from "../../utils/logger.js";

// Get paginated notifications for current user.
export const getUserNotifications = async (req, res, next) => {
  try {
    // Resolve authenticated user and pagination params.
    const userId = req.user.userId || req.user.id;
    const { limit = 20, skip = 0 } = req.query;
    const isSystemAdmin = req.user.role === "SYSTEM_ADMIN";

    // Validate pagination input values.
    if (isNaN(limit) || isNaN(skip)) {
      throw new BadRequestError("Invalid limit or skip parameters");
    }

    // Map JWT role name to notification targetRole filter.
    const roleMap = {
      PHARMACY_ADMIN: "PHARMACY",
      PATIENT: "PATIENT",
      SYSTEM_ADMIN: "ADMIN",
    };
    const targetRole = roleMap[req.user.role] || null;

    // Load notifications with role-aware filtering rules.
    const notifications = await notificationService.getUserNotifications(
      userId,
      parseInt(limit),
      parseInt(skip),
      targetRole,
      { strictGlobal: isSystemAdmin }
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

// Get unread notification badge counts for current user.
export const getUnreadCount = async (req, res, next) => {
  try {
    // Resolve user and strict-global behavior for admins.
    const userId = req.user.userId || req.user.id;
    const isSystemAdmin = req.user.role === "SYSTEM_ADMIN";

    // Resolve role filter used by notification service.
    const roleMap = {
      PHARMACY_ADMIN: "PHARMACY",
      PATIENT: "PATIENT",
      SYSTEM_ADMIN: "ADMIN",
    };
    const targetRole = roleMap[req.user.role] || null;

    // Query unread count first.
    const count = await notificationService.getUnreadCount(userId, targetRole, {
      strictGlobal: isSystemAdmin,
    });

    // Determine if unread set contains high-priority notifications.
    let hasHighPriority = false;
    if (count > 0) {
      hasHighPriority = await notificationService.hasUnreadHighPriority(
        userId,
        targetRole,
        { strictGlobal: isSystemAdmin }
      );
    }

    res.success({
      data: { unreadCount: count, hasHighPriority },
    });
  } catch (error) {
    next(error);
  }
};

// Mark one notification as read.
export const markAsRead = async (req, res, next) => {
  try {
    // Read notification ID from route params.
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Notification ID is required");
    }

    // Update read status using notification service.
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

// Mark all unread notifications as read for current user.
export const markAllAsRead = async (req, res, next) => {
  try {
    // Resolve authenticated user ID.
    const userId = req.user.userId || req.user.id;
    // Mark all notifications as read and return affected count.
    const count = await notificationService.markAllAsRead(userId);

    res.success({
      data: { markedCount: count },
      message: `${count} notification(s) marked as read`,
    });
  } catch (error) {
    next(error);
  }
};

// Delete one notification by ID.
export const deleteNotification = async (req, res, next) => {
  try {
    // Read notification ID from route params.
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("Notification ID is required");
    }

    // Delete record using notification service.
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
