// Admin routes. All endpoints require authenticated system admin access.

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { requireSystemAdmin } from "../middlewares/adminAuth.js";
import adminController from "../controllers/admin.controller.js";

const router = express.Router();

// List pharmacies waiting for verification.
router.get(
  "/pharmacies/pending",
  authenticate(),
  requireSystemAdmin,
  adminController.getPendingPharmacies
);

// List all pharmacies with optional status filtering.
router.get(
  "/pharmacies",
  authenticate(),
  requireSystemAdmin,
  adminController.getAllPharmacies
);

// Get one pharmacy by ID.
router.get(
  "/pharmacy/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.getPharmacyById
);

// Approve a pharmacy application.
router.patch(
  "/pharmacy/:id/approve",
  authenticate(),
  requireSystemAdmin,
  adminController.approvePharmacy
);

// Reject a pharmacy application with reason.
router.patch(
  "/pharmacy/:id/reject",
  authenticate(),
  requireSystemAdmin,
  adminController.rejectPharmacy
);

// Update admin profile.
router.patch(
  "/profile",
  authenticate(),
  requireSystemAdmin,
  adminController.updateProfile
);

// Change admin password.
router.patch(
  "/change-password",
  authenticate(),
  requireSystemAdmin,
  adminController.changePassword
);

// Get users with optional role/search/status filters.
router.get(
  "/users",
  authenticate(),
  requireSystemAdmin,
  adminController.getAllUsers
);

// Get activity logs with filters and pagination.
router.get(
  "/logs",
  authenticate(),
  requireSystemAdmin,
  adminController.getLogs
);

// Get SOS map/location data for admin dashboards.
router.get(
  "/sos-locations",
  authenticate(),
  requireSystemAdmin,
  adminController.getSOSLocations
);

// Get cross-pharmacy inventory insights.
router.get(
  "/inventory/insights",
  authenticate(),
  requireSystemAdmin,
  adminController.getInventoryInsights
);

// Send restock alerts for selected medicine shortages.
router.post(
  "/inventory/restock-alert",
  authenticate(),
  requireSystemAdmin,
  adminController.sendRestockAlert
);

// Get all health tips.
router.get(
  "/health-tips",
  authenticate(),
  requireSystemAdmin,
  adminController.getHealthTips
);

// Create a health tip.
router.post(
  "/health-tips",
  authenticate(),
  requireSystemAdmin,
  adminController.createHealthTip
);

// Update a health tip.
router.patch(
  "/health-tips/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.updateHealthTip
);

// Delete a health tip.
router.delete(
  "/health-tips/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.deleteHealthTip
);

// Get all announcements.
router.get(
  "/announcements",
  authenticate(),
  requireSystemAdmin,
  adminController.getAnnouncements
);

// Create an announcement.
router.post(
  "/announcements",
  authenticate(),
  requireSystemAdmin,
  adminController.createAnnouncement
);

// Update an announcement.
router.patch(
  "/announcements/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.updateAnnouncement
);

// Delete an announcement.
router.delete(
  "/announcements/:id",
  authenticate(),
  requireSystemAdmin,
  adminController.deleteAnnouncement
);

export default router;
