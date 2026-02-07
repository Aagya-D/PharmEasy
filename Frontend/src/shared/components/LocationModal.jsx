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
  Map,
} from "lucide-react";
import { nepalLocations, popularCities, nepaliProvinces, searchLocations } from "../../data/nepalLocations";
import { useLocation } from "../../context/LocationContext";

/**
 * LocationModal Component
 * 
 * Professional, searchable modal for selecting location across all 77 Nepal districts
 * Features:
 * - Real-time search by district/city/province
 * - GPS detection with geolocation API
 * - Popular cities quick selection
 * - Province-based filtering for organized browsing
 * - Scrollable districts list with province/district information
 * - Smooth animations and transitions
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Called when modal should close
 */
export default function LocationModal({ isOpen, onClose }) {
  const { selectedLocation, updateLocation, detectLocation, isLoading } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(nepalLocations);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showProvinceFilter, setShowProvinceFilter] = useState(false);

  /**
   * Handle search input - filter locations in real-time
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
   * Handle Detect My Location using Geolocation API
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
   * Handle location selection and close modal
   */
  const handleSelectLocation = (location) => {
    updateLocation(location);
    onClose();
  };

  /**
   * Clear all active filters
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
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 p-6 space-y-4">
            {/* Title & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <Map size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Select Your Location</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Choose from all 77 districts of Nepal</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors ml-4 flex-shrink-0"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by district, city, or province..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Detect My Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {detectingLocation || isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Detecting Your Location...
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
            {/* Popular Cities Section */}
            {!searchQuery && !selectedProvince && (
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-blue-50/50 to-white">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  Popular Cities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {popularCities.map((city) => {
                    const location = nepalLocations.find(
                      (loc) => loc.lat === city.lat && loc.lng === city.lng
                    );
                    const isSelected = selectedLocation?.name === city.name;

                    return (
                      <motion.button
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
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                            : "bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md"
                        }`}
                      >
                        {city.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Province Filter Section */}
            {!searchQuery && (
              <div className="px-6 py-4 border-b border-gray-200">
                <button
                  onClick={() => setShowProvinceFilter(!showProvinceFilter)}
                  className="flex items-center justify-between w-full font-semibold text-gray-900 py-2"
                >
                  <span className="text-sm uppercase tracking-wide text-gray-600">Filter by Province</span>
                  <ChevronRight
                    size={18}
                    className={`transition-transform duration-200 ${showProvinceFilter ? "rotate-90" : ""}`}
                  />
                </button>

                {showProvinceFilter && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <button
                      onClick={() => setSelectedProvince(null)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedProvince === null
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
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
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        }`}
                      >
                        {province}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Results Info */}
            {(searchQuery || selectedProvince) && filteredLocations.length > 0 && (
              <div className="px-6 pt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found <span className="font-bold text-gray-900">{filteredLocations.length}</span> location{filteredLocations.length !== 1 ? 's' : ''}
                </p>
                {(searchQuery || selectedProvince) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01, translateX: 8 }}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50 border-2 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 text-lg">{location.name}</div>
                          <div className="text-sm text-gray-600 mt-1.5 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={14} className="text-gray-400" />
                              {location.district}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-blue-600 font-medium">{location.province}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-3 p-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30"
                          >
                            <MapPin size={18} />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <AlertCircle size={56} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 font-semibold text-lg mb-2">
                  No locations found
                </p>
                <p className="text-sm text-gray-500">
                  Try searching by district, city, or province name
                </p>
              </div>
            )}
          </div>

          {/* Footer - Shows Selected Location */}
          <div className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 py-4 flex items-center gap-3 text-sm">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin size={16} className="text-blue-600" />
            </div>
            <div>
              <span className="text-gray-600">Currently Selected:</span>
              <div className="font-bold text-gray-900">{selectedLocation?.name} • {selectedLocation?.province}</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
