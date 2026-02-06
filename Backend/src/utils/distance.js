/**
 * Geospatial Distance Calculation Utilities
 * 
 * Implements the Haversine Formula to calculate the great-circle distance
 * between two points on Earth's surface given their latitude and longitude.
 * 
 * The Haversine formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1−a))
 * d = R * c
 * 
 * where:
 * - φ is latitude
 * - λ is longitude
 * - R is Earth's radius (6371 km)
 */

/**
 * Calculate distance between two geographic points using Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point (in decimal degrees)
 * @param {number} lon1 - Longitude of first point (in decimal degrees)
 * @param {number} lat2 - Latitude of second point (in decimal degrees)
 * @param {number} lon2 - Longitude of second point (in decimal degrees)
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 * 
 * @example
 * const distance = calculateDistance(27.7172, 85.3240, 27.7060, 85.3300);
 * console.log(distance); // Output: 1.45 (km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Validate inputs
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('Invalid coordinates provided');
  }

  // Earth's radius in kilometers
  const R = 6371;

  // Convert degrees to radians
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  const distance = R * c;

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Validate geographic coordinates
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @returns {boolean} True if coordinates are valid
 */
const isValidCoordinate = (lat, lon) => {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string (e.g., "1.2 km" or "500 m")
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    // Convert to meters if less than 1 km
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm} km`;
};

/**
 * Sort array of items by distance from a given point
 * @param {Array} items - Array of items with location data
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {string} latField - Property name for latitude (default: 'latitude')
 * @param {string} lonField - Property name for longitude (default: 'longitude')
 * @returns {Array} Sorted array with distance property added
 */
export const sortByDistance = (items, userLat, userLon, latField = 'latitude', lonField = 'longitude') => {
  return items
    .map((item) => {
      const distance = calculateDistance(
        userLat,
        userLon,
        item[latField],
        item[lonField]
      );
      return {
        ...item,
        distance,
        distanceFormatted: formatDistance(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance);
};

export default {
  calculateDistance,
  formatDistance,
  sortByDistance,
};
