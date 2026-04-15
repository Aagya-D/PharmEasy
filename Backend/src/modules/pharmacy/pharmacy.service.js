/**
 * Pharmacy onboarding and verification logic.
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

const NEPAL_BOUNDS = {
  minLat: 26.3478,
  maxLat: 30.4469,
  minLng: 80.0586,
  maxLng: 88.2015,
};

// Save pharmacy onboarding details for a pharmacy admin.
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

  if (!pharmacyName || !address || !licenseNumber || !contactNumber) {
    throw new AppError("Missing required pharmacy details", 400);
  }

  // The license file is required before we let onboarding continue.
  if (!licenseDocument || 
      (typeof licenseDocument === 'object' && Object.keys(licenseDocument).length === 0) ||
      (typeof licenseDocument === 'string' && licenseDocument.trim().length === 0)) {
    throw new AppError(
      "Onboarding failed: Missing required license documentation. Please upload a valid pharmacy license document.",
      400
    );
  }

  if (typeof licenseDocument !== 'string') {
    throw new AppError(
      "Onboarding failed: Invalid license document format. Document must be a valid file URL.",
      400
    );
  }

  // Forms send strings, so normalize coordinates before validation.
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
    if (latitude < NEPAL_BOUNDS.minLat || latitude > NEPAL_BOUNDS.maxLat) {
      throw new AppError(
        `Pharmacy location must be within Nepal. Latitude must be between ${NEPAL_BOUNDS.minLat} and ${NEPAL_BOUNDS.maxLat}`,
        400
      );
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
    if (longitude < NEPAL_BOUNDS.minLng || longitude > NEPAL_BOUNDS.maxLng) {
      throw new AppError(
        `Pharmacy location must be within Nepal. Longitude must be between ${NEPAL_BOUNDS.minLng} and ${NEPAL_BOUNDS.maxLng}`,
        400
      );
    }
  }

  // Only pharmacy admins can submit onboarding.
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

  // The admin role should never reach this path.
  if (user.roleId === 1) {
    throw new AppError(
      "System Admin accounts cannot register pharmacies. This action is blocked.",
      403
    );
  }

  // One user can only own one pharmacy record.
  const existingPharmacy = await prisma.pharmacy.findUnique({
    where: { userId },
  });

  if (existingPharmacy) {
    // Rejected applications stay locked until support or admin review changes them.
    if (existingPharmacy.verificationStatus === "REJECTED") {
      throw new AppError(
        "Your pharmacy registration was rejected. Please contact support for assistance.",
        403
      );
    }
    throw new AppError("You have already registered a pharmacy", 409);
  }

  // License numbers must stay unique across all pharmacies.
  const licenseExists = await prisma.pharmacy.findUnique({
    where: { licenseNumber },
  });

  if (licenseExists) {
    throw new AppError("License number already registered", 409);
  }

  // Keep the user and pharmacy changes together so partial onboarding does not leak through.
  const pharmacy = await prisma.$transaction(async (tx) => {
    // Store a clean URL so later admin screens can render the document.
    const normalizedLicenseDocument =
      typeof licenseDocument === "string" && licenseDocument.trim().length > 0
        ? licenseDocument.trim()
        : null;

    if (!normalizedLicenseDocument) {
      throw new AppError(
        "Critical error: License document validation failed. Cannot proceed with onboarding.",
        400
      );
    }

    // Move the user out of onboarding-required once the pharmacy record is created.
    await tx.user.update({
      where: { id: userId },
      data: { status: "PENDING" },
    });

    // Store the pharmacy details that admins need for review.
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

/**
 * Reset pharmacy onboarding status
 * Allows rejected pharmacies to resubmit their application
 * Sets user status back to ONBOARDING_REQUIRED and deletes pharmacy record
 */
export const resetPharmacyOnboarding = async (userId) => {
  // Verify user exists and has roleId=2 (pharmacy admin)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { pharmacy: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.roleId !== 2) {
    throw new AppError("Only pharmacy admins can reset their onboarding", 403);
  }

  // Verify user has a rejected pharmacy
  if (!user.pharmacy) {
    throw new AppError("No pharmacy found for this user", 404);
  }

  if (user.pharmacy.verificationStatus !== "REJECTED") {
    throw new AppError(
      "Only rejected pharmacies can reset their onboarding",
      400
    );
  }

  // Transaction: Delete pharmacy record and reset user status
  const result = await prisma.$transaction(async (tx) => {
    // Delete the pharmacy record
    await tx.pharmacy.delete({
      where: { id: user.pharmacy.id },
    });

    // Update user status back to ONBOARDING_REQUIRED
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { status: "ONBOARDING_REQUIRED" },
      include: {
        role: true,
      },
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        status: updatedUser.status,
        roleId: updatedUser.roleId,
      },
    };
  });

  console.log(
    `[PHARMACY] Onboarding reset for userId: ${userId}, user status set to ONBOARDING_REQUIRED`
  );

  return result;
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
  resetPharmacyOnboarding,
};
