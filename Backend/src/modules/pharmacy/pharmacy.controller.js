/**
 * Pharmacy Controller - HTTP request handlers for pharmacy operations
 * Handles pharmacy onboarding and admin verification endpoints
 */

import pharmacyService from "./pharmacy.service.js";
import logger from "../../utils/logger.js";
import { createLog, createAuditLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import prisma from "../../database/prisma.js";
import notificationService from "../notifications/notification.service.js";
import { isValidNepaliPhone } from "../../utils/validation.js";
import { encryptText } from "../../utils/encryption.js";

const KHALTI_PUBLIC_KEY_REGEX = /^[a-zA-Z0-9]{20,80}$/;
const MASKED_SECRET = "••••••••••••••••••••";

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

    // Validate contactNumber
    if (!isValidNepaliPhone(pharmacyData.contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
      });
    }

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
 * GET /api/pharmacy/:id/catalog
 * Public storefront endpoint for patients
 * Returns pharmacy profile + in-stock inventory only
 */
export const getPharmacyCatalog = async (req, res, next) => {
  try {
    const pharmacyId = req.params.id;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: {
        id: pharmacyId,
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        pharmacyName: true,
        address: true,
        contactNumber: true,
        latitude: true,
        longitude: true,
        averageRating: true,
        totalReviews: true,
        verificationStatus: true,
        inventory: {
          where: {
            quantity: { gt: 0 },
          },
          orderBy: [
            { name: "asc" },
            { price: "asc" },
          ],
          select: {
            id: true,
            name: true,
            genericName: true,
            imageUrl: true,
            quantity: true,
            price: true,
            expiryDate: true,
            sideEffects: true,
            contraindications: true,
            warnings: true,
            isPrescriptionRequired: true,
            dosageInstructions: true,
            route: true,
            timing: true,
            strength: true,
            form: true,
            manufacturer: true,
            batchNumber: true,
          },
        },
      },
    });

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy store not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          address: pharmacy.address,
          contactNumber: pharmacy.contactNumber,
          location: {
            lat: pharmacy.latitude,
            lng: pharmacy.longitude,
          },
          averageRating: pharmacy.averageRating || 0,
          totalReviews: pharmacy.totalReviews || 0,
          verified: pharmacy.verificationStatus === "VERIFIED",
        },
        medicines: pharmacy.inventory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pharmacy/:id/inventory
 * Public storefront endpoint for patients
 * Returns pharmacy profile + full inventory catalog (in-stock and out-of-stock)
 */
export const getPharmacyInventory = async (req, res, next) => {
  try {
    const pharmacyId = req.params.id;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: {
        id: pharmacyId,
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        pharmacyName: true,
        address: true,
        contactNumber: true,
        latitude: true,
        longitude: true,
        averageRating: true,
        totalReviews: true,
        verificationStatus: true,
        inventory: {
          orderBy: [
            { name: "asc" },
            { price: "asc" },
          ],
          select: {
            id: true,
            name: true,
            genericName: true,
            imageUrl: true,
            quantity: true,
            price: true,
            expiryDate: true,
            sideEffects: true,
            contraindications: true,
            warnings: true,
            isPrescriptionRequired: true,
            dosageInstructions: true,
            route: true,
            timing: true,
            strength: true,
            form: true,
            manufacturer: true,
            batchNumber: true,
          },
        },
      },
    });

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy store not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          address: pharmacy.address,
          contactNumber: pharmacy.contactNumber,
          location: {
            lat: pharmacy.latitude,
            lng: pharmacy.longitude,
          },
          averageRating: pharmacy.averageRating || 0,
          totalReviews: pharmacy.totalReviews || 0,
          verified: pharmacy.verificationStatus === "VERIFIED",
        },
        medicines: pharmacy.inventory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pharmacy/settings/khalti
 * Get Khalti merchant connection status and safe display fields
 */
export const getKhaltiSettings = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "No pharmacy found for this user. Please complete onboarding first.",
      });
    }

    const paymentConfig = await prisma.pharmacyPaymentConfig.findUnique({
      where: { pharmacyId: pharmacy.id },
      select: {
        khaltiPublicKey: true,
        khaltiSecretKeyEncrypted: true,
        isKhaltiConnected: true,
        khaltiConnectedAt: true,
        updatedAt: true,
      },
    });

    const hasSecretKey = Boolean(paymentConfig?.khaltiSecretKeyEncrypted);
    const isConnected = Boolean(paymentConfig?.isKhaltiConnected && paymentConfig?.khaltiPublicKey && hasSecretKey);

    return res.status(200).json({
      success: true,
      data: {
        status: isConnected ? "CONNECTED" : "NOT_CONNECTED",
        isConnected,
        merchantSignupUrl: "https://merchant.khalti.com/",
        publicKey: paymentConfig?.khaltiPublicKey || "",
        hasSecretKey,
        secretKeyMasked: hasSecretKey ? MASKED_SECRET : "",
        connectedAt: paymentConfig?.khaltiConnectedAt || null,
        updatedAt: paymentConfig?.updatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/pharmacy/settings/khalti
 * Save/update Khalti merchant keys for the authenticated pharmacy admin
 */
export const updateKhaltiSettings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const publicKeyInput = String(req.body?.publicKey || "").trim();
    const secretKeyInput = String(req.body?.secretKey || "").trim();

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "No pharmacy found for this user. Please complete onboarding first.",
      });
    }

    if (!publicKeyInput || !KHALTI_PUBLIC_KEY_REGEX.test(publicKeyInput)) {
      return res.status(400).json({
        success: false,
        message: "A valid Khalti public key is required",
      });
    }

    if (secretKeyInput && secretKeyInput === publicKeyInput) {
      return res.status(400).json({
        success: false,
        message: "Khalti secret key cannot be the same as public key",
      });
    }

    const existing = await prisma.pharmacyPaymentConfig.findUnique({
      where: { pharmacyId: pharmacy.id },
      select: {
        id: true,
        khaltiSecretKeyEncrypted: true,
      },
    });

    const encryptedSecret = secretKeyInput ? encryptText(secretKeyInput) : null;
    const finalEncryptedSecret = encryptedSecret || existing?.khaltiSecretKeyEncrypted || null;

    if (!finalEncryptedSecret) {
      return res.status(400).json({
        success: false,
        message: "Khalti secret key is required for first-time connection",
      });
    }

    const updated = await prisma.pharmacyPaymentConfig.upsert({
      where: { pharmacyId: pharmacy.id },
      create: {
        pharmacyId: pharmacy.id,
        khaltiPublicKey: publicKeyInput,
        khaltiSecretKeyEncrypted: finalEncryptedSecret,
        isKhaltiConnected: true,
        khaltiConnectedAt: new Date(),
      },
      update: {
        khaltiPublicKey: publicKeyInput,
        ...(encryptedSecret ? { khaltiSecretKeyEncrypted: encryptedSecret } : {}),
        isKhaltiConnected: true,
        khaltiConnectedAt: existing?.id ? undefined : new Date(),
      },
      select: {
        khaltiPublicKey: true,
        khaltiSecretKeyEncrypted: true,
        isKhaltiConnected: true,
        khaltiConnectedAt: true,
        updatedAt: true,
      },
    });

    await createLog(
      userId,
      LOG_ACTIONS.PHARMACY_UPDATED,
      `Updated Khalti merchant settings for pharmacy "${pharmacy.pharmacyName}"`,
      "PHARMACY",
      {
        pharmacyId: pharmacy.id,
        khaltiConnected: true,
        secretUpdated: Boolean(secretKeyInput),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Khalti merchant settings saved successfully",
      data: {
        status: updated.isKhaltiConnected ? "CONNECTED" : "NOT_CONNECTED",
        isConnected: updated.isKhaltiConnected,
        merchantSignupUrl: "https://merchant.khalti.com/",
        publicKey: updated.khaltiPublicKey || "",
        hasSecretKey: Boolean(updated.khaltiSecretKeyEncrypted),
        secretKeyMasked: updated.khaltiSecretKeyEncrypted ? MASKED_SECRET : "",
        connectedAt: updated.khaltiConnectedAt || null,
        updatedAt: updated.updatedAt || null,
      },
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

    // ── Capture BEFORE state for audit delta ──
    const beforePharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      select: { id: true, pharmacyName: true, verificationStatus: true, verifiedBy: true, verifiedAt: true },
    });

    const pharmacy = await pharmacyService.verifyPharmacy(id, adminUserId);

    // ── Audit: full delta + client metadata ──
    await createAuditLog({
      actorId: adminUserId,
      action: LOG_ACTIONS.PHARMACY_APPROVED,
      message: `Admin approved pharmacy "${pharmacy.pharmacyName}" (was ${beforePharmacy?.verificationStatus || "UNKNOWN"})`,
      category: "PHARMACY",
      resourceType: "Pharmacy",
      resourceId: id,
      oldValue: beforePharmacy,
      newValue: {
        id: pharmacy.id,
        pharmacyName: pharmacy.pharmacyName,
        verificationStatus: pharmacy.verificationStatus,
        verifiedBy: pharmacy.verifiedBy,
        verifiedAt: pharmacy.verifiedAt,
      },
      req,
    });

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

    // ── Capture BEFORE state for audit delta ──
    const beforePharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      select: { id: true, pharmacyName: true, verificationStatus: true, rejectionReason: true },
    });

    const pharmacy = await pharmacyService.rejectPharmacy(
      id,
      adminUserId,
      reason
    );

    // ── Audit: full delta + client metadata ──
    await createAuditLog({
      actorId: adminUserId,
      action: LOG_ACTIONS.PHARMACY_REJECTED,
      message: `Admin rejected pharmacy "${pharmacy.pharmacyName}" (was ${beforePharmacy?.verificationStatus || "UNKNOWN"}). Reason: ${reason}`,
      category: "PHARMACY",
      resourceType: "Pharmacy",
      resourceId: id,
      oldValue: beforePharmacy,
      newValue: {
        id: pharmacy.id,
        pharmacyName: pharmacy.pharmacyName,
        verificationStatus: pharmacy.verificationStatus,
        rejectionReason: pharmacy.rejectionReason,
        rejectedAt: pharmacy.rejectedAt,
      },
      req,
    });

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

    // ── Capture BEFORE state for audit delta ──
    const beforePharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      select: { id: true, pharmacyName: true, verificationStatus: true, rejectionReason: true, verifiedBy: true },
    });

    const pharmacy = await pharmacyService.updatePharmacyStatus(
      id,
      adminUserId,
      status,
      reason
    );

    // ── Audit: full delta + client metadata ──
    await createAuditLog({
      actorId: adminUserId,
      action: `PHARMACY_STATUS_${status}`,
      message: `Admin changed pharmacy "${pharmacy.pharmacyName}" status from ${beforePharmacy?.verificationStatus || "UNKNOWN"} → ${status}` + (reason ? `. Reason: ${reason}` : ""),
      category: "PHARMACY",
      resourceType: "Pharmacy",
      resourceId: id,
      oldValue: beforePharmacy,
      newValue: {
        id: pharmacy.id,
        pharmacyName: pharmacy.pharmacyName,
        verificationStatus: pharmacy.verificationStatus,
        rejectionReason: pharmacy.rejectionReason,
        verifiedBy: pharmacy.verifiedBy,
      },
      req,
    });

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
 * 
 * Automatically expires SOS requests older than 30 minutes before querying.
 */
export const getNearbySOS = async (req, res, next) => {
  try {
    // ── Auto-expire stale SOS requests (30 min TTL) ──
    const SOS_TTL_MINUTES = 30;
    const cutoff = new Date(Date.now() - SOS_TTL_MINUTES * 60 * 1000);
    try {
      await prisma.sOSRequest.updateMany({
        where: { status: "pending", createdAt: { lt: cutoff } },
        data: { status: "expired" },
      });
    } catch (_) { /* non-blocking */ }

    const userId = req.user.userId;
    const { radius = 50 } = req.query; // Default 50km radius for broader visibility

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
      select: {
        id: true,
        patientId: true,
        patientName: true,
        contactNumber: true,
        address: true,
        latitude: true,
        longitude: true,
        medicineName: true,
        quantity: true,
        urgencyLevel: true,
        additionalNotes: true,
        prescriptionUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        pharmacyResponses: {
          select: {
            id: true,
            pharmacyId: true,
            response: true,
            respondedAt: true
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

        // Keep legacy fields and add normalized aliases expected by emergency cards.
        return {
          ...sos,
          distance,
          urgency: sos.urgencyLevel,
          description: sos.additionalNotes,
          prescription: sos.prescriptionUrl,
          contactNumber: sos.contactNumber || sos.patient?.phone || null,
        };
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

      // Create ChatRoom for real-time communication (idempotent - upsert pattern)
      try {
        const existingRoom = await prisma.chatRoom.findFirst({
          where: { sosRequestId: sosId },
          select: { id: true },
        });

        if (!existingRoom) {
          const newRoom = await prisma.chatRoom.create({
            data: {
              sosRequestId: sosId,
              patientId: sosRequest.patientId,
              pharmacyId: userId, // userId is the pharmacy's User ID (foreign key on ChatRoom)
            },
          });
          logger.info('[PHARMACY] ChatRoom created for SOS', {
            sosId,
            patientId: sosRequest.patientId,
            pharmacyUserId: userId,
          });

          // Notify the pharmacy's own UI so the sidebar refreshes immediately
          const io = req.app.get("io");
          if (io) {
            io.emit("new_chat_available", {
              pharmacyId: userId,
              room: {
                id: newRoom.id,
                sosRequestId: sosId,
                patientId: sosRequest.patientId,
                pharmacyId: userId,
                createdAt: newRoom.createdAt,
                patient: {
                  id: sosRequest.patientId,
                  name: sosRequest.patient?.name || sosRequest.patientName || "Patient",
                },
                sosRequest: {
                  id: sosId,
                  medicineName: sosRequest.medicineName,
                  urgencyLevel: sosRequest.urgencyLevel,
                  status: "accepted",
                },
                lastMessage: null,
                unreadCount: 0,
              },
            });
          }
        } else {
          logger.info('[PHARMACY] ChatRoom already exists for SOS', { sosId, roomId: existingRoom.id });
        }
      } catch (chatRoomError) {
        // Non-blocking — log but never fail the accept response
        logger.error('[PHARMACY] ChatRoom creation error:', { error: chatRoomError.message, sosId });
      }

      logger.info('[PHARMACY] SOS request accepted', {
        pharmacyId: pharmacy.id,
        sosId,
        patientId: sosRequest.patientId
      });

      // Trigger notification to patient
      try {
        await notificationService.notifySosStatusChange(
          sosRequest.patientId,
          pharmacy.pharmacyName,
          'accepted',
          sosRequest.medicineName,
          sosId
        );
        console.log(`[PHARMACY] Notification sent to patient ${sosRequest.patientId}`);
      } catch (notificationError) {
        console.error('[PHARMACY] Failed to send SOS acceptance notification:', notificationError);
      }

      // Notify OTHER pharmacies that this SOS has been claimed
      try {
        await notificationService.notifySosClaimedByOther(
          sosId,
          pharmacy.id,
          pharmacy.pharmacyName,
          sosRequest.medicineName
        );
      } catch (claimErr) {
        console.error('[PHARMACY] Failed to send SOS claimed notification:', claimErr.message);
      }

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

      // Trigger notification to patient
      try {
        await notificationService.notifySosStatusChange(
          sosRequest.patientId,
          pharmacy.pharmacyName,
          'rejected',
          sosRequest.medicineName,
          sosId
        );
        console.log(`[PHARMACY] Notification sent to patient ${sosRequest.patientId}`);
      } catch (notificationError) {
        console.error('[PHARMACY] Failed to send SOS rejection notification:', notificationError);
        // Continue despite notification failure
      }

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
 * PATCH /api/pharmacy/sos/:id/status
 * Update an accepted SOS request status to completed
 * Body: { status: 'completed' }
 */
export const rejectSOS = async (req, res, next) => {
  req.body = {
    ...req.body,
    response: "rejected",
  };

  return respondToSOS(req, res, next);
};

export const completeSOS = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id: sosId } = req.params;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found",
      });
    }

    const sosRequest = await prisma.sOSRequest.findUnique({
      where: { id: sosId },
      select: {
        id: true,
        status: true,
        acceptedBy: true,
        patientId: true,
        medicineName: true,
      },
    });

    if (!sosRequest) {
      return res.status(404).json({
        success: false,
        message: "SOS request not found",
      });
    }

    if (sosRequest.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Only accepted SOS requests can be marked as completed",
      });
    }

    if (sosRequest.acceptedBy !== pharmacy.id) {
      return res.status(403).json({
        success: false,
        message: "You can only complete cases accepted by your pharmacy",
      });
    }

    const updatedSOS = await prisma.sOSRequest.update({
      where: { id: sosId },
      data: { status: "COMPLETED" },
    });

    const chatRoom = await prisma.chatRoom.findFirst({
      where: { sosRequestId: sosId },
      select: { id: true, patientId: true, pharmacyId: true },
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("sos_case_status_updated", {
        sosRequestId: sosId,
        chatRoomId: chatRoom?.id || null,
        status: "COMPLETED",
        patientId: chatRoom?.patientId || sosRequest.patientId,
        pharmacyUserId: chatRoom?.pharmacyId || userId,
      });
    }

    try {
      await notificationService.createNotification(
        sosRequest.patientId,
        "✅ SOS Request Completed",
        `${pharmacy.pharmacyName} has successfully fulfilled your request for ${sosRequest.medicineName}.`,
        "SOS_COMPLETED",
        {
          status: "completed",
          pharmacyName: pharmacy.pharmacyName,
          medicineName: sosRequest.medicineName,
          sosId,
          link: `/sos/${sosId}`,
        },
        "PATIENT",
        "high"
      );
    } catch (notificationError) {
      console.error("[PHARMACY] Failed to send SOS completion notification:", notificationError);
    }

    return res.status(200).json({
      success: true,
      message: "SOS case marked as completed",
      data: { sos: updatedSOS },
    });
  } catch (error) {
    logger.error("[PHARMACY] Update SOS status error", { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/pharmacy/sos/:id/status
 * Backward-compatible alias for completion route.
 * Body: { status: 'completed' }
 */
export const updateSOSStatus = async (req, res, next) => {
  const requestedStatus = String(req.body?.status || "").trim().toLowerCase();
  if (requestedStatus !== "completed") {
    return res.status(400).json({
      success: false,
      message: "Only status 'completed' is allowed for this endpoint",
    });
  }

  return completeSOS(req, res, next);
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

/**
 * GET /api/pharmacy/dashboard-stats
 * Get real-time dashboard statistics for the logged-in pharmacy
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    logger.operation('PHARMACY', 'getDashboardStats', 'START', { userId });

    // Get pharmacy details
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
        message: "Pharmacy must be verified to view dashboard stats"
      });
    }

    const pharmacyId = pharmacy.id;

    // --- Run all counts in parallel for speed ---
    const [
      inventoryAgg,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      totalMedicines,
      totalOrdersCount,
      pendingOrdersCount,
      fulfilledOrdersCount,
      pendingSOSCount,
      recentInventory,
      stockValueAgg,
    ] = await Promise.all([
      // 1. Total stock quantity (sum of all quantities)
      prisma.inventory.aggregate({
        where: { pharmacyId },
        _sum: { quantity: true },
      }),
      // 2. Low stock items (quantity < 20)
      prisma.inventory.count({
        where: { pharmacyId, quantity: { gt: 0, lt: 20 } },
      }),
      // 3. Out of stock items (quantity === 0)
      prisma.inventory.count({
        where: { pharmacyId, quantity: 0 },
      }),
      // 4. Expiring within 30 days
      prisma.inventory.count({
        where: {
          pharmacyId,
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // 5. Total unique medicines
      prisma.inventory.count({
        where: { pharmacyId },
      }),
      // 6. Total orders for this pharmacy
      prisma.order.count({
        where: { pharmacyId },
      }),
      // 7. Pending orders
      prisma.order.count({
        where: { pharmacyId, status: 'PENDING' },
      }),
      // 8. Fulfilled/delivered orders
      prisma.order.count({
        where: { pharmacyId, status: { in: ['COMPLETED'] } },
      }),
      // 9. Pending SOS requests (global pending, pharmacy can see nearby)
      prisma.sOSRequest.count({
        where: { status: 'pending' },
      }),
      // 10. Recent inventory items (top 10) for dashboard preview
      prisma.inventory.findMany({
        where: { pharmacyId },
        orderBy: [{ expiryDate: 'asc' }, { name: 'asc' }],
        take: 10,
      }),
      // 11. Total stock value
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(quantity * price), 0) as "totalValue" FROM "Inventory" WHERE "pharmacyId" = $1`,
        pharmacyId
      ),
    ]);

    const totalItems = inventoryAgg._sum.quantity || 0;
    const totalValue = stockValueAgg[0]?.totalValue || 0;

    logger.operation('PHARMACY', 'getDashboardStats', 'SUCCESS', {
      pharmacyId,
      totalItems,
      lowStockCount,
      totalMedicines,
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalItems,
          totalMedicines,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          expiringSoon: expiringSoonCount,
          totalOrders: totalOrdersCount,
          pendingOrders: pendingOrdersCount,
          fulfilledOrders: fulfilledOrdersCount,
          pendingSOS: pendingSOSCount,
          totalValue: Number(totalValue),
        },
        inventory: recentInventory,
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          verificationStatus: pharmacy.verificationStatus,
        },
      },
      message: "Dashboard stats retrieved successfully"
    });
  } catch (error) {
    logger.error('[PHARMACY] getDashboardStats error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/pharmacy/orders
 * Get orders for the logged-in pharmacy
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const getPharmacyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 50, status } = req.query;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found."
      });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: "Pharmacy must be verified to view orders"
      });
    }

    const where = { pharmacyId: pharmacy.id };
    if (status && status !== 'all') {
      where.status = String(status).toUpperCase();
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            select: {
              id: true,
              medicineName: true,
              genericName: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    // Calculate revenue from completed orders
    const revenueAgg = await prisma.order.aggregate({
      where: {
        pharmacyId: pharmacy.id,
        status: { in: ['COMPLETED'] },
      },
      _sum: { totalAmount: true },
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        stats: {
          total: totalCount,
          pending: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'PENDING' } }),
          accepted: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'ACCEPTED' } }),
          preparing: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'PREPARING' } }),
          ready: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'READY' } }),
          fulfilled: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'COMPLETED' } }),
          revenue: revenueAgg._sum.totalAmount || 0,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
        },
      },
      message: `Found ${orders.length} orders`,
    });
  } catch (error) {
    logger.error('[PHARMACY] getPharmacyOrders error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/pharmacy/customers
 * Get unique customers (patients who ordered from this pharmacy)
 * Analyzes Order table to return patient list with total orders & last purchase date
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const getPharmacyCustomers = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { search } = req.query;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ success: false, message: "Pharmacy must be verified." });
    }

    // Get all orders for this pharmacy, grouped by patient
    const orders = await prisma.order.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate: unique patients → total orders, total spent, last purchase
    const customerMap = new Map();
    orders.forEach((order) => {
      const pid = order.patientId;
      if (!customerMap.has(pid)) {
        customerMap.set(pid, {
          id: order.patient.id,
          name: order.patient.name,
          email: order.patient.email,
          phone: order.patient.phone || "N/A",
          memberSince: order.patient.createdAt,
          totalOrders: 0,
          totalSpent: 0,
          lastPurchase: order.createdAt,
        });
      }
      const c = customerMap.get(pid);
      c.totalOrders += 1;
      c.totalSpent += order.totalAmount || 0;
      if (order.createdAt > c.lastPurchase) {
        c.lastPurchase = order.createdAt;
      }
    });

    let customers = Array.from(customerMap.values())
      .sort((a, b) => b.totalOrders - a.totalOrders);

    // Server-side search filter
    if (search && search.trim()) {
      const q = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      data: {
        customers,
        stats: {
          totalCustomers: customerMap.size,
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        },
      },
      message: `Found ${customers.length} customers`,
    });
  } catch (error) {
    logger.error('[PHARMACY] getPharmacyCustomers error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/pharmacy/analytics
 * Get sales analytics: daily revenue (last 30 days), monthly revenue, top medicine, SOS stats
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const getAnalyticsData = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);

    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    if (pharmacy.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ success: false, message: "Pharmacy must be verified." });
    }

    const pharmacyId = pharmacy.id;
    const now = new Date();

    // ── Date boundaries ──
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ── Parallel queries ──
    const [
      recentOrders,
      currentMonthOrders,
      prevMonthOrders,
      totalOrdersCount,
      inventoryItems,
      sosAcceptedCount,
      sosNearbyTotalCount,
    ] = await Promise.all([
      // 1. Orders in last 30 days (for daily chart)
      prisma.order.findMany({
        where: {
          pharmacyId,
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ['COMPLETED', 'READY', 'PREPARING', 'ACCEPTED', 'PENDING'] },
        },
        select: { totalAmount: true, createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
      // 2. Current month completed orders
      prisma.order.findMany({
        where: {
          pharmacyId,
          createdAt: { gte: currentMonthStart },
          status: { in: ['COMPLETED'] },
        },
        select: { totalAmount: true },
      }),
      // 3. Previous month completed orders (for comparison)
      prisma.order.findMany({
        where: {
          pharmacyId,
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
          status: { in: ['COMPLETED'] },
        },
        select: { totalAmount: true },
      }),
      // 4. Total lifetime orders
      prisma.order.count({ where: { pharmacyId } }),
      // 5. All inventory (to find top medicine by quantity sold — proxy: lowest stock + highest usage)
      prisma.inventory.findMany({
        where: { pharmacyId },
        orderBy: { quantity: 'asc' },
        take: 10,
        select: { name: true, genericName: true, quantity: true, price: true },
      }),
      // 6. SOS requests accepted by this pharmacy
      prisma.pharmacyResponse.count({
        where: { pharmacyId, response: 'accepted' },
      }),
      // 7. Total SOS requests this pharmacy has been shown (accepted + rejected)
      prisma.pharmacyResponse.count({
        where: { pharmacyId },
      }),
    ]);

    // ── Build daily revenue chart data (last 30 days) ──
    const dailyMap = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
    }
    recentOrders.forEach((order) => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.get(key).revenue += order.totalAmount || 0;
        dailyMap.get(key).orders += 1;
      }
    });
    const dailyRevenue = Array.from(dailyMap.values()).map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(d.revenue * 100) / 100,
      orders: d.orders,
    }));

    // ── Monthly revenue ──
    const currentMonthRevenue = currentMonthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevMonthRevenue = prevMonthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const revenueGrowth = prevMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : currentMonthRevenue > 0 ? 100 : 0;

    // ── Top medicine (best guess: lowest stock = most sold) ──
    const topMedicine = inventoryItems.length > 0
      ? { name: inventoryItems[0].name, genericName: inventoryItems[0].genericName }
      : { name: "N/A", genericName: "N/A" };

    // ── SOS response rate ──
    const sosResponseRate = sosNearbyTotalCount > 0
      ? Math.round((sosAcceptedCount / sosNearbyTotalCount) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        dailyRevenue,
        stats: {
          monthlyRevenue: Math.round(currentMonthRevenue * 100) / 100,
          prevMonthRevenue: Math.round(prevMonthRevenue * 100) / 100,
          revenueGrowth,
          totalOrders: totalOrdersCount,
          currentMonthOrders: currentMonthOrders.length,
          topMedicine,
          sosResponseRate,
          sosAccepted: sosAcceptedCount,
          sosTotal: sosNearbyTotalCount,
        },
      },
      message: "Analytics data retrieved successfully",
    });
  } catch (error) {
    logger.error('[PHARMACY] getAnalyticsData error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/pharmacy/reports/export-inventory
 * Export current pharmacy inventory as CSV
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const exportInventoryCSV = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let createdAtFilter;
    if (startDate || endDate) {
      const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
      const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD for startDate and endDate.",
        });
      }

      if (start && end && start > end) {
        return res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate.",
        });
      }

      createdAtFilter = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);
    if (!pharmacy) return res.status(404).json({ success: false, message: "Pharmacy not found." });
    if (pharmacy.verificationStatus !== 'VERIFIED') return res.status(403).json({ success: false, message: "Not verified." });

    const inventory = await prisma.inventory.findMany({
      where: {
        pharmacyId: pharmacy.id,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { name: 'asc' },
    });

    // Build CSV
    const headers = ['Name', 'Generic Name', 'Quantity', 'Price (NPR)', 'Expiry Date', 'Added On'];
    const rows = inventory.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.genericName.replace(/"/g, '""')}"`,
      item.quantity,
      item.price,
      item.expiryDate.toISOString().split('T')[0],
      item.createdAt.toISOString().split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_${pharmacy.pharmacyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    logger.error('[PHARMACY] exportInventoryCSV error', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/pharmacy/reports/export-sales
 * Export completed orders as CSV
 * Requires: Authentication, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
export const exportSalesCSV = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let createdAtFilter;
    if (startDate || endDate) {
      const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
      const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD for startDate and endDate.",
        });
      }

      if (start && end && start > end) {
        return res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate.",
        });
      }

      createdAtFilter = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const pharmacy = await pharmacyService.getPharmacyByUserId(userId);
    if (!pharmacy) return res.status(404).json({ success: false, message: "Pharmacy not found." });
    if (pharmacy.verificationStatus !== 'VERIFIED') return res.status(403).json({ success: false, message: "Not verified." });

    const orders = await prisma.order.findMany({
      where: {
        pharmacyId: pharmacy.id,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      include: {
        patient: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Order ID', 'Patient Name', 'Patient Email', 'Patient Phone', 'Status', 'Amount (NPR)', 'Notes', 'Order Date'];
    const rows = orders.map((o) => [
      o.id,
      `"${(o.patient?.name || 'N/A').replace(/"/g, '""')}"`,
      o.patient?.email || 'N/A',
      o.patient?.phone || 'N/A',
      o.status,
      o.totalAmount || 0,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
      o.createdAt.toISOString().split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales_${pharmacy.pharmacyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    logger.error('[PHARMACY] exportSalesCSV error', { error: error.message });
    next(error);
  }
};

export default {
  onboardPharmacy,
  getMyPharmacy,
  getPharmacyCatalog,
  getPharmacyInventory,
  getKhaltiSettings,
  updateKhaltiSettings,
  getPendingPharmacies,
  getAllPharmacies,
  getPharmacyById,
  verifyPharmacy,
  rejectPharmacy,
  updatePharmacyStatus,
  resetOnboarding,
  getNearbySOS,
  respondToSOS,
  rejectSOS,
  completeSOS,
  updateSOSStatus,
  updateLocation,
  getDashboardStats,
  getPharmacyOrders,
  getPharmacyCustomers,
  getAnalyticsData,
  exportInventoryCSV,
  exportSalesCSV,
};
