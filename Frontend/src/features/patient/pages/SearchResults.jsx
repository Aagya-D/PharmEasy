import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Filter,
  List,
  Map as MapIcon,
  Phone,
  Navigation,
  ChevronDown,
  Pill,
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle,
  AlertCircle,
  Loader,
  MapPinned,
} from "lucide-react";
import searchService from "../../../core/services/search.service";
import useGeoLocation from "../../../shared/hooks/useGeoLocation";
import MapContainer from "../../../shared/components/MapContainer";

/**
 * Medicine Search Results Page
 * Real-time search with geospatial filtering and interactive map
 */
export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  // State management
  const [viewMode, setViewMode] = useState("split"); // 'split', 'list', 'map'
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("distance");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [filters, setFilters] = useState({
    includeOutOfStock: false,
    maxDistance: 10,
    maxPrice: 1000,
  });

  // Geolocation hook
  const { location, loading: locationLoading, error: locationError, getLocation } = useGeoLocation(true);

  /**
   * Perform search when query or location changes
   */
  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, location]);

  /**
   * Search for medicines
   */
  const performSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setError("Please enter a search term");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchService.searchMedicines(
        searchTerm,
        location?.latitude,
        location?.longitude,
        {
          includeOutOfStock: filters.includeOutOfStock,
          maxDistance: filters.maxDistance,
          limit: 50,
        }
      );

      setResults(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Search failed. Please try again.");
      console.error("[SEARCH ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle search form submission
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  /**
   * Filter and sort results
   */
  const filteredResults = results
    .filter((result) => {
      if (!filters.includeOutOfStock && !result.inStock) return false;
      if (result.distance && result.distance > filters.maxDistance) return false;
      if (result.price > filters.maxPrice) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance") {
        if (!a.distance && !b.distance) return 0;
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        return a.distance - b.distance;
      }
      if (sortBy === "price") return a.price - b.price;
      return 0;
    });

  /**
   * Format price
   */
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Get directions URL
   */
  const getDirectionsUrl = (result) => {
    if (!result.pharmacy || !result.pharmacy.location) return "#";
    
    const { lat, lng } = result.pharmacy.location;
    
    if (location) {
      return `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Back and Search */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link
                to="/patient/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </Link>
              <form onSubmit={handleSearch} className="relative flex-1 md:w-96">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicines..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </form>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Location Button */}
              <button
                onClick={getLocation}
                disabled={locationLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  location
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {locationLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <MapPinned size={16} />
                )}
                {location ? "Located" : "Locate Me"}
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="distance">Sort by Distance</option>
                  <option value="price">Sort by Price</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  filterOpen
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>

              {/* View Toggle */}
              <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode("split")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "split"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex gap-0.5">
                    <div className="w-2 h-4 bg-current rounded-sm" />
                    <div className="w-2 h-4 bg-current rounded-sm opacity-50" />
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "map"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MapIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 border-t border-gray-100 mt-4">
                  <div className="flex flex-wrap gap-6">
                    {/* Stock Status */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Stock Status
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.includeOutOfStock}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              includeOutOfStock: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">
                          Include Out of Stock
                        </span>
                      </label>
                    </div>

                    {/* Max Distance */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Max Distance: {filters.maxDistance} km
                      </p>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={filters.maxDistance}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxDistance: parseInt(e.target.value),
                          })
                        }
                        className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Max Price */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Max Price: ₹{filters.maxPrice}
                      </p>
                      <input
                        type="range"
                        min="10"
                        max="2000"
                        step="10"
                        value={filters.maxPrice}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxPrice: parseInt(e.target.value),
                          })
                        }
                        className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Apply Filters Button */}
                    <div className="flex items-end">
                      <button
                        onClick={() => performSearch(query)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                {locationError} Results are shown without distance sorting.
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
            <span>Searching...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-900">{error}</p>
          </div>
        ) : (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
            </span>{" "}
            found for "{query}"
            {location && " near you"}
          </p>
        )}
      </div>

      {/* Main Content - Split View */}
      {!loading && !error && filteredResults.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className={`flex gap-6 ${viewMode === "map" ? "flex-row-reverse" : ""}`}>
            {/* Results List */}
            {(viewMode === "list" || viewMode === "split") && (
              <div
                className={`${
                  viewMode === "split" ? "w-full lg:w-1/2" : "w-full"
                } space-y-4`}
              >
                {filteredResults.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                      selectedPharmacy?.id === result.id
                        ? "border-blue-500 shadow-lg"
                        : "border-transparent shadow-sm hover:shadow-md hover:border-blue-200"
                    }`}
                    onClick={() => setSelectedPharmacy(result)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {result.pharmacy.name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} />
                          {result.pharmacy.address}
                        </p>
                        {result.distance && (
                          <p className="text-sm text-blue-600 font-medium mt-1">
                            <Navigation size={14} className="inline" />{" "}
                            {result.distanceFormatted || `${result.distance} km`} away
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Medicine Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Pill className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{result.medicine}</p>
                            <p className="text-sm text-gray-500">{result.genericName}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {result.quantity} units available
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            {formatPrice(result.price)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            result.inStock
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {result.inStock ? (
                            <>
                              <CheckCircle size={14} />
                              In Stock
                            </>
                          ) : (
                            <>
                              <AlertCircle size={14} />
                              Out of Stock
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {result.pharmacy.contactNumber && (
                          <a
                            href={`tel:${result.pharmacy.contactNumber}`}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={18} className="text-gray-600" />
                          </a>
                        )}
                        <a
                          href={getDirectionsUrl(result)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Navigation size={18} className="text-blue-600" />
                        </a>
                      </div>
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
                  pharmacies={filteredResults}
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
      {!loading && !error && filteredResults.length === 0 && query && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Pill size={64} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No results found
          </h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              navigate("/patient/dashboard");
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Mobile Map Toggle */}
      {filteredResults.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          >
            {viewMode === "list" ? (
              <>
                <MapIcon size={20} />
                <span className="font-medium">View Map</span>
              </>
            ) : (
              <>
                <List size={20} />
                <span className="font-medium">View List</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
