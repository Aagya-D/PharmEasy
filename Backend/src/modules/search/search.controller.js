// Search controller for medicine and pharmacy discovery endpoints.

import { asyncHandler } from "../../middlewares/errorHandler.js";
import searchService from "./search.service.js";
import { BadRequestError } from "../../utils/errors.js";
import logger from "../../utils/logger.js";

class SearchController {
  // Universal search endpoint for medicines and pharmacies.
  getUniversalSearchResults = asyncHandler(async (req, res) => {
    const {
      query,
      lat,
      lng,
      latitude,
      longitude,
      includeOutOfStock,
      medicineLimit,
      pharmacyLimit,
    } = req.query;

    // Query text is required for all universal searches.
    if (!query || !query.trim()) {
      throw new BadRequestError("Search query parameter is required");
    }

    // Support both lat/lng and latitude/longitude query names.
    const resolvedLat = lat ?? latitude;
    const resolvedLng = lng ?? longitude;

    // Parse optional coordinate pair.
    const parsedLatitude =
      resolvedLat !== undefined ? parseFloat(resolvedLat) : undefined;
    const parsedLongitude =
      resolvedLng !== undefined ? parseFloat(resolvedLng) : undefined;

    const hasLatitude = Number.isFinite(parsedLatitude);
    const hasLongitude = Number.isFinite(parsedLongitude);

    // Require coordinates to be provided as a complete pair.
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestError(
        "Both lat and lng must be provided together"
      );
    }

    // Validate coordinate range when present.
    if (
      hasLatitude &&
      (parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      throw new BadRequestError("Invalid latitude or longitude");
    }

    // Run universal search with normalized parameters.
    const results = await searchService.getUniversalSearchResults({
      query: query.trim(),
      latitude: hasLatitude ? parsedLatitude : undefined,
      longitude: hasLongitude ? parsedLongitude : undefined,
      includeOutOfStock: includeOutOfStock === "true",
      medicineLimit: medicineLimit
        ? Math.min(Math.max(parseInt(medicineLimit, 10), 1), 20)
        : 8,
      pharmacyLimit: pharmacyLimit
        ? Math.min(Math.max(parseInt(pharmacyLimit, 10), 1), 20)
        : 8,
    });

    logger.info("Universal search query", {
      query: query.trim(),
      hasLocation: hasLatitude,
      coordinates: hasLatitude
        ? { lat: parsedLatitude, lng: parsedLongitude }
        : null,
      medicineResults: results.medicines.length,
      pharmacyResults: results.pharmacies.length,
      userId: req.user?.id,
    });

    res.status(200).json({
      success: true,
      data: {
        medicines: results.medicines,
        pharmacies: results.pharmacies,
      },
      meta: {
        query: query.trim(),
        hasUserLocation: hasLatitude,
      },
    });
  });

  // Search medicines by text query and optional location context.
  searchMedicines = asyncHandler(async (req, res) => {
    const {
      query,
      latitude,
      longitude,
      includeOutOfStock,
      maxDistance,
      limit,
    } = req.query;

    // Require query term.
    if (!query) {
      throw new BadRequestError("Search query parameter is required");
    }

    // Parse and normalize query params.
    const parsedParams = {
      query: query.trim(),
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      includeOutOfStock: includeOutOfStock === "true",
      maxDistance: maxDistance ? parseFloat(maxDistance) : 50,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
    };

    // Require coordinates as a complete pair.
    if (
      (parsedParams.latitude && !parsedParams.longitude) ||
      (!parsedParams.latitude && parsedParams.longitude)
    ) {
      throw new BadRequestError(
        "Both latitude and longitude must be provided together"
      );
    }

    // Log search request metadata.
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

    // Execute search service query.
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

  // Find nearby pharmacies by coordinates and optional radius.
  findNearbyPharmacies = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius, limit } = req.query;

    // Require coordinates.
    if (!latitude || !longitude) {
      throw new BadRequestError("Latitude and longitude are required");
    }

    // Parse and clamp radius/limit.
    const parsedParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius ? Math.min(parseFloat(radius), 100) : 50,
      limit: limit ? Math.min(parseInt(limit), 100) : 50,
    };

    // Validate numeric coordinate values.
    if (isNaN(parsedParams.latitude) || isNaN(parsedParams.longitude)) {
      throw new BadRequestError("Invalid latitude or longitude");
    }

    // Log nearby-search request metadata.
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

    // Execute nearby pharmacy search.
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

  // Return aggregated search statistics for a query.
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

  // Return top medicines near user location for patient storefront.
  getTopMedicinesNearUser = asyncHandler(async (req, res) => {
    const { lat, lng, latitude, longitude, limit, category } = req.query;

    // Resolve both coordinate naming variants.
    const resolvedLat = lat ?? latitude;
    const resolvedLng = lng ?? longitude;

    const parsedLatitude =
      resolvedLat !== undefined ? parseFloat(resolvedLat) : undefined;
    const parsedLongitude =
      resolvedLng !== undefined ? parseFloat(resolvedLng) : undefined;

    const hasLatitude = Number.isFinite(parsedLatitude);
    const hasLongitude = Number.isFinite(parsedLongitude);

    // Validate coordinate pair when provided.
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestError("Both lat and lng must be provided together");
    }

    // Validate coordinate ranges.
    if (
      hasLatitude &&
      (parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      throw new BadRequestError("Invalid latitude or longitude");
    }

    // Query top medicines with optional category filter.
    const medicines = await searchService.getTopMedicinesNearLocation({
      latitude: hasLatitude ? parsedLatitude : undefined,
      longitude: hasLongitude ? parsedLongitude : undefined,
      limit: limit ? Math.min(Math.max(parseInt(limit, 10), 1), 12) : 8,
      category: category ? String(category).trim() : undefined,
    });

    res.status(200).json({
      success: true,
      data: medicines,
      meta: {
        hasUserLocation: hasLatitude,
        category: category || null,
        totalResults: medicines.length,
      },
    });
  });
}

export default new SearchController();
