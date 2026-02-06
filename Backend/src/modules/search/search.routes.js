/**
 * Search Routes - Medicine and pharmacy search endpoints
 * 
 * All routes are public (no authentication required) to allow
 * anonymous users to search for medicines before logging in.
 * 
 * Optional authentication: If user is logged in, their ID will be
 * included in analytics logs.
 * 
 * Endpoints:
 * - GET /api/search                - Search medicines by name/generic
 * - GET /api/search/nearby         - Find nearby pharmacies
 * - GET /api/search/stats          - Get search statistics
 */

import express from "express";
import searchController from "./search.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = express.Router();

// ============================================
// MEDICINE SEARCH ROUTES
// Public endpoints (authentication optional)
// ============================================

/**
 * GET /api/search
 * Search for medicines by name or generic name
 * 
 * Query Parameters:
 * @param {string} query - Search term (required)
 * @param {number} latitude - User's latitude (optional)
 * @param {number} longitude - User's longitude (optional)
 * @param {boolean} includeOutOfStock - Include out-of-stock items (default: false)
 * @param {number} maxDistance - Maximum distance in km (optional)
 * @param {number} limit - Maximum results (default: 50, max: 100)
 * 
 * Examples:
 * - Basic search: /api/search?query=Cetamol
 * - With location: /api/search?query=Paracetamol&latitude=27.7172&longitude=85.3240
 * - With filters: /api/search?query=Cetamol&maxDistance=5&includeOutOfStock=true
 * 
 * Response:
 * Returns array of medicines with pharmacy details and distance (if location provided)
 */
router.get(
  "/search",
  authenticate({ optional: true }), // Optional auth for analytics
  searchController.searchMedicines
);

/**
 * GET /api/search/nearby
 * Find pharmacies near a specific location
 * 
 * Query Parameters:
 * @param {number} latitude - User's latitude (required)
 * @param {number} longitude - User's longitude (required)
 * @param {number} radius - Search radius in km (default: 10, max: 50)
 * @param {number} limit - Maximum results (default: 50, max: 100)
 * 
 * Examples:
 * - /api/search/nearby?latitude=27.7172&longitude=85.3240
 * - /api/search/nearby?latitude=27.7172&longitude=85.3240&radius=5&limit=10
 * 
 * Response:
 * Returns array of pharmacies sorted by distance with their inventory count
 */
router.get(
  "/search/nearby",
  authenticate({ optional: true }), // Optional auth for analytics
  searchController.findNearbyPharmacies
);

/**
 * GET /api/search/stats
 * Get search statistics for analytics
 * 
 * Query Parameters:
 * @param {string} query - Search term (required)
 * 
 * Examples:
 * - /api/search/stats?query=Cetamol
 * 
 * Response:
 * Returns statistics about search results (total, in-stock, price range, etc.)
 */
router.get(
  "/search/stats",
  authenticate({ optional: true }), // Optional auth
  searchController.getSearchStats
);

export default router;
