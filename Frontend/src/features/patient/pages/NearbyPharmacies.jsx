import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Navigation,
  MapPinned,
  Loader,
  AlertCircle,
  ArrowLeft,
  Map as MapIcon,
  List,
} from "lucide-react";
import { Link } from "react-router-dom";
import searchService from "../../../core/services/search.service";
import useGeoLocation from "../../../shared/hooks/useGeoLocation";
import { useLocation } from "../../../context/LocationContext";
import MapContainer from "../../../shared/components/MapContainer";

/**
 * Nearby Pharmacies Page
 * Shows all verified pharmacies within a specified radius from user's location
 * Includes map view and list view with pharmacy details
 */
export default function NearbyPharmacies() {
  // State management
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(5);
  const [viewMode, setViewMode] = useState("split"); // 'split', 'list', 'map'
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  // Geolocation hook - will fallback to Kathmandu if permission denied
  const { location, loading: locationLoading, error: locationError, getLocation } =
    useGeoLocation(true); // Auto-fetch on mount

  // Location context - user's selected search location
  const { selectedLocation } = useLocation();

  /**
   * Search for nearby pharmacies
   */
  const findNearbyPharmacies = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use selected location from context (user's chosen location or detected geolocation)
      // Fallback to selectedLocation context coordinates
      const lat = selectedLocation?.lat || location?.latitude || 27.7172;
      const lng = selectedLocation?.lng || location?.longitude || 85.3240;

      console.log("[NEARBY PHARMACIES] Searching with:", {
        lat,
        lng,
        radius,
        selectedLocation: selectedLocation?.name,
        location: location ? `GPS(${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})` : "Not detected",
      });

      const response = await searchService.findNearbyPharmacies(lat, lng, radius, 50);

      // Safely extract data - handle both response.data.data and response.data
      const resultData = response.data?.data || response.data || [];
      const safeResults = Array.isArray(resultData) ? resultData : [];

      console.log("[NEARBY PHARMACIES] Results received:", safeResults);

      setPharmacies(safeResults);

      if (safeResults.length === 0) {
        setError(
          `No pharmacies found within ${radius}km of ${selectedLocation?.name || "your location"}. Try increasing the search radius.`
        );
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Search failed. Please try again.";
      setError(errorMsg);
      console.error("[NEARBY PHARMACIES ERROR]", err);
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-search when location becomes available, radius changes, or selected location changes
   * Uses selectedLocation from context or geolocation as fallback
   */
  useEffect(() => {
    // Search when: selected location changes, radius changes, or geolocation detected
    findNearbyPharmacies();
  }, [selectedLocation, radius]);

  /**
   * Format price for Nepal
   */
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Get directions URL
   */
  const getDirectionsUrl = (pharmacy) => {
    const { lat, lng } = pharmacy.location;

    // Use selected location or geolocation for origin
    const originLat = selectedLocation?.lat || location?.latitude || 27.7172;
    const originLng = selectedLocation?.lng || location?.longitude || 85.324;

    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/patient/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nearby Pharmacies</h1>
              <p className="text-sm text-gray-600 mt-1">Find verified pharmacies near you</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Radius Selector */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700">Search radius:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  disabled={loading || locationLoading}
                  className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-900 min-w-[50px]">
                  {radius} km
                </span>
              </div>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <List size={20} />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "map"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <MapIcon size={20} />
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "split"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <MapPinned size={20} />
              </button>
            </div>

            {/* Location Button */}
            <button
              onClick={getLocation}
              disabled={locationLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                location && !locationError
                  ? "border-green-200 text-green-700 bg-green-50"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {locationLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <MapPin size={16} />
                  {location ? "Location found" : "Use My Location"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Location Error Alert */}
      {locationError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-yellow-900">Location Access Disabled</p>
              <p className="text-sm text-yellow-700 mt-1">
                {locationError} Results are shown for Kathmandu, Nepal (27.7172°N, 85.3240°E).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Using Default Location Info */}
      {!locationError && !location && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <MapPin className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-blue-900">Using Default Location</p>
              <p className="text-sm text-blue-700 mt-1">
                Showing pharmacies near Kathmandu, Nepal. Click "Use My Location" to search near your actual location.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader size={20} className="animate-spin" />
            <span>Searching for pharmacies... (may take a few seconds)</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-900">{error}</p>
          </div>
        ) : (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{pharmacies.length} pharmacies</span>
            {" found within "}
            <span className="font-semibold text-gray-900">{radius} km</span>
            {location && " of your location"}
          </p>
        )}
      </div>

      {/* Main Content - Split View */}
      {!loading && !error && pharmacies.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className={`flex gap-6 ${viewMode === "map" ? "flex-row-reverse" : ""}`}>
            {/* Results List */}
            {(viewMode === "list" || viewMode === "split") && (
              <div
                className={`${
                  viewMode === "split" ? "w-full lg:w-1/2" : "w-full"
                } space-y-4`}
              >
                {pharmacies.map((pharmacy) => (
                  <motion.div
                    key={pharmacy.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                      selectedPharmacy?.id === pharmacy.id
                        ? "border-blue-500 shadow-lg"
                        : "border-transparent shadow-sm hover:shadow-md hover:border-blue-200"
                    }`}
                    onClick={() => setSelectedPharmacy(pharmacy)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pharmacy.name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} />
                          {pharmacy.address}
                        </p>
                        {pharmacy.distance && (
                          <p className="text-sm text-blue-600 font-medium mt-1">
                            <Navigation size={14} className="inline" />{" "}
                            {pharmacy.distanceFormatted || `${pharmacy.distance.toFixed(2)} km`}{" "}
                            away
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Medicines In Stock */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          {pharmacy.medicinesInStock}
                        </span>{" "}
                        medicines in stock
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center gap-2">
                      {pharmacy.contactNumber && (
                        <a
                          href={`tel:${pharmacy.contactNumber}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 text-sm font-medium"
                        >
                          <Phone size={16} />
                          Call Now
                        </a>
                      )}
                      <a
                        href={getDirectionsUrl(pharmacy)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-sm font-medium"
                      >
                        <Navigation size={16} />
                        Directions
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Interactive Map */}
            {(viewMode === "map" || viewMode === "split") && (
              <div
                className={`${
                  viewMode === "split" ? "hidden lg:block lg:w-1/2" : "w-full"
                } sticky top-32`}
              >
                <MapContainer
                  userLocation={location}
                  pharmacies={pharmacies}
                  selectedPharmacy={selectedPharmacy}
                  onPharmacyClick={setSelectedPharmacy}
                  height="600px"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && pharmacies.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <MapPinned size={64} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No pharmacies found
          </h3>
          <p className="text-gray-600 mb-6">
            Try increasing the search radius or enable location access
          </p>
          <button
            onClick={getLocation}
            disabled={locationLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {locationLoading ? "Detecting location..." : "Try Again"}
          </button>
        </div>
      )}
    </div>
  );
}
