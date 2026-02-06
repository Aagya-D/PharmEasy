/**
 * Admin Controller - System Admin pharmacy verification operations
 * Uses existing Pharmacy table fields (verificationStatus, verifiedBy, verifiedAt)
 * NO schema changes required
 */

import bcrypt from "bcrypt";
import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { createLog, getLogs as getActivityLogs, LOG_ACTIONS } from "../utils/activityLogger.js";

/**
 * GET /api/admin/pharmacies/pending
 * Get all pharmacies awaiting verification (with license document URLs)
 */
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

    // Map pharmacies to include license document URL for admin review
    const pharmaciesWithDocuments = pharmacies.map((pharmacy) => ({
      ...pharmacy,
      licenseDocumentUrl: pharmacy.licenseDocument, // Cloudinary URL for viewing/download
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

/**
 * GET /api/admin/pharmacies
 * Get all pharmacies (with optional status filter)
 */
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

    // Include license document URLs for admin review
    const pharmaciesWithDocuments = pharmacies.map((pharmacy) => ({
      ...pharmacy,
      licenseDocumentUrl: pharmacy.licenseDocument, // Cloudinary URL
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

/**
 * GET /api/admin/pharmacy/:id
 * Get specific pharmacy details
 */
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

    // Return pharmacy with license document URL
    res.status(200).json({
      success: true,
      data: {
        ...pharmacy,
        // Ensure both fields are available for backward compatibility
        licenseDocumentUrl: pharmacy.licenseDocument,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/pharmacy/:id/approve
 * Approve pharmacy - updates existing verificationStatus field
 */
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

    // Security: System Admin (roleId=1) should NEVER have a pharmacy
    // This prevents admin from creating pharmacy accounts and self-approving
    if (pharmacy.user.roleId === 1) {
      throw new AppError(
        "System Admin accounts cannot register pharmacies",
        403
      );
    }

    // Prevent admin from approving their own pharmacy
    if (pharmacy.userId === adminUserId) {
      throw new AppError("Cannot approve your own pharmacy", 403);
    }

    if (pharmacy.verificationStatus === "VERIFIED") {
      throw new AppError("Pharmacy is already verified", 400);
    }

    // Prevent re-upload after admin decision
    // Once admin reviews, the license document is locked
    if (pharmacy.verificationStatus === "REJECTED") {
      throw new AppError(
        "Cannot approve a rejected pharmacy. Contact system administrator for reset.",
        400
      );
    }

    // Update pharmacy verification status using existing fields
    const updatedPharmacy = await prisma.pharmacy.update({
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
    });

    console.log(
      `[ADMIN] Pharmacy ${id} approved by admin ${adminUserId}`
    );

    // Log activity
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

/**
 * PATCH /api/admin/pharmacy/:id/reject
 * Reject pharmacy - updates existing verificationStatus field
 */
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

    // Security: System Admin (roleId=1) should NEVER have a pharmacy
    if (pharmacy.user.roleId === 1) {
      throw new AppError(
        "System Admin accounts cannot register pharmacies",
        403
      );
    }

    // Prevent admin from rejecting their own pharmacy
    if (pharmacy.userId === adminUserId) {
      throw new AppError("Cannot reject your own pharmacy", 403);
    }

    if (pharmacy.verificationStatus === "REJECTED") {
      throw new AppError("Pharmacy is already rejected", 400);
    }

    // Update pharmacy verification status using existing fields
    const updatedPharmacy = await prisma.pharmacy.update({
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
    });

    console.log(
      `[ADMIN] Pharmacy ${id} rejected by admin ${adminUserId}: ${reason}`
    );

    // Log activity
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

/**
 * PATCH /api/admin/profile
 * Update admin profile (name, email, phone)
 * Security: Only the logged-in admin can update their own profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId; // From JWT token
    const { name, email, phone } = req.body;

    // Validate at least one field is provided
    if (!name && !email && !phone) {
      throw new AppError("At least one field (name, email, or phone) must be provided", 400);
    }

    // If email is being changed, check if it's already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new AppError("Email is already registered to another account", 409);
      }
    }

    // Build update data object
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone) updateData.phone = phone.trim();

    // Update user profile
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

    // Log activity
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

/**
 * PATCH /api/admin/change-password
 * Change password with current password verification
 * Security:
 * - Requires current password verification
 * - Hashes new password before saving
 * - Updates updatedAt timestamp for audit trail
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId; // From JWT token
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new AppError("New password must be at least 8 characters long", 400);
    }

    // Get user with password
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

    // Verify current password using bcrypt
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AppError("The current password you entered is incorrect.", 400);
    }

    // Check that new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError("New password must be different from current password", 400);
    }

    // Hash new password with salt rounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        // updatedAt is automatically updated by Prisma @updatedAt
      },
    });

    console.log(`[ADMIN] Password changed for user ${userId} (${user.email})`);

    // Log activity
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

/**
 * GET /api/admin/users
 * Get all users with filtering options
 * Query params:
 * - role: Filter by roleId (1=Admin, 2=Pharmacy, 3=Patient)
 * - search: Search by name or email
 * - status: Filter by user status (APPROVED, PENDING, REJECTED, etc.)
 * Requires: JWT + roleId=1
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, status } = req.query;

    // Build where clause for filtering
    const where = {};

    // Filter by role
    if (role && !isNaN(parseInt(role))) {
      where.roleId = parseInt(role);
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Search by name or email
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Fetch users with role information, excluding password
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

/**
 * GET /api/admin/logs
 * Get activity logs with filtering and pagination
 * Query params:
 * - category: Filter by log category (AUTH, PHARMACY, SYSTEM, USER, INVENTORY, ORDER)
 * - userId: Filter by user ID
 * - action: Filter by action type
 * - skip: Pagination skip (default: 0)
 * - take: Pagination take (default: 50)
 * Requires: JWT + roleId=1
 */
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

    // Always return 200 with the result, even if logs array is empty
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching logs:", error);
    // Return empty result on error instead of crashing
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

/**
 * GET /api/admin/sos-locations
 * Get all SOS emergency locations from patients
 */
export const getSOSLocations = async (req, res, next) => {
  try {
    // Fetch SOS requests with patient information
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
      take: 100, // Limit to recent 100 requests
    });

    // Format data for map display
    const locations = sosRequests.map((sos) => ({
      id: sos.id,
      latitude: sos.latitude,
      longitude: sos.longitude,
      status: sos.status,
      patientName: sos.patient?.name || "Unknown",
      patientPhone: sos.patient?.phone || "N/A",
      urgencyLevel: sos.urgencyLevel || "MEDIUM",
      createdAt: sos.createdAt,
      message: sos.message || "",
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

/**
 * GET /api/admin/inventory/insights
 * Get inventory insights across all pharmacies
 */
export const getInventoryInsights = async (req, res, next) => {
  try {
    // Fetch all inventory items with pharmacy information
    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            contactPhone: true,
          },
        },
      },
    });

    // Calculate insights
    const lowStockItems = inventoryItems.filter(
      (item) => item.quantity <= item.reorderLevel
    );

    const outOfStockItems = inventoryItems.filter(
      (item) => item.quantity === 0
    );

    // Group by medicine for shortage analysis
    const medicineMap = new Map();
    lowStockItems.forEach((item) => {
      if (!medicineMap.has(item.medicineName)) {
        medicineMap.set(item.medicineName, {
          medicineName: item.medicineName,
          totalStock: 0,
          pharmaciesAffected: [],
          severity: "LOW",
        });
      }
      const medicine = medicineMap.get(item.medicineName);
      medicine.totalStock += item.quantity;
      medicine.pharmaciesAffected.push({
        pharmacyId: item.pharmacy.id,
        pharmacyName: item.pharmacy.pharmacyName,
        currentStock: item.quantity,
        reorderLevel: item.reorderLevel,
      });
    });

    const shortages = Array.from(medicineMap.values()).map((medicine) => {
      // Determine severity
      const avgStock =
        medicine.totalStock / medicine.pharmaciesAffected.length;
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
    console.error("[ADMIN] Error fetching inventory insights:", error);
    next(error);
  }
};

/**
 * POST /api/admin/inventory/restock-alert
 * Send restock alert to pharmacies
 */
export const sendRestockAlert = async (req, res, next) => {
  try {
    const { genericName, message } = req.body;

    if (!genericName || !message) {
      throw new AppError("Generic name and message are required", 400);
    }

    // Find affected pharmacies (low stock on this medicine)
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

    // Log the alert
    await createLog(
      req.user.id,
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

/**
 * GET /api/admin/health-tips
 * Get all health tips
 */
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

/**
 * POST /api/admin/health-tips
 * Create a new health tip
 */
export const createHealthTip = async (req, res, next) => {
  try {
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
        createdBy: req.user.id,
      },
    });

    // Log activity
    await createLog(
      req.user.id,
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

/**
 * PATCH /api/admin/health-tips/:id
 * Update a health tip
 */
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

    // Log activity
    await createLog(
      req.user.id,
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

/**
 * DELETE /api/admin/health-tips/:id
 * Delete a health tip
 */
export const deleteHealthTip = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.healthTip.delete({
      where: { id },
    });

    // Log activity
    await createLog(
      req.user.id,
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

/**
 * GET /api/admin/announcements
 * Get all announcements
 */
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

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
export const createAnnouncement = async (req, res, next) => {
  try {
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
        createdBy: req.user.id,
      },
    });

    // Log activity
    await createLog(
      req.user.id,
      LOG_ACTIONS.CONTENT_CREATED,
      "ANNOUNCEMENT",
      announcement.id,
      `Created announcement: ${title}`
    );

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

/**
 * PATCH /api/admin/announcements/:id
 * Update an announcement
 */
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

    // Log activity
    await createLog(
      req.user.id,
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

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement
 */
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id },
    });

    // Log activity
    await createLog(
      req.user.id,
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
