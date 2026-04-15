// Admin controller for pharmacy review, user management, content, and audit tools.

import bcrypt from "bcrypt";
import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { createLog, getLogs as getActivityLogs, LOG_ACTIONS } from "../utils/activityLogger.js";
import notificationService from "../modules/notifications/notification.service.js";

// Return the pharmacies that still need review.
export const getPendingPharmacies = async (req, res, next) => {
  try {
    const pharmacies = await prisma.pharmacy.findMany({
      where: {
        verificationStatus: "PENDING_VERIFICATION",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Keep the document URL under a clearer field name for the admin UI.
    const pharmaciesWithDocuments = pharmacies.map((pharmacy) => ({
      ...pharmacy,
      licenseDocumentUrl: pharmacy.licenseDocument,
    }));

    res.status(200).json({
      success: true,
      count: pharmaciesWithDocuments.length,
      data: pharmaciesWithDocuments,
    });
  } catch (error) {
    next(error);
  }
};

// Return all pharmacies, optionally filtered by verification status.
export const getAllPharmacies = async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status && status !== "ALL") {
      where.verificationStatus = status;
    }

    const pharmacies = await prisma.pharmacy.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Keep the document URL in the admin response for review screens.
    const pharmaciesWithDocuments = pharmacies.map((pharmacy) => ({
      ...pharmacy,
      licenseDocumentUrl: pharmacy.licenseDocument,
    }));

    res.status(200).json({
      success: true,
      count: pharmaciesWithDocuments.length,
      data: pharmaciesWithDocuments,
    });
  } catch (error) {
    next(error);
  }
};

// Return one pharmacy with the user details attached.
export const getPharmacyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            roleId: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!pharmacy) {
      throw new AppError("Pharmacy not found", 404);
    }

    // Keep both field names so older frontend code still works.
    res.status(200).json({
      success: true,
      data: {
        ...pharmacy,
        licenseDocumentUrl: pharmacy.licenseDocument,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve a pharmacy and activate the related user account.
export const approvePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!pharmacy) {
      throw new AppError("Pharmacy not found", 404);
    }

    // System admin accounts should not own pharmacy records.
    if (pharmacy.user.roleId === 1) {
      throw new AppError(
        "System Admin accounts cannot register pharmacies",
        403
      );
    }

    // The reviewer cannot approve their own pharmacy.
    if (pharmacy.userId === adminUserId) {
      throw new AppError("Cannot approve your own pharmacy", 403);
    }

    if (pharmacy.verificationStatus === "VERIFIED") {
      throw new AppError("Pharmacy is already verified", 400);
    }

    // Rejected applications stay locked until an admin resets them.
    if (pharmacy.verificationStatus === "REJECTED") {
      throw new AppError(
        "Cannot approve a rejected pharmacy. Contact system administrator for reset.",
        400
      );
    }

    // Update the pharmacy and user account together so they stay in sync.
    const [updatedPharmacy] = await prisma.$transaction([
      prisma.pharmacy.update({
        where: { id },
        data: {
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: adminUserId,
          rejectionReason: null,
          rejectedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: pharmacy.userId },
        data: { status: "APPROVED" },
      }),
    ]);

    console.log(
      `[ADMIN] Pharmacy ${id} approved by admin ${adminUserId} - User ${pharmacy.userId} status set to APPROVED`
    );

    // Record the approval in the audit trail.
    await createLog(
      adminUserId,
      LOG_ACTIONS.PHARMACY_APPROVED,
      `Pharmacy "${updatedPharmacy.pharmacyName}" (License: ${updatedPharmacy.licenseNumber}) approved by admin ${updatedPharmacy.user.name}`,
      "PHARMACY",
      {
        pharmacyId: id,
        pharmacyName: updatedPharmacy.pharmacyName,
        licenseNumber: updatedPharmacy.licenseNumber,
        userId: updatedPharmacy.userId,
      }
    );

    res.status(200).json({
      success: true,
      message: "Pharmacy approved successfully",
      data: updatedPharmacy,
    });
  } catch (error) {
    next(error);
  }
};

// Reject a pharmacy and store the reason for the decision.
export const rejectPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = req.user.userId;

    if (!reason || reason.trim().length === 0) {
      throw new AppError("Rejection reason is required", 400);
    }

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!pharmacy) {
      throw new AppError("Pharmacy not found", 404);
    }

    // System admin accounts should not have pharmacy records.
    if (pharmacy.user.roleId === 1) {
      throw new AppError(
        "System Admin accounts cannot register pharmacies",
        403
      );
    }

    // Prevent admins from rejecting their own pharmacy.
    if (pharmacy.userId === adminUserId) {
      throw new AppError("Cannot reject your own pharmacy", 403);
    }

    if (pharmacy.verificationStatus === "REJECTED") {
      throw new AppError("Pharmacy is already rejected", 400);
    }

    // Update the pharmacy and user account together in one transaction.
    const [updatedPharmacy] = await prisma.$transaction([
      prisma.pharmacy.update({
        where: { id },
        data: {
          verificationStatus: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: reason.trim(),
          verifiedAt: null,
          verifiedBy: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: pharmacy.userId },
        data: { status: "REJECTED" },
      }),
    ]);

    console.log(
      `[ADMIN] Pharmacy ${id} rejected by admin ${adminUserId}: ${reason} - User ${pharmacy.userId} status set to REJECTED`
    );

    // Record the rejection in the audit trail.
    await createLog(
      adminUserId,
      LOG_ACTIONS.PHARMACY_REJECTED,
      `Pharmacy "${updatedPharmacy.pharmacyName}" rejected by admin ${updatedPharmacy.user.name}. Reason: ${reason}`,
      "PHARMACY",
      {
        pharmacyId: id,
        pharmacyName: updatedPharmacy.pharmacyName,
        licenseNumber: updatedPharmacy.licenseNumber,
        userId: updatedPharmacy.userId,
        rejectionReason: reason,
      }
    );

    res.status(200).json({
      success: true,
      message: "Pharmacy rejected",
      data: updatedPharmacy,
    });
  } catch (error) {
    next(error);
  }
};

// Update the logged-in admin profile.
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, email, phone } = req.body;

    // Require at least one field.
    if (!name && !email && !phone) {
      throw new AppError("At least one field (name, email, or phone) must be provided", 400);
    }

    // Check that the new email is not already in use.
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new AppError("Email is already registered to another account", 409);
      }
    }

    // Build the update payload.
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone) updateData.phone = phone.trim();

    // Save the profile changes.
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roleId: true,
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
        updatedAt: true,
      },
    });

    console.log(`[ADMIN] Profile updated for user ${userId}`);

    // Record the profile update in the audit trail.
    await createLog(
      userId,
      LOG_ACTIONS.PROFILE_UPDATED,
      `Admin ${updatedUser.name} updated their profile`,
      "SYSTEM",
      {
        updatedFields: Object.keys(updateData),
        email: updatedUser.email,
      }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          roleId: updatedUser.roleId,
          role: updatedUser.role.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Change the admin password after verifying the current one.
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Require both passwords.
    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    // Keep the new password at a reasonable length.
    if (newPassword.length < 8) {
      throw new AppError("New password must be at least 8 characters long", 400);
    }

    // Load the stored password hash.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify the current password before changing anything.
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AppError("The current password you entered is incorrect.", 400);
    }

    // Prevent reusing the current password.
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError("New password must be different from current password", 400);
    }

    // Hash the new password before saving it.
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Save the new password hash.
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        // updatedAt is automatically updated by Prisma @updatedAt
      },
    });

    console.log(`[ADMIN] Password changed for user ${userId} (${user.email})`);

    // Record the password change in the audit trail.
    await createLog(
      userId,
      LOG_ACTIONS.PASSWORD_CHANGED,
      `Admin ${user.name} changed their password`,
      "SYSTEM",
      {
        email: user.email,
        timestamp: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Return users with optional filters.
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, status } = req.query;

    // Build the filter query.
    const where = {};

    // Filter by role.
    if (role && !isNaN(parseInt(role))) {
      where.roleId = parseInt(role);
    }

    // Filter by status.
    if (status) {
      where.status = status;
    }

    // Search by name or email.
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Fetch users without the password field.
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roleId: true,
        status: true,
        isVerified: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[ADMIN] Fetched ${users.length} users with filters:`, { role, search, status });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Return activity logs with filters and pagination.
export const getLogs = async (req, res, next) => {
  try {
    const { category, userId, action, skip = 0, take = 50 } = req.query;

    const filters = {
      category,
      userId,
      action,
      skip: parseInt(skip) || 0,
      take: parseInt(take) || 50,
    };

    const result = await getActivityLogs(filters);

    console.log(`[ADMIN] Fetched ${result.logs.length} logs (page ${result.page}/${result.totalPages})`);

    // Return a normal response even when there are no logs.
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching logs:", error);
    // Return an empty result on error instead of crashing.
    res.status(200).json({
      success: true,
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: parseInt(req.query.take) || 50,
      totalPages: 0,
    });
  }
};

// Return the latest SOS locations for the admin map.
export const getSOSLocations = async (req, res, next) => {
  try {
    // Load SOS requests with patient details.
    const sosRequests = await prisma.sOSRequest.findMany({
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    // Shape the data for the map view.
    const locations = sosRequests.map((sos) => ({
      id: sos.id,
      latitude: sos.latitude,
      longitude: sos.longitude,
      medicineName: sos.medicineName,
      genericName: sos.genericName,
      quantity: sos.quantity,
      urgencyLevel: sos.urgencyLevel,
      patientName: sos.patientName,
      contactNumber: sos.contactNumber,
      address: sos.address,
      additionalNotes: sos.additionalNotes,
      prescriptionRequired: sos.prescriptionRequired,
      prescriptionUrl: sos.prescriptionUrl,
      status: sos.status,
      patient: {
        id: sos.patient?.id,
        name: sos.patient?.name,
        email: sos.patient?.email,
        phone: sos.patient?.phone
      },
      createdAt: sos.createdAt,
      updatedAt: sos.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching SOS locations:", error);
    next(error);
  }
};

// Return inventory insights across all pharmacies.
export const getInventoryInsights = async (req, res, next) => {
  const startTime = Date.now();
  try {
    // Load inventory items with pharmacy details.
    const inventoryItems = await prisma.inventory.findMany({
      include: {
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            contactNumber: true,
          },
        },
      },
    });

    // Use a fixed low-stock threshold because the model has no reorder level.
    const LOW_STOCK_THRESHOLD = 10;

    const lowStockItems = inventoryItems.filter(
      (item) => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD
    );

    const outOfStockItems = inventoryItems.filter(
      (item) => item.quantity === 0
    );

    // Group by generic name for shortage analysis.
    const medicineMap = new Map();
    [...lowStockItems, ...outOfStockItems].forEach((item) => {
      const key = item.genericName;
      if (!medicineMap.has(key)) {
        medicineMap.set(key, {
          genericName: item.genericName,
          medicineName: item.name,
          totalStock: 0,
          outOfStockCount: 0,
          pharmaciesAffected: [],
          severity: "LOW",
        });
      }
      const medicine = medicineMap.get(key);
      medicine.totalStock += item.quantity || 0;
      if (item.quantity === 0) medicine.outOfStockCount += 1;
      medicine.pharmaciesAffected.push({
        pharmacyId: item.pharmacy.id,
        pharmacyName: item.pharmacy.pharmacyName,
        currentStock: item.quantity,
      });
    });

    const shortages = Array.from(medicineMap.values()).map((medicine) => {
      // Safe aggregation for empty pharmacy lists.
      const total = medicine.pharmaciesAffected.length > 0
        ? medicine.totalStock / medicine.pharmaciesAffected.length
        : 0;
      const avgStock = total || 0;
      medicine.severity =
        avgStock === 0 ? "CRITICAL" : avgStock < 10 ? "HIGH" : "MEDIUM";
      return medicine;
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems: inventoryItems.length,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        shortages: shortages.sort((a, b) => {
          const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
      },
    });
  } catch (error) {
    console.error("[INSIGHTS ERROR]", error.message, error.stack);
    next(error);
  }
};

// Send a restock alert to pharmacies.
export const sendRestockAlert = async (req, res, next) => {
  try {
    const { genericName, message } = req.body;

    if (!genericName || !message) {
      throw new AppError("Generic name and message are required", 400);
    }

    // Find pharmacies affected by low stock.
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        medicineName: {
          contains: genericName,
          mode: "insensitive",
        },
        quantity: {
          lte: prisma.inventoryItem.fields.reorderLevel,
        },
      },
      include: {
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
      },
    });

    // Record the alert in the audit trail.
    await createLog(
      req.user.userId,
      "INVENTORY_ALERT_SENT",
      "INVENTORY",
      null,
      `Sent restock alert for ${genericName} to ${lowStockItems.length} pharmacies`
    );

    res.status(200).json({
      success: true,
      message: "Restock alert sent successfully",
      data: {
        pharmaciesNotified: lowStockItems.length,
        affectedPharmacies: lowStockItems.map((item) => ({
          pharmacyId: item.pharmacy.id,
          pharmacyName: item.pharmacy.pharmacyName,
          currentStock: item.quantity,
        })),
      },
    });
  } catch (error) {
    console.error("[ADMIN] Error sending restock alert:", error);
    next(error);
  }
};

// Return all health tips.
export const getHealthTips = async (req, res, next) => {
  try {
    const healthTips = await prisma.healthTip.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: healthTips.length,
      data: healthTips,
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching health tips:", error);
    next(error);
  }
};

// Create a new health tip.
export const createHealthTip = async (req, res, next) => {
  try {
    // Require admin authentication.
    if (!req.user || !req.user.userId) {
      throw new AppError("Unauthorized: Admin authentication required", 401);
    }

    const { title, content, category, imageUrl, isActive } = req.body;

    if (!title || !content || !category) {
      throw new AppError("Title, content, and category are required", 400);
    }

    const healthTip = await prisma.healthTip.create({
      data: {
        title,
        content,
        category,
        imageUrl,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.userId,
      },
    });

    // Record the creation in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_CREATED,
      "HEALTH_TIP",
      healthTip.id,
      `Created health tip: ${title}`
    );

    res.status(201).json({
      success: true,
      message: "Health tip created successfully",
      data: healthTip,
    });
  } catch (error) {
    console.error("[ADMIN] Error creating health tip:", error);
    next(error);
  }
};

// Update a health tip.
export const updateHealthTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, imageUrl, isActive } = req.body;

    const healthTip = await prisma.healthTip.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Record the update in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_UPDATED,
      "HEALTH_TIP",
      healthTip.id,
      `Updated health tip: ${healthTip.title}`
    );

    res.status(200).json({
      success: true,
      message: "Health tip updated successfully",
      data: healthTip,
    });
  } catch (error) {
    console.error("[ADMIN] Error updating health tip:", error);
    next(error);
  }
};

// Delete a health tip.
export const deleteHealthTip = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.healthTip.delete({
      where: { id },
    });

    // Record the deletion in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_DELETED,
      "HEALTH_TIP",
      id,
      `Deleted health tip #${id}`
    );

    res.status(200).json({
      success: true,
      message: "Health tip deleted successfully",
    });
  } catch (error) {
    console.error("[ADMIN] Error deleting health tip:", error);
    next(error);
  }
};

// Return all announcements.
export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching announcements:", error);
    next(error);
  }
};

// Create a new announcement.
export const createAnnouncement = async (req, res, next) => {
  try {
    // Require admin authentication.
    if (!req.user || !req.user.userId) {
      throw new AppError("Unauthorized: Admin authentication required", 401);
    }

    const {
      title,
      message,
      type,
      priority,
      targetRole,
      publishDate,
      expiryDate,
      isActive,
    } = req.body;

    if (!title || !message) {
      throw new AppError("Title and message are required", 400);
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || "info",
        priority: priority || "normal",
        targetRole,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.userId,
      },
    });

    // Record the creation in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_CREATED,
      "ANNOUNCEMENT",
      announcement.id,
      `Created announcement: ${title}`
    );

    // Send the notification, but do not block creation if it fails.
    try {
      const notificationCount = await notificationService.notifyAnnouncement(announcement);
      console.log(`[ADMIN] Announcement broadcast to ${notificationCount} users`);
    } catch (notificationError) {
      console.error("[ADMIN] Failed to broadcast notification:", notificationError);
      // Continue despite notification failure - don't block announcement creation
    }

    // Push the announcement to connected clients.
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("ADMIN_BROADCAST", {
          type: "ADMIN_BROADCAST",
          announcementId: announcement.id,
          title: announcement.title,
          message: announcement.message,
          priority: announcement.priority,
          targetRole: announcement.targetRole,
          createdAt: announcement.publishDate,
        });
        console.log(`[ADMIN] Socket.IO ADMIN_BROADCAST emitted for announcement ${announcement.id}`);
      }
    } catch (socketError) {
      console.error("[ADMIN] Failed to emit ADMIN_BROADCAST socket event:", socketError);
    }

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("[ADMIN] Error creating announcement:", error);
    next(error);
  }
};

// Update an announcement.
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      type,
      priority,
      targetRole,
      publishDate,
      expiryDate,
      isActive,
    } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(message && { message }),
        ...(type && { type }),
        ...(priority && { priority }),
        ...(targetRole !== undefined && { targetRole }),
        ...(publishDate && { publishDate: new Date(publishDate) }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Record the update in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_UPDATED,
      "ANNOUNCEMENT",
      announcement.id,
      `Updated announcement: ${announcement.title}`
    );

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("[ADMIN] Error updating announcement:", error);
    next(error);
  }
};

// Delete an announcement.
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id },
    });

    // Record the deletion in the audit trail.
    await createLog(
      req.user.userId,
      LOG_ACTIONS.CONTENT_DELETED,
      "ANNOUNCEMENT",
      id,
      `Deleted announcement #${id}`
    );

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("[ADMIN] Error deleting announcement:", error);
    next(error);
  }
};

export default {
  getPendingPharmacies,
  getAllPharmacies,
  getPharmacyById,
  approvePharmacy,
  rejectPharmacy,
  updateProfile,
  changePassword,
  getAllUsers,
  getLogs,
  getSOSLocations,
  getInventoryInsights,
  sendRestockAlert,
  getHealthTips,
  createHealthTip,
  updateHealthTip,
  deleteHealthTip,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
