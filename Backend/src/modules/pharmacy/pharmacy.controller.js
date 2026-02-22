/**
 * Pharmacy Controller - HTTP request handlers for pharmacy operations
 * Handles pharmacy onboarding and admin verification endpoints
 */

import pharmacyService from "./pharmacy.service.js";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import prisma from "../../database/prisma.js";
import notificationService from "../notifications/notification.service.js";

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
      include: {
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
      // 2. Low stock items (quantity < 10)
      prisma.inventory.count({
        where: { pharmacyId, quantity: { gt: 0, lt: 10 } },
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
        where: { pharmacyId, status: 'pending' },
      }),
      // 8. Fulfilled/delivered orders
      prisma.order.count({
        where: { pharmacyId, status: { in: ['delivered', 'fulfilled', 'confirmed'] } },
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
      where.status = status;
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
        status: { in: ['delivered', 'fulfilled', 'confirmed'] },
      },
      _sum: { totalAmount: true },
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        stats: {
          total: totalCount,
          pending: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: 'pending' } }),
          fulfilled: await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: { in: ['delivered', 'fulfilled', 'confirmed'] } } }),
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
  getDashboardStats,
  getPharmacyOrders,
};
