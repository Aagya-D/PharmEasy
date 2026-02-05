/**
 * Pharmacy Service - Business logic for pharmacy onboarding and verification
 * Handles the two-step pharmacy registration process
 * 
 * Flow:
 * 1. Authenticated user (roleId=2) submits pharmacy details
 * 2. Pharmacy record created with PENDING_VERIFICATION status
 * 3. SystemAdmin reviews and approves/rejects
 * 4. Only VERIFIED pharmacies can access protected features
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

/**
 * Submit pharmacy onboarding details
 * User must be authenticated with roleId=2 (PHARMACY_ADMIN)
 * One user can only register one pharmacy
 */
export const submitPharmacyOnboarding = async (userId, pharmacyData) => {
  const {
    pharmacyName,
    address,
    latitude: rawLatitude,
    longitude: rawLongitude,
    licenseNumber,
    licenseDocument,
    contactNumber,
  } = pharmacyData;

  // Validate required fields
  if (!pharmacyName || !address || !licenseNumber || !contactNumber) {
    throw new AppError("Missing required pharmacy details", 400);
  }

  // Convert latitude/longitude from string to Float (HTML forms send strings)
  let latitude = null;
  let longitude = null;

  if (rawLatitude !== undefined && rawLatitude !== null && rawLatitude !== "") {
    latitude = parseFloat(rawLatitude);
    if (isNaN(latitude)) {
      throw new AppError("Invalid latitude value. Must be a valid number.", 400);
    }
    if (latitude < -90 || latitude > 90) {
      throw new AppError("Latitude must be between -90 and 90", 400);
    }
  }

  if (rawLongitude !== undefined && rawLongitude !== null && rawLongitude !== "") {
    longitude = parseFloat(rawLongitude);
    if (isNaN(longitude)) {
      throw new AppError("Invalid longitude value. Must be a valid number.", 400);
    }
    if (longitude < -180 || longitude > 180) {
      throw new AppError("Longitude must be between -180 and 180", 400);
    }
  }

  // Check if user exists and has correct role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.roleId !== 2) {
    throw new AppError("Only Pharmacy Admin users can register a pharmacy", 403);
  }

  // Security: Prevent System Admin (roleId=1) from registering pharmacies
  // This should never happen due to role check above, but defense-in-depth
  if (user.roleId === 1) {
    throw new AppError(
      "System Admin accounts cannot register pharmacies. This action is blocked.",
      403
    );
  }

  // Check if user already has a pharmacy registered
  const existingPharmacy = await prisma.pharmacy.findUnique({
    where: { userId },
  });

  if (existingPharmacy) {
    // If rejected, they need admin to reset their status
    // Cannot re-upload documents after admin decision
    if (existingPharmacy.verificationStatus === "REJECTED") {
      throw new AppError(
        "Your pharmacy registration was rejected. Please contact support for assistance.",
        403
      );
    }
    // If pending or verified, they cannot register again
    // Prevents duplicate submissions and document re-uploads
    throw new AppError("You have already registered a pharmacy", 409);
  }

  // Check if license number is already registered
  const licenseExists = await prisma.pharmacy.findUnique({
    where: { licenseNumber },
  });

  if (licenseExists) {
    throw new AppError("License number already registered", 409);
  }

  // Create pharmacy record with PENDING_VERIFICATION status
  // Also update user status from ONBOARDING_REQUIRED to PENDING
  const pharmacy = await prisma.$transaction(async (tx) => {
    const normalizedLicenseDocument =
      typeof licenseDocument === "string" && licenseDocument.trim().length > 0
        ? licenseDocument.trim()
        : null;

    // Update user status to PENDING (awaiting admin approval)
    await tx.user.update({
      where: { id: userId },
      data: { status: "PENDING" },
    });

    // Create pharmacy record
    const newPharmacy = await tx.pharmacy.create({
      data: {
        userId,
        pharmacyName: pharmacyName.trim(),
        address: address.trim(),
        latitude: latitude !== null ? latitude : 0.0,
        longitude: longitude !== null ? longitude : 0.0,
        licenseNumber: licenseNumber.trim(),
        licenseDocument: normalizedLicenseDocument,
        contactNumber: contactNumber.trim(),
        verificationStatus: "PENDING_VERIFICATION",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return newPharmacy;
  });

  console.log(
    `[PHARMACY] Onboarding submitted for userId: ${userId}, pharmacyId: ${pharmacy.id}, user status updated to PENDING`
  );

  return pharmacy;
};

/**
 * Get pharmacy details by user ID
 */
export const getPharmacyByUserId = async (userId) => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  return pharmacy;
};

/**
 * Get pharmacy details by pharmacy ID
 */
export const getPharmacyById = async (pharmacyId) => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  return pharmacy;
};

/**
 * Get all pharmacies pending verification (SystemAdmin only)
 */
export const getPendingPharmacies = async () => {
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
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return pharmacies;
};

/**
 * Get all pharmacies with any status (SystemAdmin only)
 */
export const getAllPharmacies = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.verificationStatus = filters.status;
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pharmacies;
};

/**
 * Verify (approve) a pharmacy (SystemAdmin only)
 * Updates status to VERIFIED
 */
export const verifyPharmacy = async (pharmacyId, adminUserId) => {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  if (pharmacy.verificationStatus === "VERIFIED") {
    throw new AppError("Pharmacy is already verified", 400);
  }

  if (pharmacy.verificationStatus === "REJECTED") {
    throw new AppError(
      "Cannot verify a rejected pharmacy. Use update status instead.",
      400
    );
  }

  // Update pharmacy status to VERIFIED and user status to APPROVED
  const updatedPharmacy = await prisma.$transaction(async (tx) => {
    // Update user status to APPROVED
    await tx.user.update({
      where: { id: pharmacy.userId },
      data: { status: "APPROVED" },
    });

    // Update pharmacy verification status
    const updated = await tx.pharmacy.update({
      where: { id: pharmacyId },
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
            status: true,
          },
        },
      },
    });

    return updated;
  });

  console.log(
    `[PHARMACY] Verified pharmacyId: ${pharmacyId} by adminId: ${adminUserId}, user status set to APPROVED`
  );

  return updatedPharmacy;
};

/**
 * Reject a pharmacy (SystemAdmin only)
 * Updates status to REJECTED
 */
export const rejectPharmacy = async (pharmacyId, adminUserId, reason) => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError("Rejection reason is required", 400);
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  if (pharmacy.verificationStatus === "REJECTED") {
    throw new AppError("Pharmacy is already rejected", 400);
  }

  // Update pharmacy status to REJECTED and user status to REJECTED
  const updatedPharmacy = await prisma.$transaction(async (tx) => {
    // Update user status to REJECTED
    await tx.user.update({
      where: { id: pharmacy.userId },
      data: { status: "REJECTED" },
    });

    // Update pharmacy verification status
    const updated = await tx.pharmacy.update({
      where: { id: pharmacyId },
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
            status: true,
          },
        },
      },
    });

    return updated;
  });

  console.log(
    `[PHARMACY] Rejected pharmacyId: ${pharmacyId} by adminId: ${adminUserId}, reason: ${reason}`
  );

  return updatedPharmacy;
};

/**
 * Update pharmacy verification status (SystemAdmin only)
 * Allows changing from any status to any status
 */
export const updatePharmacyStatus = async (pharmacyId, adminUserId, newStatus, reason = null) => {
  const validStatuses = ["PENDING_VERIFICATION", "VERIFIED", "REJECTED"];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  const updateData = {
    verificationStatus: newStatus,
  };

  // Handle status-specific fields
  if (newStatus === "VERIFIED") {
    updateData.verifiedAt = new Date();
    updateData.verifiedBy = adminUserId;
    updateData.rejectionReason = null;
    updateData.rejectedAt = null;
  } else if (newStatus === "REJECTED") {
    if (!reason) {
      throw new AppError("Rejection reason is required when rejecting", 400);
    }
    updateData.rejectedAt = new Date();
    updateData.rejectionReason = reason.trim();
    updateData.verifiedAt = null;
    updateData.verifiedBy = null;
  } else if (newStatus === "PENDING_VERIFICATION") {
    // Reset all verification/rejection fields
    updateData.verifiedAt = null;
    updateData.verifiedBy = null;
    updateData.rejectedAt = null;
    updateData.rejectionReason = null;
  }

  const updatedPharmacy = await prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: updateData,
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
    `[PHARMACY] Status updated for pharmacyId: ${pharmacyId} to ${newStatus} by adminId: ${adminUserId}`
  );

  return updatedPharmacy;
};

export default {
  submitPharmacyOnboarding,
  getPharmacyByUserId,
  getPharmacyById,
  getPendingPharmacies,
  getAllPharmacies,
  verifyPharmacy,
  rejectPharmacy,
  updatePharmacyStatus,
};
