/**
 * Search Service - Medicine search with geospatial features
 * 
 * Provides functionality to:
 * - Search medicines by name or generic name
 * - Calculate distance from user to pharmacies
 * - Sort results by proximity
 * - Filter out of stock items (optional)
 */

import { prisma } from "../../database/prisma.js";
import { calculateDistance, formatDistance } from "../../utils/distance.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";

class SearchService {
  /**
   * Search for medicines with geospatial filtering
   * 
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search term (medicine name or generic name)
   * @param {number} [params.latitude] - User's latitude
   * @param {number} [params.longitude] - User's longitude
   * @param {boolean} [params.includeOutOfStock=false] - Include medicines with 0 quantity
   * @param {number} [params.maxDistance] - Maximum distance in km (optional)
   * @param {number} [params.limit=50] - Maximum results to return
   * @returns {Promise<Array>} Array of search results with pharmacy and distance info
   */
  async searchMedicines({ query, latitude, longitude, includeOutOfStock = false, maxDistance, limit = 50 }) {
    // Validate search query
    if (!query || query.trim().length === 0) {
      throw new BadRequestError("Search query is required");
    }

    // Trim and prepare search term
    const searchTerm = query.trim();

    // Build Prisma query
    const whereClause = {
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          genericName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
      // Optionally filter out out-of-stock items
      ...(includeOutOfStock ? {} : { quantity: { gt: 0 } }),
      // Only include inventory from verified pharmacies
      pharmacy: {
        verificationStatus: "VERIFIED",
      },
    };

    // Fetch inventory items with pharmacy details
    const inventoryItems = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            latitude: true,
            longitude: true,
            address: true,
            contactNumber: true,
          },
        },
      },
      orderBy: [
        { name: "asc" },
        { price: "asc" },
      ],
      take: limit * 2, // Fetch more than needed for distance filtering
    });

    // If no results found
    if (inventoryItems.length === 0) {
      return [];
    }

    // Format results
    let results = inventoryItems.map((item) => ({
      id: item.id,
      medicine: item.name,
      genericName: item.genericName,
      price: item.price,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      inStock: item.quantity > 0,
      pharmacy: {
        id: item.pharmacy.id,
        name: item.pharmacy.pharmacyName,
        address: item.pharmacy.address,
        contactNumber: item.pharmacy.contactNumber,
        location: {
          lat: item.pharmacy.latitude,
          lng: item.pharmacy.longitude,
        },
      },
    }));

    // If user location is provided, calculate distances and sort
    if (latitude && longitude) {
      // Validate coordinates
      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new BadRequestError("Invalid coordinates provided");
      }

      // Calculate distance for each result
      results = results.map((result) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          result.pharmacy.location.lat,
          result.pharmacy.location.lng
        );

        return {
          ...result,
          distance: distance,
          distanceFormatted: formatDistance(distance),
        };
      });

      // Filter by maximum distance if specified
      if (maxDistance && maxDistance > 0) {
        results = results.filter((r) => r.distance <= maxDistance);
      }

      // Sort by distance (nearest first)
      results.sort((a, b) => a.distance - b.distance);
    }

    // Limit results
    return results.slice(0, limit);
  }

  /**
   * Search medicines near a specific location
   * 
   * @param {Object} params - Search parameters
   * @param {number} params.latitude - User's latitude (required)
   * @param {number} params.longitude - User's longitude (required)
   * @param {number} [params.radius=10] - Search radius in kilometers
   * @param {number} [params.limit=50] - Maximum results to return
   * @returns {Promise<Array>} Array of nearby pharmacies with their inventory
   */
  async findNearbyPharmacies({ latitude, longitude, radius = 10, limit = 50 }) {
    // Validate coordinates
    if (!latitude || !longitude) {
      throw new BadRequestError("Latitude and longitude are required");
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestError("Invalid coordinates provided");
    }

    // Fetch all verified pharmacies
    const pharmacies = await prisma.pharmacy.findMany({
      where: {
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        pharmacyName: true,
        address: true,
        latitude: true,
        longitude: true,
        contactNumber: true,
        _count: {
          select: {
            inventory: {
              where: {
                quantity: { gt: 0 },
              },
            },
          },
        },
      },
    });

    // Calculate distances and filter by radius
    let results = pharmacies
      .map((pharmacy) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          pharmacy.latitude,
          pharmacy.longitude
        );

        return {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          address: pharmacy.address,
          contactNumber: pharmacy.contactNumber,
          location: {
            lat: pharmacy.latitude,
            lng: pharmacy.longitude,
          },
          distance: distance,
          distanceFormatted: formatDistance(distance),
          medicinesInStock: pharmacy._count.inventory,
        };
      })
      .filter((pharmacy) => pharmacy.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return results.slice(0, limit);
  }

  /**
   * Get statistics about search results (for analytics)
   * 
   * @param {string} searchTerm - The term to analyze
   * @returns {Promise<Object>} Search statistics
   */
  async getSearchStats(searchTerm) {
    const results = await this.searchMedicines({ 
      query: searchTerm, 
      includeOutOfStock: true,
      limit: 1000 
    });

    return {
      totalResults: results.length,
      inStock: results.filter((r) => r.inStock).length,
      outOfStock: results.filter((r) => !r.inStock).length,
      uniquePharmacies: new Set(results.map((r) => r.pharmacy.id)).size,
      priceRange: results.length > 0
        ? {
            min: Math.min(...results.map((r) => r.price)),
            max: Math.max(...results.map((r) => r.price)),
            avg: results.reduce((sum, r) => sum + r.price, 0) / results.length,
          }
        : null,
    };
  }
}

export default new SearchService();
