/**
 * MapContainer Component
 * 
 * Interactive map with Leaflet showing user location and pharmacy markers
 * 
 * Features:
 * - User location marker (blue pin)
 * - Pharmacy markers (red pins)
 * - Interactive popups with pharmacy details
 * - "Get Directions" links to Google Maps
 * - Auto-centering on user location or search results
 */

import React, { useEffect, useRef } from "react";
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, Phone, MapPin as MapPinIcon, ExternalLink } from "lucide-react";

// Fix for default marker icons in React-Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom blue marker for user location
const userLocationIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom red marker for pharmacies
const pharmacyIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
            fill="#EF4444" stroke="white" stroke-width="1.5"/>
      <path d="M12 11.5 L12 6.5 M9.5 9 L14.5 9" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

/**
 * Map View Controller
 * Auto-centers and zooms the map based on markers
 */
function MapViewController({ center, zoom, markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      // Fit bounds to show all markers
      const bounds = L.latLngBounds(
        markers.map((m) => [m.latitude, m.longitude])
      );
      
      // Include user location if provided
      if (center) {
        bounds.extend(center);
      }
      
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      // Just center on user location
      map.setView(center, zoom || 13);
    }
  }, [map, center, markers, zoom]);

  return null;
}

/**
 * MapContainer Component
 * 
 * @param {Object} props
 * @param {Object} props.userLocation - User's location { latitude, longitude }
 * @param {Array} props.pharmacies - Array of pharmacy objects with location data
 * @param {Object} props.selectedPharmacy - Currently selected pharmacy
 * @param {Function} props.onPharmacyClick - Callback when pharmacy marker is clicked
 * @param {String} props.height - Map container height (default: "500px")
 */
export default function MapContainer({
  userLocation,
  pharmacies = [],
  selectedPharmacy,
  onPharmacyClick,
  height = "500px",
}) {
  const defaultCenter = [20.5937, 78.9629]; // Center of India as fallback
  const center = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  /**
   * Generate Google Maps directions URL
   */
  const getDirectionsUrl = (pharmacy) => {
    if (!pharmacy.pharmacy || !pharmacy.pharmacy.location) return "#";
    
    const { lat, lng } = pharmacy.pharmacy.location;
    
    if (userLocation) {
      // Directions from user location to pharmacy
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${lat},${lng}`;
    } else {
      // Just show pharmacy location
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  };

  /**
   * Format currency
   */
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div style={{ height, width: "100%", borderRadius: "0.5rem", overflow: "hidden" }}>
      <LeafletMap
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Map Tiles (OpenStreetMap) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-center controller */}
        <MapViewController
          center={center}
          markers={pharmacies.map((p) => p.pharmacy.location)}
        />

        {/* User Location Marker (Blue Pin) */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-blue-600">Your Location</p>
                <p className="text-xs text-gray-500 mt-1">
                  {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pharmacy Markers (Red Pins) */}
        {pharmacies.map((result) => {
          if (!result.pharmacy || !result.pharmacy.location) return null;

          const { lat, lng } = result.pharmacy.location;

          return (
            <Marker
              key={result.id}
              position={[lat, lng]}
              icon={pharmacyIcon}
              eventHandlers={{
                click: () => {
                  if (onPharmacyClick) {
                    onPharmacyClick(result);
                  }
                },
              }}
            >
              <Popup maxWidth={300}>
                <div className="p-2">
                  {/* Pharmacy Name */}
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {result.pharmacy.name}
                  </h3>

                  {/* Medicine Info */}
                  <div className="bg-blue-50 rounded p-2 mb-3">
                    <p className="font-semibold text-blue-900">{result.medicine}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(result.price)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          result.inStock
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-2">
                    <MapPinIcon size={14} className="text-gray-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{result.pharmacy.address}</p>
                  </div>

                  {/* Distance */}
                  {result.distance && (
                    <div className="flex items-center gap-2 mb-2">
                      <Navigation size={14} className="text-gray-500" />
                      <p className="text-sm text-gray-600">
                        {result.distanceFormatted || `${result.distance} km`} away
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  {result.pharmacy.contactNumber && (
                    <div className="flex items-center gap-2 mb-3">
                      <Phone size={14} className="text-gray-500" />
                      <a
                        href={`tel:${result.pharmacy.contactNumber}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {result.pharmacy.contactNumber}
                      </a>
                    </div>
                  )}

                  {/* Get Directions Button */}
                  <a
                    href={getDirectionsUrl(result)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Navigation size={16} />
                    Get Directions
                    <ExternalLink size={14} />
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </LeafletMap>
    </div>
  );
}
