/**
 * Pharmacy Controller - HTTP request handlers for pharmacy operations
 * Handles pharmacy onboarding and admin verification endpoints
 */

import pharmacyService from "./pharmacy.service.js";

/**
 * POST /api/pharmacy/onboard
 * Submit pharmacy onboarding details with license document upload
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN)
 * Accepts: multipart/form-data with optional "licenseDocument" file
 */
export const onboardPharmacy = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const pharmacyData = req.body;

    // If file was uploaded via Cloudinary, attach the URL
    if (req.file && req.file.path) {
      pharmacyData.licenseDocument = req.file.path; // Cloudinary URL
      pharmacyData.licenseDocumentPublicId = req.file.filename; // Cloudinary public_id
    }

    const pharmacy = await pharmacyService.submitPharmacyOnboarding(
      userId,
      pharmacyData
    );

    res.status(201).json({
      success: true,
      message: "Pharmacy onboarding submitted successfully. Awaiting admin verification.",
      data: {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.pharmacyName,
        verificationStatus: pharmacy.verificationStatus,
        licenseDocument: pharmacy.licenseDocument,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pharmacy/my-pharmacy
 * Get authenticated user's pharmacy details
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN)
 */
export const getMyPharmacy = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "No pharmacy found for this user. Please complete onboarding first.",
      });
    }

    res.status(200).json({
      success: true,
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pharmacies/pending
 * Get all pharmacies pending verification
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 */
export const getPendingPharmacies = async (req, res, next) => {
  try {
    const pharmacies = await pharmacyService.getPendingPharmacies();

    res.status(200).json({
      success: true,
      count: pharmacies.length,
      data: pharmacies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pharmacies
 * Get all pharmacies with optional status filter
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 * Query params: ?status=PENDING_VERIFICATION|VERIFIED|REJECTED
 */
export const getAllPharmacies = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filters = {};
    if (status) {
      filters.status = status;
    }

    const pharmacies = await pharmacyService.getAllPharmacies(filters);

    res.status(200).json({
      success: true,
      count: pharmacies.length,
      data: pharmacies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pharmacy/:id
 * Get specific pharmacy details
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 */
export const getPharmacyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pharmacy = await pharmacyService.getPharmacyById(id);

    res.status(200).json({
      success: true,
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/pharmacy/:id/verify
 * Verify (approve) a pharmacy
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 */
export const verifyPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    const pharmacy = await pharmacyService.verifyPharmacy(id, adminUserId);

    res.status(200).json({
      success: true,
      message: "Pharmacy verified successfully",
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/pharmacy/:id/reject
 * Reject a pharmacy
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 * Body: { reason: string }
 */
export const rejectPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = req.user.userId;

    const pharmacy = await pharmacyService.rejectPharmacy(
      id,
      adminUserId,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Pharmacy rejected",
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/pharmacy/:id/status
 * Update pharmacy verification status
 * Requires: Authentication, roleId=1 (SYSTEM_ADMIN)
 * Body: { status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED", reason?: string }
 */
export const updatePharmacyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminUserId = req.user.userId;

    const pharmacy = await pharmacyService.updatePharmacyStatus(
      id,
      adminUserId,
      status,
      reason
    );

    res.status(200).json({
      success: true,
      message: `Pharmacy status updated to ${status}`,
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  onboardPharmacy,
  getMyPharmacy,
  getPendingPharmacies,
  getAllPharmacies,
  getPharmacyById,
  verifyPharmacy,
  rejectPharmacy,
  updatePharmacyStatus,
};
