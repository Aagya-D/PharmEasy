/**
 * Admin Routes - System Admin pharmacy verification
 * All routes require authentication AND roleId=1
 */

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { requireSystemAdmin } from "../middlewares/adminAuth.js";
import adminController from "../controllers/admin.controller.js";

const router = express.Router();

/**
 * GET /api/admin/pharmacies/pending
 * Get all pharmacies with PENDING_VERIFICATION status
 * Requires: JWT + roleId=1
 */
router.get(
  "/pharmacies/pending",
  authenticate(),
  requireSystemAdmin,
  adminController.getPendingPharmacies
);

/**
 * GET /api/admin/pharmacies
 * Get all pharmacies with optional status filter
 * Query: ?status=PENDING_VERIFICATION|VERIFIED|REJECTED
 * Requires: JWT + roleId=1
 */
router.get(
  "/pharmacies",
  authenticate(),
  requireSystemAdmin,
  adminController.getAllPharmacies
);

/**
 * GET /api/admin/pharmacy/:id
 * Get specific pharmacy details
 * Requires: JWT + roleId=1
 */
router.get(
  "/pharmacy/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.getPharmacyById
);

/**
 * PATCH /api/admin/pharmacy/:id/approve
 * Approve pharmacy (set verificationStatus=VERIFIED)
 * Requires: JWT + roleId=1
 */
router.patch(
  "/pharmacy/:id/approve",
  authenticate(),
  requireSystemAdmin,
  adminController.approvePharmacy
);

/**
 * PATCH /api/admin/pharmacy/:id/reject
 * Reject pharmacy (set verificationStatus=REJECTED)
 * Body: { reason: string }
 * Requires: JWT + roleId=1
 */
router.patch(
  "/pharmacy/:id/reject",
  authenticate(),
  requireSystemAdmin,
  adminController.rejectPharmacy
);

/**
 * PATCH /api/admin/profile
 * Update admin profile (name, email, phone)
 * Requires: JWT + roleId=1
 */
router.patch(
  "/profile",
  authenticate(),
  requireSystemAdmin,
  adminController.updateProfile
);

/**
 * PATCH /api/admin/change-password
 * Change password with current password verification
 * Body: { currentPassword: string, newPassword: string }
 * Requires: JWT + roleId=1
 */
router.patch(
  "/change-password",
  authenticate(),
  requireSystemAdmin,
  adminController.changePassword
);

/**
 * GET /api/admin/users
 * Get all users with filtering options
 * Query: ?role=1|2|3&search=text&status=APPROVED|PENDING|REJECTED
 * Requires: JWT + roleId=1
 */
router.get(
  "/users",
  authenticate(),
  requireSystemAdmin,
  adminController.getAllUsers
);

/**
 * GET /api/admin/logs
 * Get activity logs with filtering and pagination
 * Query: ?category=AUTH|PHARMACY|SYSTEM&userId=xxx&action=xxx&skip=0&take=50
 * Requires: JWT + roleId=1
 */
router.get(
  "/logs",
  authenticate(),
  requireSystemAdmin,
  adminController.getLogs
);

/**
 * GET /api/admin/sos-locations
 * Get all SOS emergency location requests from patients
 * Query: ?status=pending|fulfilled&limit=100
 * Requires: JWT + roleId=1
 */
router.get(
  "/sos-locations",
  authenticate(),
  requireSystemAdmin,
  adminController.getSOSLocations
);

/**
 * GET /api/admin/inventory/insights
 * Get inventory insights and shortage analysis across all pharmacies
 * Requires: JWT + roleId=1
 */
router.get(
  "/inventory/insights",
  authenticate(),
  requireSystemAdmin,
  adminController.getInventoryInsights
);

/**
 * POST /api/admin/inventory/restock-alert
 * Send restock alert to affected pharmacies
 * Body: { genericName: string, message: string }
 * Requires: JWT + roleId=1
 */
router.post(
  "/inventory/restock-alert",
  authenticate(),
  requireSystemAdmin,
  adminController.sendRestockAlert
);

/**
 * GET /api/admin/health-tips
 * Get all health tips
 * Requires: JWT + roleId=1
 */
router.get(
  "/health-tips",
  authenticate(),
  requireSystemAdmin,
  adminController.getHealthTips
);

/**
 * POST /api/admin/health-tips
 * Create a new health tip
 * Body: { title, content, category, imageUrl?, isActive? }
 * Requires: JWT + roleId=1
 */
router.post(
  "/health-tips",
  authenticate(),
  requireSystemAdmin,
  adminController.createHealthTip
);

/**
 * PATCH /api/admin/health-tips/:id
 * Update a health tip
 * Body: { title?, content?, category?, imageUrl?, isActive? }
 * Requires: JWT + roleId=1
 */
router.patch(
  "/health-tips/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.updateHealthTip
);

/**
 * DELETE /api/admin/health-tips/:id
 * Delete a health tip
 * Requires: JWT + roleId=1
 */
router.delete(
  "/health-tips/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.deleteHealthTip
);

/**
 * GET /api/admin/announcements
 * Get all announcements
 * Requires: JWT + roleId=1
 */
router.get(
  "/announcements",
  authenticate(),
  requireSystemAdmin,
  adminController.getAnnouncements
);

/**
 * POST /api/admin/announcements
 * Create a new announcement
 * Body: { title, content, type?, priority?, targetRole?, publishDate?, expiryDate?, isActive? }
 * Requires: JWT + roleId=1
 */
router.post(
  "/announcements",
  authenticate(),
  requireSystemAdmin,
  adminController.createAnnouncement
);

/**
 * PATCH /api/admin/announcements/:id
 * Update an announcement
 * Body: { title?, content?, type?, priority?, targetRole?, publishDate?, expiryDate?, isActive? }
 * Requires: JWT + roleId=1
 */
router.patch(
  "/announcements/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.updateAnnouncement
);

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement
 * Requires: JWT + roleId=1
 */
router.delete(
  "/announcements/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.deleteAnnouncement
);

export default router;
