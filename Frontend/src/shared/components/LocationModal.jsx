import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Check,
  RotateCcw,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { nepalLocations, popularCities, nepaliProvinces, searchLocations, findLocationByCoordinates } from "../../data/nepalLocations";
import { useLocation } from "../../context/LocationContext";

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom blue icon for user's detected position
const userIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Allows the user to drag the map pin to adjust the selected location. */
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onPositionChange(lat, lng);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={userIcon}
    />
  );
}

/** Recenter the map when the selected position changes. */
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

/**
 * Modal for selecting a location across Nepal with search, GPS detection, and map confirmation.
 */
export default function LocationModal({ isOpen, onClose }) {
  const { selectedLocation, updateLocation, confirmExactLocation, detectLocation, isLoading } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(nepalLocations);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showProvinceFilter, setShowProvinceFilter] = useState(false);

  // Map preview state
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [pinPosition, setPinPosition] = useState(null);
  const [detectedLocationInfo, setDetectedLocationInfo] = useState(null);
  const [nearestCityName, setNearestCityName] = useState("");

  // Filter locations as the user types.
  useEffect(() => {
    let results = searchLocations(searchQuery);

    // Keep only the selected province when a province filter is active.
    if (selectedProvince) {
      results = results.filter((loc) => loc.province === selectedProvince);
    }

    // Remove duplicate names from the list.
    const seen = new Set();
    results = results.filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });

    setFilteredLocations(results.sort((a, b) => a.name.localeCompare(b.name)));
  }, [searchQuery, selectedProvince]);

  // Update the nearest city when the pin moves.
  const handlePinDrag = (lat, lng) => {
    setPinPosition([lat, lng]);
    const nearest = findLocationByCoordinates(lat, lng);
    if (nearest) {
      setNearestCityName(nearest.name);
      setDetectedLocationInfo(nearest);
    }
  };

  // Detect the current location and open the map preview for confirmation.
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    const detectedLocation = await detectLocation();
    setDetectingLocation(false);

    if (detectedLocation) {
      const rawLat = detectedLocation._rawLat || detectedLocation.lat;
      const rawLng = detectedLocation._rawLng || detectedLocation.lng;

      // Show the map preview at the raw GPS coordinates.
      setPinPosition([rawLat, rawLng]);
      setMapCenter([rawLat, rawLng]);
      setDetectedLocationInfo(detectedLocation);
      setNearestCityName(detectedLocation.name);
      setShowMapPreview(true);
    }
  };

  // Confirm the selected map position.
  const handleConfirmExactLocation = () => {
    if (pinPosition) {
      confirmExactLocation(pinPosition[0], pinPosition[1], detectedLocationInfo);
      setShowMapPreview(false);
      onClose();
    }
  };

  // Return from the map preview to the location list.
  const handleResetMapPreview = () => {
    setShowMapPreview(false);
    setPinPosition(null);
    setMapCenter(null);
    setDetectedLocationInfo(null);
    setNearestCityName("");
  };

  // Save the chosen location and close the modal.
  const handleSelectLocation = (location) => {
    updateLocation(location);
    onClose();
  };

  // Clear the search and province filters.
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
            {!showMapPreview && (
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
            )}

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

            {/* ========== MINI-MAP PREVIEW ========== */}
            {showMapPreview && pinPosition && (
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    Confirm Your Location
                  </h3>
                  <button
                    onClick={handleResetMapPreview}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Back to List
                  </button>
                </div>

                {/* Info bar */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                  <p className="text-blue-800">
                    <span className="font-semibold">Detected near:</span> {nearestCityName}
                  </p>
                  <p className="text-blue-600 mt-1">
                    Drag the pin to your exact street if the position is wrong, then press confirm.
                  </p>
                  <p className="text-blue-500 mt-1 text-xs">
                    Coordinates: {pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}
                  </p>
                </div>

                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-gray-300 shadow-inner" style={{ height: "280px" }}>
                  <MapContainer
                    center={pinPosition}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DraggableMarker
                      position={pinPosition}
                      onPositionChange={handlePinDrag}
                    />
                    <RecenterMap center={mapCenter} zoom={15} />
                  </MapContainer>
                </div>

                {/* Confirm Exact Location Button */}
                <button
                  onClick={handleConfirmExactLocation}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-sm hover:shadow-md text-base"
                >
                  <Check size={20} />
                  Confirm Exact Location
                </button>
              </div>
            )}

            {/* Popular Cities Section */}
            {!searchQuery && !selectedProvince && !showMapPreview && (
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-blue-50/50 to-white">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  Popular Cities
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            {!searchQuery && !showMapPreview && (
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
            {!showMapPreview && (searchQuery || selectedProvince) && filteredLocations.length > 0 && (
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
            {!showMapPreview && (
              <>
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
              </>
            )}
          </div>

          {/* Footer - Shows Selected Location */}
          <div className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 py-4 flex items-center gap-3 text-sm">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin size={16} className="text-blue-600" />
            </div>
            <div>
              <span className="text-gray-600">Currently Selected:</span>
              <div className="font-bold text-gray-900">
                {selectedLocation?.name} • {selectedLocation?.province}
                {selectedLocation?.isExactCoords && (
                  <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    GPS Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
