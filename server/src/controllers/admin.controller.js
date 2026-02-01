/**
 * Admin Controller - System Admin pharmacy verification operations
 * Uses existing Pharmacy table fields (verificationStatus, verifiedBy, verifiedAt)
 * NO schema changes required
 */

import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";

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
    if (status) {
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

    // Include license document URL in response for admin review
    res.status(200).json({
      success: true,
      data: {
        ...pharmacy,
        licenseDocumentUrl: pharmacy.licenseDocument, // Cloudinary URL
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

    res.status(200).json({
      success: true,
      message: "Pharmacy rejected",
      data: updatedPharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPendingPharmacies,
  getAllPharmacies,
  getPharmacyById,
  approvePharmacy,
  rejectPharmacy,
};
