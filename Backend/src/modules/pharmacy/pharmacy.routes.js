/**
 * Pharmacy Routes - API endpoints for pharmacy onboarding and verification
 * 
 * Pharmacy User Routes:
 * - POST   /api/pharmacy/onboard      - Submit pharmacy onboarding
 * - GET    /api/pharmacy/my-pharmacy  - Get own pharmacy status
 * 
 * Admin Routes:
 * - GET    /api/admin/pharmacies/pending    - Get pending pharmacies
 * - GET    /api/admin/pharmacies            - Get all pharmacies (with filters)
 * - GET    /api/admin/pharmacy/:id          - Get specific pharmacy
 * - PATCH  /api/admin/pharmacy/:id/verify   - Approve pharmacy
 * - PATCH  /api/admin/pharmacy/:id/reject   - Reject pharmacy
 * - PATCH  /api/admin/pharmacy/:id/status   - Update pharmacy status
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePharmacyAdmin, requireSystemAdmin } from "../../middlewares/roleCheck.js";
import { uploadLicenseDocument, handleUploadError } from "../../middlewares/upload.middleware.js";
import pharmacyController from "./pharmacy.controller.js";

const router = express.Router();

// ============================================
// PHARMACY USER ROUTES
// ============================================

/**
 * POST /api/pharmacy/onboard
 * Submit pharmacy onboarding details with license document
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN)
 * Accepts: multipart/form-data with REQUIRED "licenseDocument" file (PDF/JPG/PNG, max 5MB)
 * Field name for file upload: "licenseDocument"
 */
router.post(
  "/pharmacy/onboard",
  authenticate(),
  requirePharmacyAdmin,
  uploadLicenseDocument, // Cloudinary upload middleware
  handleUploadError, // Handle multer/upload errors
  pharmacyController.onboardPharmacy
);

/**
 * GET /api/pharmacy/my-pharmacy
 * Get authenticated user's pharmacy details and status
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN)
 */
router.get(
  "/pharmacy/my-pharmacy",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.getMyPharmacy
);

/**
 * POST /api/pharmacy/reset-onboarding
 * Reset pharmacy onboarding status after rejection
 * Allows rejected pharmacies to resubmit their application
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), current status=REJECTED
 */
router.post(
  "/pharmacy/reset-onboarding",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.resetOnboarding
);

/**
 * GET /api/pharmacy/sos/nearby
 * Get nearby pending SOS requests based on pharmacy location
 * Query params: ?radius=10 (default 10km)
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
router.get(
  "/pharmacy/sos/nearby",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.getNearbySOS
);

/**
 * POST /api/pharmacy/sos/:id/respond
 * Respond to an SOS request (accept or reject)
 * Body: { response: 'accepted' | 'rejected', note?: string }
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
router.post(
  "/pharmacy/sos/:id/respond",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.respondToSOS
);

// ============================================
// SYSTEM ADMIN ROUTES
// ============================================

/**
 * GET /api/admin/pharmacies/pending
 * Get all pharmacies with PENDING_VERIFICATION status
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.get(
  "/admin/pharmacies/pending",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.getPendingPharmacies
);

/**
 * GET /api/admin/pharmacies
 * Get all pharmacies with optional status filter
 * Query params: ?status=PENDING_VERIFICATION|VERIFIED|REJECTED
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.get(
  "/admin/pharmacies",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.getAllPharmacies
);

/**
 * GET /api/admin/pharmacy/:id
 * Get specific pharmacy details by ID
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.get(
  "/admin/pharmacy/:id",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.getPharmacyById
);

/**
 * PATCH /api/admin/pharmacy/:id/verify
 * Approve a pharmacy (set status to VERIFIED)
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.patch(
  "/admin/pharmacy/:id/verify",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.verifyPharmacy
);

/**
 * PATCH /api/admin/pharmacy/:id/reject
 * Reject a pharmacy (set status to REJECTED)
 * Body: { reason: string }
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.patch(
  "/admin/pharmacy/:id/reject",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.rejectPharmacy
);

/**
 * PATCH /api/admin/pharmacy/:id/status
 * Update pharmacy verification status
 * Body: { status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED", reason?: string }
 * Requires: JWT token, roleId=1 (SYSTEM_ADMIN)
 */
router.patch(
  "/admin/pharmacy/:id/status",
  authenticate(),
  requireSystemAdmin,
  pharmacyController.updatePharmacyStatus
);

/**
 * GET /api/pharmacy/dashboard-stats
 * Get real-time dashboard statistics for the logged-in pharmacy
 * Returns: totalItems, lowStock, pendingSOS, totalOrders, etc.
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
router.get(
  "/pharmacy/dashboard-stats",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.getDashboardStats
);

/**
 * GET /api/pharmacy/orders
 * Get orders for the logged-in pharmacy with pagination
 * Query params: ?page=1&limit=50&status=pending
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
router.get(
  "/pharmacy/orders",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.getPharmacyOrders
);

/**
 * PATCH /api/pharmacy/update-location
 * Update pharmacy location (latitude, longitude, address)
 * Requires: JWT token, roleId=2 (PHARMACY_ADMIN), VERIFIED pharmacy
 */
router.patch(
  "/pharmacy/update-location",
  authenticate(),
  requirePharmacyAdmin,
  pharmacyController.updateLocation
);

export default router;
