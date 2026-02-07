import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  MapPin,
  Crosshair,
  Star,
  Loader,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { nepalLocations, popularCities, nepaliProvinces, searchLocations } from "../../data/nepalLocations";
import { useLocation } from "../../context/LocationContext";

/**
 * LocationSelector Modal
 * 
 * Searchable modal for selecting location across all 77 Nepal districts
 * Features:
 * - Real-time search by district/city/province
 * - GPS detection with fallback
 * - Popular cities quick selection
 * - Province grouping for organized browsing
 */
export default function LocationSelector({ isOpen, onClose }) {
  const { selectedLocation, updateLocation, detectLocation, isLoading } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(nepalLocations);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showProvinceFilter, setShowProvinceFilter] = useState(false);

  /**
   * Handle search input
   */
  useEffect(() => {
    let results = searchLocations(searchQuery);

    // Filter by province if selected
    if (selectedProvince) {
      results = results.filter((loc) => loc.province === selectedProvince);
    }

    // Remove duplicates by name
    const seen = new Set();
    results = results.filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });

    setFilteredLocations(results.sort((a, b) => a.name.localeCompare(b.name)));
  }, [searchQuery, selectedProvince]);

  /**
   * Handle Detect My Location
   */
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    const detectedLocation = await detectLocation();
    setDetectingLocation(false);
    if (detectedLocation) {
      handleSelectLocation(detectedLocation);
    }
  };

  /**
   * Handle location selection
   */
  const handleSelectLocation = (location) => {
    updateLocation(location);
    onClose();
  };

  /**
   * Clear filters
   */
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProvince(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Select Location</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by district or city..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Detect Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {detectingLocation || isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Detecting Location...
                </>
              ) : (
                <>
                  <Crosshair size={18} />
                  Detect My Location
                </>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Popular Cities */}
            {!searchQuery && !selectedProvince && (
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  Popular Cities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {popularCities.map((city) => {
                    const location = nepalLocations.find(
                      (loc) => loc.lat === city.lat && loc.lng === city.lng
                    );
                    const isSelected = selectedLocation?.name === city.name;

                    return (
                      <button
                        key={city.name}
                        onClick={() =>
                          handleSelectLocation({
                            name: city.name,
                            district: location?.district || city.name,
                            province: location?.province || "",
                            lat: city.lat,
                            lng: city.lng,
                          })
                        }
                        className={`p-3 rounded-lg font-medium transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        }`}
                      >
                        {city.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Province Filter */}
            {!searchQuery && (
              <div className="px-6 py-4 border-b border-gray-200">
                <button
                  onClick={() => setShowProvinceFilter(!showProvinceFilter)}
                  className="flex items-center justify-between w-full font-semibold text-gray-900"
                >
                  <span>Filter by Province</span>
                  <ChevronRight
                    size={18}
                    className={`transition-transform ${
                      showProvinceFilter ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {showProvinceFilter && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedProvince(null)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedProvince === null
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      All Provinces
                    </button>
                    {nepaliProvinces.map((province) => (
                      <button
                        key={province}
                        onClick={() => setSelectedProvince(province)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedProvince === province
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        }`}
                      >
                        {province}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Results Info */}
            {(searchQuery || selectedProvince) && (
              <div className="px-6 pt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found <span className="font-semibold">{filteredLocations.length}</span> locations
                </p>
                {(searchQuery || selectedProvince) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Locations List */}
            {filteredLocations.length > 0 ? (
              <div className="px-6 py-4 space-y-2">
                {filteredLocations.map((location) => {
                  const isSelected = selectedLocation?.name === location.name;

                  return (
                    <motion.button
                      key={location.id}
                      onClick={() => handleSelectLocation(location)}
                      whileHover={{ scale: 1.01 }}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        isSelected
                          ? "bg-blue-50 border-2 border-blue-500 shadow-md"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {location.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {location.district} • {location.province}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-2 p-2 bg-blue-500 text-white rounded-full">
                            <MapPin size={16} />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <AlertCircle
                  size={48}
                  className="text-gray-300 mx-auto mb-4"
                />
                <p className="text-gray-600 font-medium">
                  No locations found for "{searchQuery}"
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try searching by district, city, or province
                </p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-600">
            <p>Selected: <span className="font-semibold text-gray-900">{selectedLocation?.name}</span></p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
