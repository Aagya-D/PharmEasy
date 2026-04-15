// Content routes for health tips and announcements.

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import contentController from "../controllers/content.controller.js";

const router = express.Router();

// Get all active health tips.
router.get(
  "/health-tips",
  authenticate(),
  contentController.getActiveHealthTips
);

// Get the latest active health tip.
router.get(
  "/health-tips/latest",
  authenticate(),
  contentController.getLatestHealthTip
);

// Get active health tips by category.
router.get(
  "/health-tips/category/:category",
  authenticate(),
  contentController.getHealthTipsByCategory
);

// Get active announcements with optional target role filter.
router.get(
  "/announcements",
  authenticate(),
  contentController.getActiveAnnouncements
);

// Get highest-priority announcement for target role.
router.get(
  "/announcements/priority",
  authenticate(),
  contentController.getHighPriorityAnnouncement
);

export default router;
