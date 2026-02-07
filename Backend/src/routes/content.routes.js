/**
 * Content Routes - Public health tips and announcements
 * Accessible by all authenticated users (patients, pharmacies, admins)
 */

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import contentController from "../controllers/content.controller.js";

const router = express.Router();

/**
 * GET /api/content/health-tips
 * Get all active health tips
 * @access Authenticated users (any role)
 */
router.get(
  "/health-tips",
  authenticate(),
  contentController.getActiveHealthTips
);

/**
 * GET /api/content/health-tips/latest
 * Get single most recent active health tip
 * @access Authenticated users (any role)
 */
router.get(
  "/health-tips/latest",
  authenticate(),
  contentController.getLatestHealthTip
);

/**
 * GET /api/content/health-tips/category/:category
 * Get health tips by category
 * @access Authenticated users (any role)
 */
router.get(
  "/health-tips/category/:category",
  authenticate(),
  contentController.getHealthTipsByCategory
);

/**
 * GET /api/content/announcements
 * Get all active announcements (optionally filtered by target role)
 * Query: ?targetRole=PATIENT|PHARMACY|ADMIN
 * @access Authenticated users (any role)
 */
router.get(
  "/announcements",
  authenticate(),
  contentController.getActiveAnnouncements
);

/**
 * GET /api/content/announcements/priority
 * Get single highest priority announcement for role
 * Query: ?targetRole=PATIENT|PHARMACY|ADMIN (required)
 * @access Authenticated users (any role)
 */
router.get(
  "/announcements/priority",
  authenticate(),
  contentController.getHighPriorityAnnouncement
);

export default router;
