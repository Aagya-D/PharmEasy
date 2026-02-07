/**
 * Notification Service - Real-time event-driven notifications
 * 
 * Handles creation and management of user notifications triggered by:
 * - Admin Announcements (CMS_ALERT)
 * - SOS Request status changes (SOS_UPDATE)
 * - Medicine availability updates (MEDICINE_ALERT)
 */

import { prisma } from "../../database/prisma.js";
import logger from "../../utils/logger.js";

class NotificationService {
  /**
   * Create a single notification for a user
   * @param {string} userId - Target user ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - NotificationType enum value
   * @param {object} metadata - Optional metadata (JSON)
   * @returns {Promise<object>} Created notification
   */
  async createNotification(userId, title, message, type, metadata = null) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          metadata,
        },
      });

      console.log(`[NOTIFICATION SERVICE] Created notification for user ${userId}:`, {
        title,
        type,
      });

      return notification;
    } catch (error) {
      logger.error("Failed to create notification", {
        userId,
        title,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Broadcast notification to multiple users (bulk insert)
   * Efficient for announcements to 1000+ users
   * 
   * @param {array} userIds - Array of user IDs to notify
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - NotificationType enum value
   * @param {object} metadata - Optional metadata
   * @returns {Promise<number>} Count of notifications created
   */
  async broadcastNotification(userIds, title, message, type, metadata = null) {
    try {
      if (!userIds || userIds.length === 0) {
        console.warn("[NOTIFICATION SERVICE] broadcastNotification called with empty userIds array");
        return 0;
      }

      const notifications = userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
        metadata,
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: false,
      });

      console.log(`[NOTIFICATION SERVICE] Broadcast notification to ${result.count} users:`, {
        title,
        type,
        targetCount: userIds.length,
      });

      return result.count;
    } catch (error) {
      logger.error("Failed to broadcast notification", {
        userCount: userIds?.length || 0,
        title,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all notifications for a user (with pagination)
   * @param {string} userId - User ID
   * @param {number} limit - Results per page (default 20)
   * @param {number} skip - Skip count for pagination (default 0)
   * @returns {Promise<array>} Notifications sorted by newest first
   */
  async getUserNotifications(userId, limit = 20, skip = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      });

      return notifications;
    } catch (error) {
      logger.error("Failed to fetch user notifications", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * Used for navbar badge
   * 
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return count;
    } catch (error) {
      logger.error("Failed to get unread count", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<object>} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      console.log(`[NOTIFICATION SERVICE] Marked notification ${notificationId} as read`);
      return notification;
    } catch (error) {
      logger.error("Failed to mark notification as read", {
        notificationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of updated notifications
   */
  async markAllAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      console.log(`[NOTIFICATION SERVICE] Marked ${result.count} notifications as read for user ${userId}`);
      return result.count;
    } catch (error) {
      logger.error("Failed to mark all notifications as read", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<object>} Deleted notification
   */
  async deleteNotification(notificationId) {
    try {
      const notification = await prisma.notification.delete({
        where: { id: notificationId },
      });

      console.log(`[NOTIFICATION SERVICE] Deleted notification ${notificationId}`);
      return notification;
    } catch (error) {
      logger.error("Failed to delete notification", {
        notificationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * SOS Update Trigger - Called when pharmacy accepts/rejects SOS request
   * Creates notification for patient
   * 
   * @param {string} patientId - Patient user ID
   * @param {string} pharmacyName - Pharmacy that accepted/rejected
   * @param {string} status - 'accepted' or 'rejected'
   * @param {string} medicineName - Medicine requested
   * @param {string} sosId - SOS request ID for navigation
   * @returns {Promise<object>} Created notification
   */
  async notifySosStatusChange(patientId, pharmacyName, status, medicineName, sosId) {
    const title = status === "accepted" 
      ? `${pharmacyName} Accepted Your SOS Request`
      : `${pharmacyName} Declined Your SOS Request`;

    const message = status === "accepted"
      ? `Great news! ${pharmacyName} has confirmed they have ${medicineName} in stock and will prepare it for you. Click to view details.`
      : `${pharmacyName} doesn't have ${medicineName} available at the moment. Keep searching or wait for stock updates.`;

    return this.createNotification(patientId, title, message, "SOS_UPDATE", {
      status,
      pharmacyName,
      medicineName,
      sosId,
      link: `/patient/sos/${sosId}`,
    });
  }

  /**
   * Announcement Broadcast Trigger - Called when admin publishes announcement
   * Gets all target users and broadcasts notification
   * 
   * @param {object} announcement - Announcement object from database
   * @returns {Promise<number>} Count of notifications created
   */
  async notifyAnnouncement(announcement) {
    try {
      // Get all active users (filter by role if targetRole is specified)
      const whereClause = {
        isActive: true,
        ...(announcement.targetRole && {
          role: {
            name: announcement.targetRole,
          },
        }),
      };

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);

      if (userIds.length === 0) {
        console.warn(
          "[NOTIFICATION SERVICE] No users found for announcement broadcast",
          { announcementId: announcement.id }
        );
        return 0;
      }

      return this.broadcastNotification(
        userIds,
        announcement.title,
        announcement.message,
        "CMS_ALERT",
        {
          announcementId: announcement.id,
          priority: announcement.priority,
          type: announcement.type,
        }
      );
    } catch (error) {
      logger.error("Failed to broadcast announcement notification", {
        announcementId: announcement.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Medicine Availability Alert - Called when patient is notified about out-of-stock medicine
   * @param {string} patientId - Patient user ID
   * @param {string} medicineName - Medicine name
   * @param {string} pharmacyName - Pharmacy where medicine is available
   * @returns {Promise<object>} Created notification
   */
  async notifyMedicineAvailable(patientId, medicineName, pharmacyName) {
    const title = `${medicineName} is Now Available`;
    const message = `Good news! ${medicineName} is now in stock at ${pharmacyName}. Visit us soon to purchase.`;

    return this.createNotification(patientId, title, message, "MEDICINE_ALERT", {
      medicineName,
      pharmacyName,
    });
  }
}

export default new NotificationService();
