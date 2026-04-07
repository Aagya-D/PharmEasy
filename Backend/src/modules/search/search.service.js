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
  async getTopMedicinesNearLocation({
    latitude,
    longitude,
    limit = 8,
    category,
  }) {
    const hasLocation =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    const categoryKeywordMap = {
      fever: ["paracetamol", "ibuprofen", "acetaminophen", "cold", "flu"],
      chronic: ["insulin", "metformin", "bp", "hypertension", "cholesterol"],
      baby: ["pediatric", "baby", "infant", "syrup", "drops"],
      ayurvedic: ["ayur", "herbal", "ashwagandha", "triphala"],
      firstaid: ["antiseptic", "bandage", "gauze", "burn", "wound"],
      surgical: ["surgical", "gloves", "suture", "catheter", "mask"],
    };

    const normalizedCategory = category
      ? String(category).toLowerCase().replace(/\s+/g, "")
      : null;
    const categoryKeywords = normalizedCategory
      ? categoryKeywordMap[normalizedCategory] || []
      : [];

    const keywordFilter =
      categoryKeywords.length > 0
        ? {
            OR: categoryKeywords.flatMap((keyword) => [
              {
                name: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
              {
                genericName: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            ]),
          }
        : {};

    const baseWhere = {
      quantity: { gt: 0 },
      pharmacy: {
        verificationStatus: "VERIFIED",
      },
    };

    const findInventory = async (where = {}) =>
      prisma.inventory.findMany({
      where: {
        ...baseWhere,
        ...where,
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        category: true,
        imageUrl: true,
        price: true,
        quantity: true,
        expiryDate: true,
        isPrescriptionRequired: true,
        dosageInstructions: true,
        route: true,
        timing: true,
        strength: true,
        form: true,
        manufacturer: true,
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            address: true,
            contactNumber: true,
            latitude: true,
            longitude: true,
            averageRating: true,
            totalReviews: true,
          },
        },
      },
      orderBy: [{ quantity: "desc" }, { updatedAt: "desc" }],
      take: Math.max(limit * 10, 60),
    });

    let inventoryItems = [];

    if (normalizedCategory) {
      inventoryItems = await findInventory({
        category: {
          equals: normalizedCategory,
          mode: "insensitive",
        },
      });

      if (inventoryItems.length === 0 && categoryKeywords.length > 0) {
        inventoryItems = await findInventory(keywordFilter);
      }

      if (inventoryItems.length === 0) {
        inventoryItems = await findInventory();
      }
    } else {
      inventoryItems = await findInventory();
    }

    const groupedMedicines = new Map();

    inventoryItems.forEach((item) => {
      const distance = hasLocation
        ? calculateDistance(
            latitude,
            longitude,
            item.pharmacy.latitude,
            item.pharmacy.longitude
          )
        : null;

      const groupKey = `${String(item.name || "").toLowerCase()}::${String(
        item.genericName || ""
      ).toLowerCase()}`;

      const offering = {
        id: item.id,
        medicine: item.name,
        genericName: item.genericName,
        category: item.category,
        imageUrl: item.imageUrl || null,
        price: item.price,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        isPrescriptionRequired: item.isPrescriptionRequired,
        dosageInstructions: item.dosageInstructions,
        route: item.route,
        timing: item.timing,
        strength: item.strength,
        form: item.form,
        manufacturer: item.manufacturer,
        distance,
        distanceFormatted: distance !== null ? formatDistance(distance) : null,
        pharmacy: {
          id: item.pharmacy.id,
          name: item.pharmacy.pharmacyName,
          address: item.pharmacy.address,
          contactNumber: item.pharmacy.contactNumber,
          averageRating: item.pharmacy.averageRating || 0,
          totalReviews: item.pharmacy.totalReviews || 0,
          location: {
            lat: item.pharmacy.latitude,
            lng: item.pharmacy.longitude,
          },
        },
      };

      if (!groupedMedicines.has(groupKey)) {
        groupedMedicines.set(groupKey, [offering]);
      } else {
        groupedMedicines.get(groupKey).push(offering);
      }
    });

    const ranked = Array.from(groupedMedicines.values())
      .map((offerings) => {
        const sortedOfferings = [...offerings].sort((a, b) => {
          if (hasLocation) {
            return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
          }

          if (b.quantity !== a.quantity) {
            return b.quantity - a.quantity;
          }

          return a.price - b.price;
        });

        return sortedOfferings[0];
      })
      .sort((a, b) => {
        if (hasLocation) {
          return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
        }

        if (b.quantity !== a.quantity) {
          return b.quantity - a.quantity;
        }

        return a.price - b.price;
      })
      .slice(0, limit);

    return ranked;
  }

  /**
   * Universal search across medicines and pharmacies
   *
   * @param {Object} params
   * @param {string} params.query
   * @param {number} [params.latitude]
   * @param {number} [params.longitude]
   * @param {boolean} [params.includeOutOfStock=false]
   * @param {number} [params.medicineLimit=8]
   * @param {number} [params.pharmacyLimit=8]
   * @returns {Promise<{medicines: Array, pharmacies: Array}>}
   */
  async getUniversalSearchResults({
    query,
    latitude,
    longitude,
    includeOutOfStock = false,
    medicineLimit = 8,
    pharmacyLimit = 8,
  }) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestError("Search query is required");
    }

    const searchTerm = query.trim();
    const hasLocation =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    const [inventoryItems, pharmacies] = await Promise.all([
      prisma.inventory.findMany({
        where: {
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
          ...(includeOutOfStock ? {} : { quantity: { gt: 0 } }),
          pharmacy: {
            verificationStatus: "VERIFIED",
          },
        },
        select: {
          id: true,
          name: true,
          genericName: true,
          imageUrl: true,
          price: true,
          quantity: true,
          expiryDate: true,
          sideEffects: true,
          contraindications: true,
          warnings: true,
          isPrescriptionRequired: true,
          dosageInstructions: true,
          route: true,
          timing: true,
          strength: true,
          form: true,
          manufacturer: true,
          batchNumber: true,
          pharmacy: {
            select: {
              id: true,
              pharmacyName: true,
              address: true,
              contactNumber: true,
              latitude: true,
              longitude: true,
              averageRating: true,
              totalReviews: true,
            },
          },
        },
        take: Math.max(medicineLimit * 8, 40),
      }),
      prisma.pharmacy.findMany({
        where: {
          verificationStatus: "VERIFIED",
          pharmacyName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          pharmacyName: true,
          address: true,
          contactNumber: true,
          latitude: true,
          longitude: true,
          averageRating: true,
          totalReviews: true,
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
        take: Math.max(pharmacyLimit * 3, 20),
      }),
    ]);

    const medicineGroups = new Map();

    inventoryItems.forEach((item) => {
      const groupKey = `${String(item.name || "").toLowerCase()}::${String(
        item.genericName || ""
      ).toLowerCase()}`;

      const distance = hasLocation
        ? calculateDistance(
            latitude,
            longitude,
            item.pharmacy.latitude,
            item.pharmacy.longitude
          )
        : null;

      const offering = {
        inventoryId: item.id,
        imageUrl: item.imageUrl || null,
        pharmacyId: item.pharmacy.id,
        pharmacyName: item.pharmacy.pharmacyName,
        address: item.pharmacy.address,
        contactNumber: item.pharmacy.contactNumber,
        price: item.price,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        sideEffects: item.sideEffects,
        contraindications: item.contraindications,
        warnings: item.warnings,
        isPrescriptionRequired: item.isPrescriptionRequired,
        dosageInstructions: item.dosageInstructions,
        route: item.route,
        timing: item.timing,
        strength: item.strength,
        form: item.form,
        manufacturer: item.manufacturer,
        batchNumber: item.batchNumber,
        location: {
          lat: item.pharmacy.latitude,
          lng: item.pharmacy.longitude,
        },
        distance,
        distanceFormatted: distance !== null ? formatDistance(distance) : null,
      };

      if (!medicineGroups.has(groupKey)) {
        medicineGroups.set(groupKey, {
          name: item.name,
          genericName: item.genericName,
          offerings: [offering],
        });
        return;
      }

      medicineGroups.get(groupKey).offerings.push(offering);
    });

    const medicines = Array.from(medicineGroups.values())
      .map((group) => {
        const sortedOfferings = [...group.offerings].sort((a, b) => {
          if (hasLocation) {
            return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
          }
          return a.price - b.price;
        });

        const bestOffering = sortedOfferings[0];

        return {
          id: bestOffering.inventoryId,
          medicine: group.name,
          genericName: group.genericName,
          imageUrl: bestOffering.imageUrl || null,
          price: bestOffering.price,
          quantity: bestOffering.quantity,
          expiryDate: bestOffering.expiryDate,
          sideEffects: bestOffering.sideEffects,
          contraindications: bestOffering.contraindications,
          warnings: bestOffering.warnings,
          isPrescriptionRequired: bestOffering.isPrescriptionRequired,
          dosageInstructions: bestOffering.dosageInstructions,
          route: bestOffering.route,
          timing: bestOffering.timing,
          strength: bestOffering.strength,
          form: bestOffering.form,
          manufacturer: bestOffering.manufacturer,
          batchNumber: bestOffering.batchNumber,
          inStock: bestOffering.quantity > 0,
          pharmacy: {
            id: bestOffering.pharmacyId,
            name: bestOffering.pharmacyName,
            address: bestOffering.address,
            contactNumber: bestOffering.contactNumber,
            location: bestOffering.location,
          },
          distance: bestOffering.distance,
          distanceFormatted: bestOffering.distanceFormatted,
          pharmacies: sortedOfferings.map((offering) => ({
            id: offering.pharmacyId,
            name: offering.pharmacyName,
            address: offering.address,
            contactNumber: offering.contactNumber,
            price: offering.price,
            quantity: offering.quantity,
            distance: offering.distance,
            distanceFormatted: offering.distanceFormatted,
            imageUrl: offering.imageUrl || null,
          })),
        };
      })
      .sort((a, b) => {
        if (hasLocation) {
          return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
        }
        return a.medicine.localeCompare(b.medicine);
      })
      .slice(0, medicineLimit);

    const mappedPharmacies = pharmacies
      .map((pharmacy) => {
        const distance = hasLocation
          ? calculateDistance(
              latitude,
              longitude,
              pharmacy.latitude,
              pharmacy.longitude
            )
          : null;

        return {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          address: pharmacy.address,
          contactNumber: pharmacy.contactNumber,
          location: {
            lat: pharmacy.latitude,
            lng: pharmacy.longitude,
          },
          distance,
          distanceFormatted: distance !== null ? formatDistance(distance) : null,
          medicinesInStock: pharmacy._count.inventory,
          averageRating: pharmacy.averageRating || 0,
          totalReviews: pharmacy.totalReviews || 0,
        };
      })
      .sort((a, b) => {
        if (hasLocation) {
          return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, pharmacyLimit);

    return {
      medicines,
      pharmacies: mappedPharmacies,
    };
  }

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
  async searchMedicines({ query, latitude, longitude, includeOutOfStock = false, maxDistance = 50, limit = 50 }) {
    // Validate search query
    if (!query || query.trim().length === 0) {
      throw new BadRequestError("Search query is required");
    }

    // Trim and prepare search term
    const searchTerm = query.trim();

    // DEBUG: Log search parameters
    console.log('[SEARCH SERVICE] Medicine search initiated', {
      query: searchTerm,
      hasLocation: !!(latitude && longitude),
      latitude,
      longitude,
      maxDistance,
      includeOutOfStock,
      limit,
    });

    // AUDIT: Check total pharmacies in database and their coordinates
    const allPharmacies = await prisma.pharmacy.findMany({
      select: {
        id: true,
        pharmacyName: true,
        verificationStatus: true,
        latitude: true,
        longitude: true,
      },
    });
    console.log(`[SEARCH SERVICE AUDIT] Total pharmacies in DB: ${allPharmacies.length}`);
    const verifiedPharmas = allPharmacies.filter(p => p.verificationStatus === 'VERIFIED');
    console.log(`[SEARCH SERVICE AUDIT] Verified pharmacies: ${verifiedPharmas.length}`);
    const withCoords = verifiedPharmas.filter(p => p.latitude && p.longitude);
    console.log(`[SEARCH SERVICE AUDIT] Verified pharmacies WITH coordinates: ${withCoords.length}`);
    if (withCoords.length > 0) {
      console.log(`[SEARCH SERVICE AUDIT] Sample verified pharmacy:`, {
        name: withCoords[0].pharmacyName,
        lat: withCoords[0].latitude,
        lng: withCoords[0].longitude,
      });
    }
    if (verifiedPharmas.length > 0 && withCoords.length === 0) {
      console.warn('[SEARCH SERVICE AUDIT] WARNING: Verified pharmacies found but NONE have latitude/longitude coordinates!');
    }

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
      // Note: latitude and longitude are required Float fields in Pharmacy model
      // so they can never be null and don't need explicit filtering
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
            averageRating: true,
            totalReviews: true,
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
      console.log('[SEARCH SERVICE] No medicines found for query:', searchTerm);
      console.log('[SEARCH SERVICE AUDIT] Inventory items matching query "' + searchTerm + '": 0');
      return [];
    }
    console.log('[SEARCH SERVICE AUDIT] Inventory items matching query "' + searchTerm + '": ' + inventoryItems.length);

    // Format results
    let results = inventoryItems.map((item) => ({
      id: item.id,
      medicine: item.name,
      genericName: item.genericName,
      imageUrl: item.imageUrl || null,
      price: item.price,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      sideEffects: item.sideEffects,
      contraindications: item.contraindications,
      warnings: item.warnings,
      isPrescriptionRequired: item.isPrescriptionRequired,
      dosageInstructions: item.dosageInstructions,
      route: item.route,
      timing: item.timing,
      strength: item.strength,
      form: item.form,
      manufacturer: item.manufacturer,
      batchNumber: item.batchNumber,
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
        averageRating: item.pharmacy.averageRating || 0,
        totalReviews: item.pharmacy.totalReviews || 0,
      },
    }));

    // If user location is provided, calculate distances and sort
    let failsafeApplied = false;
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

      // AUDIT: Calculate distance from test coordinates to first result
      const TEST_LAT = 26.4934;
      const TEST_LNG = 87.6234;
      if (results.length > 0 && results[0].pharmacy.location.lat && results[0].pharmacy.location.lng) {
        const testDistance = calculateDistance(
          TEST_LAT,
          TEST_LNG,
          results[0].pharmacy.location.lat,
          results[0].pharmacy.location.lng
        );
        console.log('[SEARCH SERVICE AUDIT] Distance from test coords [26.4934, 87.6234] to first pharmacy:', {
          pharmacy: results[0].pharmacy.name,
          distance: testDistance,
          distanceFormatted: formatDistance(testDistance),
          userCoords: { lat: latitude, lng: longitude },
        });
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

      // Filter by maximum distance if specified (default 50km for testing)
      if (maxDistance && maxDistance > 0) {
        console.log(`[SEARCH SERVICE AUDIT] Filtering by maxDistance: ${maxDistance}km`);
        const beforeFilter = results.length;
        results = results.filter((r) => r.distance <= maxDistance);
        console.log(`[SEARCH SERVICE AUDIT] After distance filter: ${beforeFilter} -> ${results.length} results`);
        
        // FAILSAFE: If no results within radius but results exist overall, return closest pharmacy
        if (results.length === 0 && beforeFilter > 0) {
          const allResults = inventoryItems.map((item) => ({
            id: item.id,
            medicine: item.name,
            genericName: item.genericName,
            imageUrl: item.imageUrl || null,
            price: item.price,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
            sideEffects: item.sideEffects,
            contraindications: item.contraindications,
            warnings: item.warnings,
            isPrescriptionRequired: item.isPrescriptionRequired,
            dosageInstructions: item.dosageInstructions,
            route: item.route,
            timing: item.timing,
            strength: item.strength,
            form: item.form,
            manufacturer: item.manufacturer,
            batchNumber: item.batchNumber,
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
              averageRating: item.pharmacy.averageRating || 0,
              totalReviews: item.pharmacy.totalReviews || 0,
            },
          })).map((result) => {
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
          }).sort((a, b) => a.distance - b.distance);
          
          if (allResults.length > 0) {
            console.log(`[SEARCH SERVICE AUDIT] FAILSAFE TRIGGERED: No results within ${maxDistance}km, showing closest pharmacy at ${allResults[0].distanceFormatted}`);
            results = [allResults[0]];
            failsafeApplied = true;
          }
        }
      }

      // Sort by distance (nearest first)
      results.sort((a, b) => a.distance - b.distance);

      // DEBUG: Log distance calculations
      console.log('[SEARCH SERVICE] Distance calculations', {
        userLocation: { lat: latitude, lng: longitude },
        resultCount: results.length,
        closest: results.length > 0 ? { 
          pharmacy: results[0].pharmacy.name,
          distance: results[0].distanceFormatted
        } : null,
      });

      // AUDIT: Print all results with distances before limiting
      if (results.length > 0) {
        console.log('[SEARCH SERVICE AUDIT] All medicine results with distances:');
        results.forEach((r, idx) => {
          console.log(`  [${idx + 1}] ${r.medicine} @ ${r.pharmacy.name} - ${r.distanceFormatted} (${r.quantity} in stock @ Rs ${r.price})`);
        });
      }
    }

    // Limit results
    const finalResults = results.slice(0, limit);
    
    // Add failsafe note if applicable
    if (failsafeApplied && finalResults.length > 0) {
      finalResults[0].failsafeNote = `No pharmacies found within ${maxDistance}km. Showing the nearest option at ${finalResults[0].distanceFormatted} away.`;
      console.log(`[SEARCH SERVICE] Failsafe applied: ${finalResults[0].failsafeNote}`);
    }
    
    console.log('[SEARCH SERVICE] Returning medicine search results', {
      totalResults: finalResults.length,
      query: searchTerm,
      failsafeApplied,
    });
    return finalResults;
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
  async findNearbyPharmacies({ latitude, longitude, radius = 50, limit = 50 }) {
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
        averageRating: true,
        totalReviews: true,
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

    // DEBUG: Log pharmacy data for diagnostics
    console.log(`[SEARCH SERVICE] Total Verified Pharmacies found in DB: ${pharmacies.length}`);
    console.log(`[SEARCH SERVICE] User location: ${latitude}, ${longitude} | Search radius: ${radius}km`);
    
    // AUDIT: Count valid coordinate sets
    const pharmaciesWithCoords = pharmacies.filter(p => p.latitude && p.longitude);
    console.log(`[SEARCH SERVICE AUDIT] Verified pharmacies with valid coordinates: ${pharmaciesWithCoords.length}/${pharmacies.length}`);
    
    if (pharmacies.length > 0 && pharmaciesWithCoords.length === 0) {
      console.warn('[SEARCH SERVICE AUDIT] WARNING: Found verified pharmacies but NONE have latitude/longitude coordinates!');
    }
    
    if (pharmaciesWithCoords.length > 0) {
      console.log(`[SEARCH SERVICE] First pharmacy with coordinates:`, {
        name: pharmaciesWithCoords[0].pharmacyName,
        lat: pharmaciesWithCoords[0].latitude,
        lng: pharmaciesWithCoords[0].longitude,
      });
      
      // AUDIT: Test distance calculation
      const TEST_LAT = 26.4934;
      const TEST_LNG = 87.6234;
      const testDistance = calculateDistance(TEST_LAT, TEST_LNG, pharmaciesWithCoords[0].latitude, pharmaciesWithCoords[0].longitude);
      console.log('[SEARCH SERVICE AUDIT] Distance from test coords [26.4934, 87.6234] to first pharmacy:', {
        pharmacy: pharmaciesWithCoords[0].pharmacyName,
        distance: testDistance,
        distanceFormatted: formatDistance(testDistance),
        suggestion: testDistance > radius ? `Pharmacy is ${testDistance.toFixed(1)}km away - suggests test radius of ${radius}km is too small for this area` : `Within radius`,
      });
    }

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
          averageRating: pharmacy.averageRating || 0,
          totalReviews: pharmacy.totalReviews || 0,
        };
      })
      .filter((pharmacy) => pharmacy.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    // DEBUG: Log results
    console.log(`[SEARCH SERVICE] Pharmacies within ${radius}km: ${results.length}`);
    if (results.length > 0) {
      console.log(`[SEARCH SERVICE] Closest pharmacy:`, {
        name: results[0].name,
        distance: results[0].distanceFormatted,
      });
      
      // AUDIT: Print all results
      console.log('[SEARCH SERVICE AUDIT] All nearby pharmacies found:');
      results.forEach((p, idx) => {
        console.log(`  [${idx + 1}] ${p.name} - ${p.distanceFormatted} away | ${p.medicinesInStock} medicines in stock`);
      });
    } else {
      console.log('[SEARCH SERVICE AUDIT] No pharmacies within ' + radius + 'km radius');
      // Show pharmacies just outside radius
      const nearbyOutside = pharmacies
        .map(p => ({ ...p, distance: calculateDistance(latitude, longitude, p.latitude, p.longitude) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      if (nearbyOutside.length > 0) {
        console.log('[SEARCH SERVICE AUDIT] Closest pharmacies OUTSIDE radius:');
        nearbyOutside.forEach((p, idx) => {
          const dist = calculateDistance(latitude, longitude, p.latitude, p.longitude);
          console.log(`  [${idx + 1}] ${p.pharmacyName} - ${formatDistance(dist)} away (exceeds ${radius}km)`);
        });
      }
    }

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
