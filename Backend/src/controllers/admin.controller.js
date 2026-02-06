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
};
