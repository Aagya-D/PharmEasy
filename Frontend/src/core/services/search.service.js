/**
 * Search Service
 * 
 * Handles medicine search and geospatial queries
 * Connects to backend search API with location-based filtering
 */

import httpClient from "./httpClient";

/**
 * Search for medicines by name or generic name
 * 
 * @param {string} query - Search term (medicine name or generic name)
 * @param {number} latitude - User's latitude (optional)
 * @param {number} longitude - User's longitude (optional)
 * @param {Object} options - Additional search options
 * @returns {Promise} Search results with pharmacy details and distances
 */
export const searchMedicines = async (query, latitude, longitude, options = {}) => {
  const params = new URLSearchParams();
  
  // Required parameter
  params.append("query", query);
  
  // Optional location parameters
  if (latitude && longitude) {
    params.append("latitude", latitude.toString());
    params.append("longitude", longitude.toString());
  }
  
  // Optional filters
  if (options.includeOutOfStock !== undefined) {
    params.append("includeOutOfStock", options.includeOutOfStock.toString());
  }
  
  if (options.maxDistance) {
    params.append("maxDistance", options.maxDistance.toString());
  }
  
  if (options.limit) {
    params.append("limit", options.limit.toString());
  }
  
  return httpClient.get(`/search?${params.toString()}`);
};

/**
 * Find nearby pharmacies within a radius
 * 
 * @param {number} latitude - User's latitude (required)
 * @param {number} longitude - User's longitude (required)
 * @param {number} radius - Search radius in km (default: 10)
 * @param {number} limit - Max results (default: 50)
 * @returns {Promise} Nearby pharmacies sorted by distance
 */
export const findNearbyPharmacies = async (latitude, longitude, radius = 10, limit = 50) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius: radius.toString(),
    limit: limit.toString(),
  });
  
  return httpClient.get(`/search/nearby?${params.toString()}`);
};

/**
 * Get search statistics for a query
 * 
 * @param {string} query - Search term
 * @returns {Promise} Search statistics (total results, price range, etc.)
 */
export const getSearchStats = async (query) => {
  return httpClient.get(`/search/stats?query=${encodeURIComponent(query)}`);
};

const searchService = {
  searchMedicines,
  findNearbyPharmacies,
  getSearchStats,
};

export default searchService;
