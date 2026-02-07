/**
 * Pharmacy Controller - HTTP request handlers for pharmacy operations
 * Handles pharmacy onboarding and admin verification endpoints
 */

import pharmacyService from "./pharmacy.service.js";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import prisma from "../../database/prisma.js";

/**
 * POST /api/pharmacy/onboard
 * Submit pharmacy onboarding details with license document upload
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN)
 * Accepts: multipart/form-data with REQUIRED "licenseDocument" file
 */
export const onboardPharmacy = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const userId = req.user.userId;
    logger.operation('PHARMACY', 'onboardPharmacy', 'START', { userId, hasFile: !!req.file });

    const pharmacyData = req.body;
    logger.debug('PHARMACY', '[ONBOARD] Pharmacy data received', { 
      pharmacyName: pharmacyData.pharmacyName, 
      licenseNumber: pharmacyData.licenseNumber,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size
    });

    // If file was uploaded via Cloudinary, attach the URL
    if (req.file && req.file.path) {
      logger.debug('PHARMACY', '[ONBOARD] File uploaded successfully', { 
        fileName: req.file.originalname, 
        cloudinaryUrl: req.file.path,
        fileSize: req.file.size
      });
      pharmacyData.licenseDocument = req.file.path; // Cloudinary URL
      pharmacyData.licenseDocumentPublicId = req.file.filename; // Cloudinary public_id
    } else {
      logger.error('PHARMACY', '[ONBOARD] No file received in request', { 
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body)
      });
    }

    const pharmacy = await pharmacyService.submitPharmacyOnboarding(
      userId,
      pharmacyData
    );

    const duration = Date.now() - startTime;
    logger.timing('PHARMACY', 'onboardPharmacy', duration, 'SUCCESS');
    logger.operation('PHARMACY', 'onboardPharmacy', 'SUCCESS', { pharmacyId: pharmacy.id, userId });

    // Log activity
    await createLog(
      userId,
      LOG_ACTIONS.PHARMACY_ONBOARDED,
      `Pharmacy "${pharmacy.pharmacyName}" submitted onboarding application (License: ${pharmacy.licenseNumber})`,
      "PHARMACY",
      {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.pharmacyName,
        licenseNumber: pharmacy.licenseNumber,
      }
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
    logger.error('PHARMACY', `[ONBOARD] Failed: ${error.message}`, error);
    logger.operation('PHARMACY', 'onboardPharmacy', 'ERROR', { error: error.message });
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
    const status = typeof req.query?.status === "string" ? req.query.status : undefined;

    const filters = {};
    if (status && status !== "ALL") {
      filters.status = status;
    }

    logger.debug("PHARMACY", "[ADMIN] Fetch pharmacies", { status, filters });

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

/**
 * POST /api/pharmacy/reset-onboarding
 * Reset user status to ONBOARDING_REQUIRED after rejection
 * Allows rejected pharmacies to resubmit their application
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), current status=REJECTED
 */
export const resetOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    logger.operation('PHARMACY', 'resetOnboarding', 'START', { userId });

    const result = await pharmacyService.resetPharmacyOnboarding(userId);

    res.status(200).json({
      success: true,
      message: "Your application has been reset. You can now resubmit your details.",
      data: result,
    });
  } catch (error) {
    logger.error('PHARMACY', `[RESET_ONBOARDING] Failed: ${error.message}`, error);
    next(error);
  }
};

/**
 * GET /api/pharmacy/sos/nearby
 * Get nearby pending SOS requests based on pharmacy location
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), Verified pharmacy
 */
export const getNearbySOS = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { radius = 10 } = req.query; // Default 10km radius

    // Get pharmacy details including location
    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found. Please complete onboarding first."
      });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: "Pharmacy must be verified to view SOS requests"
      });
    }

    if (!pharmacy.latitude || !pharmacy.longitude) {
      return res.status(400).json({
        success: false,
        message: "Pharmacy location not set. Please update your pharmacy profile."
      });
    }

    // Get SOS requests that haven't been rejected by this pharmacy
    const rejectedSOSIds = await prisma.pharmacyResponse.findMany({
      where: {
        pharmacyId: pharmacy.id,
        response: 'rejected'
      },
      select: {
        sosId: true
      }
    });

    const rejectedIds = rejectedSOSIds.map(r => r.sosId);

    const sosRequests = await prisma.sOSRequest.findMany({
      where: {
        status: 'pending',
        latitude: { not: null },
        longitude: { not: null },
        id: { notIn: rejectedIds } // Exclude rejected requests
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate distance and filter by radius
    const nearbySOS = sosRequests
      .map(sos => {
        const distance = calculateDistance(
          pharmacy.latitude,
          pharmacy.longitude,
          sos.latitude,
          sos.longitude
        );
        return { ...sos, distance };
      })
      .filter(sos => sos.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    logger.info('[PHARMACY] Nearby SOS requests retrieved', { 
      pharmacyId: pharmacy.id,
      total: sosRequests.length,
      nearby: nearbySOS.length,
      radius
    });

    res.status(200).json({
      success: true,
      data: {
        sosRequests: nearbySOS,
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude
        },
        radius: parseFloat(radius)
      },
      message: `Found ${nearbySOS.length} SOS requests within ${radius}km`
    });
  } catch (error) {
    logger.error('[PHARMACY] Get nearby SOS error', { error: error.message });
    next(error);
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * POST /api/pharmacy/sos/:id/respond
 * Respond to an SOS request (accept or reject)
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), Verified pharmacy
 */
export const respondToSOS = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id: sosId } = req.params;
    const { response, note } = req.body; // response: 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Response must be 'accepted' or 'rejected'"
      });
    }

    // Get pharmacy details
    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found"
      });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: "Pharmacy must be verified to respond to SOS requests"
      });
    }

    // Get the SOS request
    const sosRequest = await prisma.sOSRequest.findUnique({
      where: { id: sosId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!sosRequest) {
      return res.status(404).json({
        success: false,
        message: "SOS request not found"
      });
    }

    // Check if already accepted by another pharmacy
    if (sosRequest.status === 'accepted' && response === 'accepted') {
      return res.status(400).json({
        success: false,
        message: "This SOS request has already been accepted by another pharmacy"
      });
    }

    if (response === 'accepted') {
      // Accept the SOS request
      const updatedSOS = await prisma.sOSRequest.update({
        where: { id: sosId },
        data: {
          status: 'accepted',
          acceptedBy: pharmacy.id,
          acceptedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // Create pharmacy response record
      await prisma.pharmacyResponse.create({
        data: {
          sosId,
          pharmacyId: pharmacy.id,
          response: 'accepted',
          note: note || 'Medicine available for pickup'
        }
      });

      logger.info('[PHARMACY] SOS request accepted', {
        pharmacyId: pharmacy.id,
        sosId,
        patientId: sosRequest.patientId
      });

      return res.status(200).json({
        success: true,
        message: "SOS request accepted successfully. Please contact the patient.",
        data: {
          sos: updatedSOS,
          pharmacy: {
            id: pharmacy.id,
            name: pharmacy.pharmacyName,
            contactNumber: pharmacy.contactNumber
          }
        }
      });
    } else {
      // Reject the SOS request (only for this pharmacy)
      await prisma.pharmacyResponse.create({
        data: {
          sosId,
          pharmacyId: pharmacy.id,
          response: 'rejected',
          note: note || 'Unable to fulfill request'
        }
      });

      logger.info('[PHARMACY] SOS request rejected', {
        pharmacyId: pharmacy.id,
        sosId
      });

      return res.status(200).json({
        success: true,
        message: "SOS request rejected. It will remain visible to other pharmacies.",
        data: null
      });
    }
  } catch (error) {
    logger.error('[PHARMACY] Respond to SOS error', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/pharmacy/update-location
 * Update pharmacy location (latitude, longitude, address)
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude, address } = req.body;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude. Must be between -90 and 90"
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude. Must be between -180 and 180"
      });
    }

    // Get pharmacy
    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found"
      });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: "Only verified pharmacies can update location"
      });
    }

    // Update location
    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || pharmacy.address,
        updatedAt: new Date()
      },
      select: {
        id: true,
        pharmacyName: true,
        latitude: true,
        longitude: true,
        address: true
      }
    });

    // Log activity
    await createLog(
      userId,
      LOG_ACTIONS.PHARMACY_UPDATED,
      `Pharmacy location updated: ${updatedPharmacy.pharmacyName}`,
      "PHARMACY",
      {
        pharmacyId: pharmacy.id,
        latitude,
        longitude,
        address
      }
    );

    logger.info('[PHARMACY] Location updated', {
      pharmacyId: pharmacy.id,
      latitude,
      longitude
    });

    res.status(200).json({
      success: true,
      message: "Pharmacy location updated successfully",
      data: updatedPharmacy
    });
  } catch (error) {
    logger.error('[PHARMACY] Update location error', { error: error.message });
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
  resetOnboarding,
  getNearbySOS,
  respondToSOS,
  updateLocation,
};
