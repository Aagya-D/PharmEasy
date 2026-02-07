import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Filter,
  Navigation,
  Star,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle,
} from "lucide-react";
import searchService from "../../../core/services/search.service";
import useGeoLocation from "../../../shared/hooks/useGeoLocation";
import { useLocation } from "../../../context/LocationContext";

/**
 * Medicine Search & Discovery Page
 * Real-time search with pharmacy availability and filters
 */
export default function MedicineSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [filters, setFilters] = useState({
    nearbyOnly: false,
    inStock: true,
    priceRange: [0, 1000],
    searchRadius: 50, // Default search radius in km
  });

  // Use custom geolocation hook
  const { location, loading: locationLoading, error: geoError, getLocation } = useGeoLocation(false);

  // Location context - user's selected search location
  const { selectedLocation } = useLocation();

  // Get user's location on mount (with fallback to Kathmandu)
  useEffect(() => {
    getLocation();
  }, []);

  // Handle geolocation errors with fallback
  useEffect(() => {
    if (geoError) {
      setLocationError(geoError);
      // Fallback location (Kathmandu, Nepal)
      console.warn("Using default location: Kathmandu");
    }
  }, [geoError]);

  // Auto-search when user selects a new location from the location selector
  useEffect(() => {
    if (searchQuery.trim() && selectedLocation) {
      console.log("[MEDICINE SEARCH] Location changed to:", selectedLocation.name);
      // Trigger search after a brief delay to ensure state updates
      const timer = setTimeout(() => {
        const formEvent = new Event("submit", { bubbles: true });
        document.querySelector("form")?.dispatchEvent(formEvent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedLocation]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a medicine name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use selected location from context (user's chosen location or detected geolocation)
      // Fallback to selectedLocation context coordinates
      const lat = selectedLocation?.lat || location?.latitude || 27.7172;
      const lng = selectedLocation?.lng || location?.longitude || 85.3240;

      console.log("[MEDICINE SEARCH] Searching with:", {
        query: searchQuery,
        lat,
        lng,
        location: selectedLocation?.name || "Geolocation",
        nearbyOnly: filters.nearbyOnly,
      });

      const response = await searchService.searchMedicines(
        searchQuery,
        lat,
        lng,
        {
          includeOutOfStock: !filters.inStock,
          maxDistance: filters.searchRadius,
          limit: 50,
        }
      );

      // Safely extract data array from response
      const resultData = response.data || response || [];
      const results = Array.isArray(resultData) ? resultData : [];
      
      console.log("[MEDICINE SEARCH] Results received:", {
        count: results.length,
        location: selectedLocation?.name,
        nearestPharmacy: results.length > 0 ? results[0].pharmacy?.name : 'N/A',
        failsafeApplied: results.length > 0 && results[0].failsafeNote ? true : false,
      });
      
      setMedicines(results);

      if (results.length === 0) {
        setError(`❌ No pharmacies found with "${searchQuery}" in ${selectedLocation?.name || "your area"}. Try a different medicine name or expand your search location.`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Search failed";
      setError(`⚠️ ${errorMsg}`);
      console.error("[MEDICINE SEARCH]", err);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find Medicines
          </h1>
          <p className="text-gray-600">
            Search for medicines and check availability at nearby pharmacies
          </p>
        </div>

        {/* Location Alert */}
        {locationError && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-blue-900">Using Default Location</p>
              <p className="text-blue-700 text-sm">Showing results for Kathmandu, Nepal. Click "My Location" to use your current position.</p>
            </div>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-4 top-3 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine name, composition, or condition..."
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search
                </>
              )}
            </button>

            <button
              type="button"
              onClick={getLocation}
              disabled={locationLoading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              {locationLoading ? "Locating..." : "My Location"}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-600" />
              <label className="text-sm text-gray-700 mr-2">Search Radius:</label>
              <select
                value={filters.searchRadius}
                onChange={(e) =>
                  setFilters({ ...filters, searchRadius: parseInt(e.target.value) })
                }
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) =>
                  setFilters({ ...filters, inStock: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-gray-700">In stock only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.nearbyOnly}
                onChange={(e) =>
                  setFilters({ ...filters, nearbyOnly: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <MapPin size={16} className="text-gray-600" />
              <span className="text-sm text-gray-700">Strict radius only</span>
            </label>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-900">Search Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {medicines.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Found {medicines.length} medicines
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Medicine Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {medicine.medicine || medicine.brandName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {medicine.genericName && `Generic: ${medicine.genericName}`}
                  </p>

                  {/* Price & Availability */}
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{medicine.price}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Stock</span>
                      <span className={`text-sm font-medium ${medicine.inStock ? 'text-green-600' : 'text-red-600'}`}>
                        {medicine.quantity > 0 ? `${medicine.quantity} available` : 'Out of stock'}
                      </span>
                    </div>
                  </div>

                  {/* Top Pharmacy */}
                  {medicine.pharmacy && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-600 mb-1">Available at</p>
                      <p className="text-sm font-medium text-gray-900">
                        {medicine.pharmacy.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{medicine.pharmacy.address}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">
                          {medicine.distanceFormatted || (medicine.distance ? `${parseFloat(medicine.distance).toFixed(1)} km` : 'Distance unavailable')} away
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                          {medicine.pharmacy.contactNumber}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Failsafe Warning */}
                  {medicine.failsafeNote && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-amber-700 flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{medicine.failsafeNote}</span>
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        navigate(`/search?q=${encodeURIComponent(medicine.medicine || medicine.brandName)}`)
                      }
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      View All Stores
                    </button>
                    <button
                      className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader
              size={48}
              className="mx-auto text-blue-500 mb-4 animate-spin"
            />
            <p className="text-gray-600 font-medium mb-2">
              Searching for medicines near you...
            </p>
            <p className="text-sm text-gray-400">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && searchQuery && medicines.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-lg">
            <AlertCircle
              size={48}
              className="mx-auto text-gray-300 mb-4"
            />
            <p className="text-gray-700 font-semibold mb-2">
              No medicines found for "{searchQuery}"
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This medicine might not be available in {selectedLocation?.name || "your area"}. Try:
              <br />
              • Searching by generic name (e.g., "Paracetamol" instead of "Cetamol")
              <br />
              • Selecting a different location
              <br />
              • Checking nearby pharmacies for available medicines
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Clear Search
              </button>
              <button
                onClick={() => navigate("/nearby-pharmacies")}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
              >
                View All Pharmacies
              </button>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchQuery && medicines.length === 0 && (
          <div className="text-center py-16">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-2">
              Search for medicines to get started
            </p>
            <p className="text-sm text-gray-400">
              Enter medicine name, composition, or health condition
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
