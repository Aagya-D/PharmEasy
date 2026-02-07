/**
 * Search Controller - Handles medicine search requests
 * 
 * Provides endpoints for:
 * - Text-based medicine search with geolocation
 * - Finding nearby pharmacies
 * - Search analytics
 */

import { asyncHandler } from "../../middlewares/errorHandler.js";
import searchService from "./search.service.js";
import { BadRequestError } from "../../utils/errors.js";
import logger from "../../utils/logger.js";

class SearchController {
  /**
   * Search for medicines by name or generic name
   * 
   * GET /api/search?query=Cetamol&latitude=27.7172&longitude=85.3240
   * 
   * Query Parameters:
   * - query: Search term (required)
   * - latitude: User's latitude (optional, enables distance sorting)
   * - longitude: User's longitude (optional, enables distance sorting)
   * - includeOutOfStock: Include out-of-stock items (default: false)
   * - maxDistance: Maximum distance in km (optional)
   * - limit: Maximum results (default: 50, max: 100)
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "medicine": "Cetamol 500mg",
   *       "genericName": "Paracetamol",
   *       "price": 50,
   *       "quantity": 100,
   *       "inStock": true,
   *       "pharmacy": {
   *         "id": "uuid",
   *         "name": "City Meds",
   *         "address": "Kathmandu",
   *         "contactNumber": "9841234567",
   *         "location": { "lat": 27.7, "lng": 85.3 }
   *       },
   *       "distance": 1.2,
   *       "distanceFormatted": "1.2 km"
   *     }
   *   ],
   *   "meta": {
   *     "query": "Cetamol",
   *     "totalResults": 5,
   *     "hasUserLocation": true
   *   }
   * }
   */
  searchMedicines = asyncHandler(async (req, res) => {
    const {
      query,
      latitude,
      longitude,
      includeOutOfStock,
      maxDistance,
      limit,
    } = req.query;

    // Validate query parameter
    if (!query) {
      throw new BadRequestError("Search query parameter is required");
    }

    // Parse numeric parameters
    const parsedParams = {
      query: query.trim(),
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      includeOutOfStock: includeOutOfStock === "true",
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
    };

    // Validate that if one coordinate is provided, both must be provided
    if (
      (parsedParams.latitude && !parsedParams.longitude) ||
      (!parsedParams.latitude && parsedParams.longitude)
    ) {
      throw new BadRequestError(
        "Both latitude and longitude must be provided together"
      );
    }

    // Log search query for analytics
    logger.info("Medicine search query", {
      query: parsedParams.query,
      hasLocation: !!parsedParams.latitude,
      coordinates: parsedParams.latitude ? { lat: parsedParams.latitude, lng: parsedParams.longitude } : null,
      userId: req.user?.id,
    });

    console.log('[SEARCH CONTROLLER] Medicine search request:', {
      query: parsedParams.query,
      latitude: parsedParams.latitude || 'NOT PROVIDED',
      longitude: parsedParams.longitude || 'NOT PROVIDED',
      maxDistance: parsedParams.maxDistance,
      includeOutOfStock: parsedParams.includeOutOfStock,
    });

    // Perform search
    const results = await searchService.searchMedicines(parsedParams);

    res.status(200).json({
      success: true,
      data: results,
      meta: {
        query: parsedParams.query,
        totalResults: results.length,
        hasUserLocation: !!parsedParams.latitude,
        maxDistance: parsedParams.maxDistance,
        includeOutOfStock: parsedParams.includeOutOfStock,
      },
    });
  });

  /**
   * Find nearby pharmacies
   * 
   * GET /api/search/nearby?latitude=27.7172&longitude=85.3240&radius=10
   * 
   * Query Parameters:
   * - latitude: User's latitude (required)
   * - longitude: User's longitude (required)
   * - radius: Search radius in km (default: 10, max: 50)
   * - limit: Maximum results (default: 50, max: 100)
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "name": "City Meds",
   *       "address": "Kathmandu",
   *       "contactNumber": "9841234567",
   *       "location": { "lat": 27.7, "lng": 85.3 },
   *       "distance": 1.2,
   *       "distanceFormatted": "1.2 km",
   *       "medicinesInStock": 150
   *     }
   *   ],
   *   "meta": {
   *     "totalResults": 5,
   *     "radius": 10,
   *     "center": { "lat": 27.7172, "lng": 85.3240 }
   *   }
   * }
   */
  findNearbyPharmacies = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius, limit } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      throw new BadRequestError("Latitude and longitude are required");
    }

    // Parse parameters
    const parsedParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius ? Math.min(parseFloat(radius), 50) : 10,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
    };

    // Validate numeric values
    if (isNaN(parsedParams.latitude) || isNaN(parsedParams.longitude)) {
      throw new BadRequestError("Invalid latitude or longitude");
    }

    // Log request
    logger.info("Nearby pharmacies search", {
      location: {
        lat: parsedParams.latitude,
        lng: parsedParams.longitude,
      },
      radius: parsedParams.radius,
      userId: req.user?.id,
    });

    console.log('[SEARCH CONTROLLER] Nearby pharmacies request:', {
      latitude: parsedParams.latitude,
      longitude: parsedParams.longitude,
      radius: `${parsedParams.radius}km`,
      limit: parsedParams.limit,
    });

    // Perform search
    const results = await searchService.findNearbyPharmacies(parsedParams);

    console.log('[SEARCH CONTROLLER] Nearby pharmacies result:', {
      found: results.length,
      radius: parsedParams.radius,
      location: { lat: parsedParams.latitude.toFixed(4), lng: parsedParams.longitude.toFixed(4) },
    });

    res.status(200).json({
      success: true,
      data: results,
      meta: {
        totalResults: results.length,
        radius: parsedParams.radius,
        center: {
          lat: parsedParams.latitude,
          lng: parsedParams.longitude,
        },
      },
    });
  });

  /**
   * Get search statistics (analytics)
   * 
   * GET /api/search/stats?query=Cetamol
   * 
   * Query Parameters:
   * - query: Search term (required)
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "totalResults": 10,
   *     "inStock": 8,
   *     "outOfStock": 2,
   *     "uniquePharmacies": 5,
   *     "priceRange": {
   *       "min": 40,
   *       "max": 60,
   *       "avg": 50
   *     }
   *   }
   * }
   */
  getSearchStats = asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query) {
      throw new BadRequestError("Search query parameter is required");
    }

    const stats = await searchService.getSearchStats(query.trim());

    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export default new SearchController();
