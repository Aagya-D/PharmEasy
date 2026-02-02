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

export default router;
