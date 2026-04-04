/**
 * Notification Service - Real-time event-driven notifications
 * 
 * Pharmacy-targeted notification triggers:
 * - NEW_SOS_ALERT (SOS_UPDATE, targetRole: PHARMACY, priority: high) — radius-based
 * - SOS_CLAIMED_BY_OTHER (SOS_UPDATE, targetRole: PHARMACY) — when another pharmacy accepts
 * - LOW_STOCK_WARNING (targetRole: PHARMACY) — inventory < 10 units
 * - EXPIRY_WARNING (targetRole: PHARMACY) — medicine within 30 days of expiry
 * - ADMIN_BROADCAST (CMS_ALERT) — system admin announcements
 * 
 * Patient-targeted triggers:
 * - SOS accepted/rejected (SOS_UPDATE, targetRole: PATIENT)
 * - Medicine available (MEDICINE_ALERT, targetRole: PATIENT)
 */

import { prisma } from "../../database/prisma.js";
import { calculateDistance } from "../../utils/distance.js";
import logger from "../../utils/logger.js";

class NotificationService {
  async getSystemAdminUserIds() {
    const admins = await prisma.user.findMany({
      where: {
        roleId: 1,
        isActive: true,
      },
      select: { id: true },
    });

    return admins.map((admin) => admin.id);
  }

  async notifySystemAdmins(title, message, metadata = null, priority = "normal", type = "SYSTEM_MESSAGE") {
    const adminIds = await this.getSystemAdminUserIds();
    if (adminIds.length === 0) return 0;

    return this.broadcastNotification(
      adminIds,
      title,
      message,
      type,
      metadata,
      "ADMIN",
      priority
    );
  }

  async notifyNewPharmacyRegistration(pharmacyName, pharmacyUserId = null, pharmacyId = null) {
    return this.notifySystemAdmins(
      "NEW_PHARMACY_REGISTRATION",
      `New Onboarding: ${pharmacyName} is awaiting license verification.`,
      {
        event: "NEW_PHARMACY_REGISTRATION",
        pharmacyName,
        pharmacyUserId,
        pharmacyId,
        link: "/admin/pharmacies?status=PENDING",
      },
      "high",
      "SYSTEM_MESSAGE"
    );
  }

  async notifyGlobalSosAlert(medicineName, districtName, sosId) {
    return this.notifySystemAdmins(
      "GLOBAL_SOS_ALERT",
      `Emergency: ${medicineName} requested in ${districtName}.`,
      {
        event: "GLOBAL_SOS_ALERT",
        medicineName,
        districtName,
        sosId,
        link: "/admin/map",
      },
      "high",
      "SOS_ALERT"
    );
  }

  async notifySecurityFlag(message, metadata = {}) {
    return this.notifySystemAdmins(
      "SECURITY_FLAG",
      message,
      {
        event: "SECURITY_FLAG",
        ...metadata,
        link: "/admin/logs",
      },
      "high",
      "SYSTEM_MESSAGE"
    );
  }

  /**
   * Create a single notification for a user
   * @param {string} userId - Target user ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - NotificationType enum value
   * @param {object} metadata - Optional metadata (JSON)
   * @param {string} targetRole - PHARMACY | PATIENT | ADMIN
   * @param {string} priority - normal | high
   * @returns {Promise<object>} Created notification
   */
  async createNotification(userId, title, message, type, metadata = null, targetRole = null, priority = "normal") {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          metadata,
          targetRole,
          priority,
        },
      });

      console.log(`[NOTIFICATION SERVICE] Created notification for user ${userId}:`, {
        title,
        type,
        targetRole,
        priority,
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
   * @param {array} userIds - Array of user IDs to notify
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - NotificationType enum value
   * @param {object} metadata - Optional metadata
   * @param {string} targetRole - PHARMACY | PATIENT | ADMIN
   * @param {string} priority - normal | high
   * @returns {Promise<number>} Count of notifications created
   */
  async broadcastNotification(userIds, title, message, type, metadata = null, targetRole = null, priority = "normal") {
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
        targetRole,
        priority,
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: false,
      });

      console.log(`[NOTIFICATION SERVICE] Broadcast notification to ${result.count} users:`, {
        title,
        type,
        targetRole,
        priority,
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
   * @param {string} targetRole - Optional role filter (PHARMACY, PATIENT, ADMIN)
   * @returns {Promise<array>} Notifications sorted by newest first
   */
  async getUserNotifications(userId, limit = 20, skip = 0, targetRole = null, options = {}) {
    try {
      const { strictGlobal = false } = options;
      const where = { userId };

      // Role-based filtering: only show notifications meant for this role (or null = everyone)
      if (targetRole) {
        if (strictGlobal && targetRole === "ADMIN") {
          where.targetRole = "ADMIN";
          where.type = { in: ["SYSTEM_MESSAGE", "SOS_ALERT", "CMS_ALERT"] };
        } else {
          where.OR = [
            { targetRole },
            { targetRole: null },
          ];
        }
      }

      const notifications = await prisma.notification.findMany({
        where,
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
   * @param {string} userId - User ID
   * @param {string} targetRole - Optional role filter
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount(userId, targetRole = null, options = {}) {
    try {
      const { strictGlobal = false } = options;
      const where = { userId, isRead: false };

      if (targetRole) {
        if (strictGlobal && targetRole === "ADMIN") {
          where.targetRole = "ADMIN";
          where.type = { in: ["SYSTEM_MESSAGE", "SOS_ALERT", "CMS_ALERT"] };
        } else {
          where.OR = [
            { targetRole, isRead: false },
            { targetRole: null, isRead: false },
          ];
          // When using OR, remove top-level isRead to avoid conflict
          delete where.isRead;
          where.AND = [{ userId }];
        }
      }

      const count = await prisma.notification.count({ where });
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
   * Check if there are any unread high-priority notifications for the user
   */
  async hasUnreadHighPriority(userId, targetRole = null, options = {}) {
    try {
      const { strictGlobal = false } = options;
      const where = { userId, isRead: false, priority: "high" };

      if (targetRole) {
        if (strictGlobal && targetRole === "ADMIN") {
          where.targetRole = "ADMIN";
          where.type = { in: ["SYSTEM_MESSAGE", "SOS_ALERT", "CMS_ALERT"] };
        } else {
          where.OR = [
            { targetRole, isRead: false, priority: "high" },
            { targetRole: null, isRead: false, priority: "high" },
          ];
          delete where.isRead;
          delete where.priority;
          where.AND = [{ userId }, { priority: "high" }];
        }
      }

      const count = await prisma.notification.count({ where });
      return count > 0;
    } catch (error) {
      logger.error("Failed to check high priority", { userId, error: error.message });
      return false;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
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
   */
  async markAllAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
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
   */
  async deleteNotification(notificationId) {
    try {
      const notification = await prisma.notification.delete({
        where: { id: notificationId },
      });
      return notification;
    } catch (error) {
      logger.error("Failed to delete notification", {
        notificationId,
        error: error.message,
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  PATIENT-TARGETED TRIGGERS
  // ═══════════════════════════════════════════════════════

  /**
   * SOS Update Trigger — pharmacy accepted/rejected a patient's SOS
   */
  async notifySosStatusChange(patientId, pharmacyName, status, medicineName, sosId) {
    const normalizedStatus = String(status || "").toLowerCase();

    const notificationMap = {
      accepted: {
        title: `${pharmacyName} Accepted Your SOS Request`,
        message: `Great news! ${pharmacyName} has confirmed they have ${medicineName} in stock and will prepare it for you.`,
        type: "SOS_UPDATE",
        priority: "high",
      },
      declined: {
        title: `${pharmacyName} Declined Your SOS Request`,
        message: `${pharmacyName} doesn't have ${medicineName} available at the moment.`,
        type: "SOS_UPDATE",
        priority: "normal",
      },
      rejected: {
        title: `${pharmacyName} Declined Your SOS Request`,
        message: `${pharmacyName} doesn't have ${medicineName} available at the moment.`,
        type: "SOS_UPDATE",
        priority: "normal",
      },
      completed: {
        title: "✅ SOS Request Completed",
        message: `${pharmacyName} has successfully fulfilled your request for ${medicineName}.`,
        type: "SOS_COMPLETED",
        priority: "high",
      },
      expired: {
        title: "SOS Request Expired",
        message: `Your SOS request for ${medicineName} expired because no pharmacy could fulfill it in time.`,
        type: "SOS_UPDATE",
        priority: "normal",
      },
    };

    const selected = notificationMap[normalizedStatus] || notificationMap.declined;

    return this.createNotification(patientId, selected.title, selected.message, selected.type, {
      status: normalizedStatus,
      pharmacyName,
      medicineName,
      sosId,
      link: `/patient/sos/${sosId}`,
    }, "PATIENT", selected.priority);
  }

  /**
   * Medicine Availability Alert — patient-facing
   */
  async notifyMedicineAvailable(patientId, medicineName, pharmacyName) {
    return this.createNotification(
      patientId,
      `${medicineName} is Now Available`,
      `Good news! ${medicineName} is now in stock at ${pharmacyName}.`,
      "MEDICINE_ALERT",
      { medicineName, pharmacyName },
      "PATIENT"
    );
  }

  /**
   * Announcement Broadcast — admin CMS announcements
   */
  async notifyAnnouncement(announcement) {
    try {
      // Map announcement targetRole → Prisma RoleType enum for user lookup
      // CMS sends "PHARMACY" or "PATIENT"; RoleType uses PHARMACY_ADMIN / PATIENT
      const ROLE_TO_ENUM = {
        PHARMACY: "PHARMACY_ADMIN",
        PHARMACY_ADMIN: "PHARMACY_ADMIN",
        PATIENT: "PATIENT",
        ADMIN: "SYSTEM_ADMIN",
      };

      // Map announcement targetRole → notification targetRole convention
      const ROLE_TO_NOTIF = {
        PHARMACY: "PHARMACY",
        PHARMACY_ADMIN: "PHARMACY",
        PATIENT: "PATIENT",
        ADMIN: "ADMIN",
      };

      // Default action link per target
      const ROLE_TO_LINK = {
        PHARMACY: "/pharmacy/dashboard",
        PATIENT: "/patient",
        ADMIN: "/admin/dashboard",
      };

      const roleEnum = ROLE_TO_ENUM[announcement.targetRole] || null;
      const notifTargetRole = ROLE_TO_NOTIF[announcement.targetRole] || null;
      const actionLink = ROLE_TO_LINK[notifTargetRole] || "/";

      const whereClause = {
        isActive: true,
        ...(roleEnum && {
          role: { name: roleEnum },
        }),
      };

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) {
        console.warn("[NOTIFICATION] notifyAnnouncement: No matching users found for targetRole:", announcement.targetRole);
        return 0;
      }

      const snippet = announcement.message.length > 200
        ? announcement.message.slice(0, 200) + "…"
        : announcement.message;

      return this.broadcastNotification(
        userIds,
        announcement.title,
        snippet,
        "CMS_ALERT",
        {
          announcementId: announcement.id,
          priority: announcement.priority,
          type: announcement.type,
          link: actionLink,
        },
        notifTargetRole,
        announcement.priority === "high" ? "high" : "normal"
      );
    } catch (error) {
      logger.error("Failed to broadcast announcement notification", {
        announcementId: announcement.id,
        error: error.message,
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  PHARMACY-TARGETED TRIGGERS
  // ═══════════════════════════════════════════════════════

  /**
   * NEW_SOS_ALERT — Radius-based: notify pharmacies within 50km of the patient
   * @param {object} sosRequest - { id, patientName, medicineName, address, latitude, longitude }
   * @returns {Promise<number>} Count of notifications sent
   */
  async notifyNearbyPharmacies(sosRequest) {
    try {
      const SOS_RADIUS_KM = 50;

      logger.info("[BROADCAST] Starting pharmacy discovery", {
        sosId: sosRequest.id,
        hasCoords: sosRequest.latitude != null && sosRequest.longitude != null,
        radiusKm: SOS_RADIUS_KM,
      });

      // If patient has no coordinates, fall back to all VERIFIED pharmacies
      if (sosRequest.latitude == null || sosRequest.longitude == null) {
        const pharmacyUsers = await prisma.pharmacy.findMany({
          where: { verificationStatus: "VERIFIED" },
          select: { userId: true },
        });
        const userIds = pharmacyUsers.map((p) => p.userId);
        if (userIds.length === 0) return 0;

        return this.broadcastNotification(
          userIds,
          "🚨 NEW EMERGENCY SOS",
          `${sosRequest.patientName} needs ${sosRequest.medicineName} nearby.`,
          "SOS_ALERT",
          {
            sosId: sosRequest.id,
            medicineName: sosRequest.medicineName,
            patientName: sosRequest.patientName,
            address: sosRequest.address,
            link: "/pharmacy/sos-requests",
          },
          "PHARMACY",
          "high"
        );
      }

      // Find VERIFIED pharmacies with coordinates
      const pharmacies = await prisma.pharmacy.findMany({
        where: {
          verificationStatus: "VERIFIED",
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { id: true, userId: true, latitude: true, longitude: true },
      });

      // Filter by distance
      const nearbyUserIds = pharmacies
        .filter((p) => {
          try {
            const dist = calculateDistance(
              sosRequest.latitude,
              sosRequest.longitude,
              p.latitude,
              p.longitude
            );
            return dist <= SOS_RADIUS_KM;
          } catch {
            return false;
          }
        })
        .map((p) => p.userId);

      logger.info(`[BROADCAST] Radius filter result: ${nearbyUserIds.length}/${pharmacies.length} pharmacies within ${SOS_RADIUS_KM}km`, {
        sosId: sosRequest.id,
        total: pharmacies.length,
        withinRadius: nearbyUserIds.length,
      });

      // Fallback: if no pharmacies within radius, notify ALL approved pharmacies
      let targetUserIds = nearbyUserIds;
      if (targetUserIds.length === 0) {
        console.log("[NOTIFICATION SERVICE] No pharmacies within radius — falling back to ALL approved pharmacies", {
          sosId: sosRequest.id,
          radius: SOS_RADIUS_KM,
        });
        targetUserIds = pharmacies.map((p) => p.userId);
      }

      if (targetUserIds.length === 0) return 0;

      return this.broadcastNotification(
        targetUserIds,
        "🚨 NEW EMERGENCY SOS",
        `${sosRequest.patientName} needs ${sosRequest.medicineName} nearby.`,
        "SOS_ALERT",
        {
          sosId: sosRequest.id,
          medicineName: sosRequest.medicineName,
          patientName: sosRequest.patientName,
          address: sosRequest.address,
          link: "/pharmacy/sos-requests",
        },
        "PHARMACY",
        "high"
      );
    } catch (error) {
      logger.error("Failed to notify pharmacies about SOS", {
        sosId: sosRequest?.id,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * SOS_CLAIMED_BY_OTHER — Notify other pharmacies that an SOS was fulfilled
   * Also auto-marks the original SOS notifications as read for those pharmacies
   * 
   * @param {string} sosId - SOS request ID
   * @param {string} acceptedByPharmacyId - Pharmacy ID that accepted
   * @param {string} acceptedByPharmacyName - Name of accepting pharmacy
   * @param {string} medicineName - Medicine name
   */
  async notifySosClaimedByOther(sosId, acceptedByPharmacyId, acceptedByPharmacyName, medicineName) {
    try {
      // Find all other VERIFIED pharmacies (exclude the one that accepted)
      const otherPharmacies = await prisma.pharmacy.findMany({
        where: {
          verificationStatus: "VERIFIED",
          id: { not: acceptedByPharmacyId },
        },
        select: { userId: true },
      });

      const userIds = otherPharmacies.map((p) => p.userId);
      if (userIds.length === 0) return 0;

      // Auto-mark old SOS notifications for this sosId as read
      await prisma.notification.updateMany({
        where: {
          userId: { in: userIds },
          metadata: { path: ["sosId"], equals: sosId },
          isRead: false,
        },
        data: { isRead: true },
      });

      return this.broadcastNotification(
        userIds,
        `SOS Fulfilled: ${medicineName}`,
        `The SOS request for ${medicineName} has been fulfilled by ${acceptedByPharmacyName}. No action needed.`,
        "SOS_UPDATE",
        {
          sosId,
          medicineName,
          fulfilledBy: acceptedByPharmacyName,
          link: "/pharmacy/sos",
        },
        "PHARMACY",
        "normal"
      );
    } catch (error) {
      logger.error("Failed to notify SOS claimed by other", {
        sosId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * LOW_STOCK_WARNING — Triggered after inventory update when quantity < 10
   * Prevents duplicate alerts: checks if an unread low-stock notification
   * already exists for this item before creating a new one.
   *
   * @param {string} userId - Pharmacy owner userId
   * @param {object} item - { id, name, genericName, quantity }
   */
  async notifyLowStock(userId, item) {
    try {
      // Deduplicate: don't spam if an unread one already exists for this item
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "LOW_STOCK_WARNING",
          isRead: false,
          metadata: { path: ["inventoryId"], equals: item.id },
        },
      });
      if (existing) return existing;

      return this.createNotification(
        userId,
        `⚠️ Low Stock: ${item.name}`,
        `${item.name} (${item.genericName}) is running low with only ${item.quantity} unit${item.quantity !== 1 ? "s" : ""} left. Restock soon to avoid shortages.`,
        "LOW_STOCK_WARNING",
        {
          inventoryId: item.id,
          medicineName: item.name,
          genericName: item.genericName,
          quantity: item.quantity,
          link: "/pharmacy/inventory",
        },
        "PHARMACY",
        "normal"
      );
    } catch (error) {
      logger.error("Failed to send low stock notification", {
        userId,
        itemId: item?.id,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * EXPIRY_WARNING — Triggered when a medicine is within 30 days of expiry
   * Called after add/update. Deduplicates per inventory item.
   *
   * @param {string} userId - Pharmacy owner userId
   * @param {object} item - { id, name, genericName, expiryDate }
   */
  async notifyExpiringSoon(userId, item) {
    try {
      const daysLeft = Math.ceil(
        (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft > 30 || daysLeft < 0) return null;

      // Deduplicate
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "EXPIRY_WARNING",
          isRead: false,
          metadata: { path: ["inventoryId"], equals: item.id },
        },
      });
      if (existing) return existing;

      return this.createNotification(
        userId,
        `⏰ Expiring Soon: ${item.name}`,
        `${item.name} (${item.genericName}) expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Consider discounting or removing it from stock.`,
        "EXPIRY_WARNING",
        {
          inventoryId: item.id,
          medicineName: item.name,
          genericName: item.genericName,
          expiryDate: item.expiryDate,
          daysLeft,
          link: "/pharmacy/inventory",
        },
        "PHARMACY",
        daysLeft <= 7 ? "high" : "normal"
      );
    } catch (error) {
      logger.error("Failed to send expiry notification", {
        userId,
        itemId: item?.id,
        error: error.message,
      });
      return null;
    }
  }
}

export default new NotificationService();
