// Leaflet map container for user and pharmacy markers.

import React, { useEffect, useRef } from "react";
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, Phone, MapPin as MapPinIcon, ExternalLink } from "lucide-react";

// Configure default Leaflet marker assets for bundler compatibility.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom marker icon for user location.
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

// Custom marker icon for pharmacies.
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

// Map view controller that adjusts center/bounds from marker data.
function MapViewController({ center, zoom, markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers && markers.length > 0) {
      // Fit bounds to include all markers.
      const bounds = L.latLngBounds(
        markers.map((m) => [m.latitude, m.longitude])
      );
      
      // Include user location in bounds when provided.
      if (center) {
        bounds.extend(center);
      }
      
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      // Fallback to simple center when no markers exist.
      map.setView(center, zoom || 13);
    }
  }, [map, center, markers, zoom]);

  return null;
}

// Main map component for search and nearby-pharmacy surfaces.
export default function MapContainer({
  userLocation,
  pharmacies = [],
  selectedPharmacy,
  onPharmacyClick,
  height = "500px",
}) {
  // Default map center when user location is unavailable.
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu, Nepal as fallback
  const center = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  // Normalize pharmacy object across medicine-search and nearby-search shapes.
  const getPharmacyInfo = (result) => {
    if (result.pharmacy && result.pharmacy.location) {
      return result.pharmacy; // medicine search shape
    }
    return result; // nearby pharmacy shape (location is directly on the object)
  };

  // Build Google Maps directions URL.
  const getDirectionsUrl = (result) => {
    const info = getPharmacyInfo(result);
    if (!info || !info.location) return "#";
    
    const { lat, lng } = info.location;
    
    if (userLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${lat},${lng}`;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  };

  // Format Nepali Rupees amount for popup display.
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
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

        {/* Auto-center controller. */}
        <MapViewController
          center={center}
          markers={pharmacies
            .map((p) => {
              const info = getPharmacyInfo(p);
              return info?.location ? { latitude: info.location.lat, longitude: info.location.lng } : null;
            })
            .filter(Boolean)}
        />

        {/* User location marker. */}
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

        {/* Pharmacy markers. */}
        {pharmacies.map((result) => {
          const info = getPharmacyInfo(result);
          if (!info || !info.location) return null;

          const { lat, lng } = info.location;

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
                  {/* Pharmacy name. */}
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {info.name}
                  </h3>

                  {/* Medicine info for medicine-search results. */}
                  {result.medicine && (
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
                  )}

                  {/* Medicines-in-stock summary for nearby-search results. */}
                  {result.medicinesInStock !== undefined && (
                    <div className="bg-green-50 rounded p-2 mb-3">
                      <p className="text-sm text-green-800 font-medium">
                        {result.medicinesInStock} medicines in stock
                      </p>
                    </div>
                  )}

                  {/* Address. */}
                  <div className="flex items-start gap-2 mb-2">
                    <MapPinIcon size={14} className="text-gray-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{info.address}</p>
                  </div>

                  {/* Distance from user location. */}
                  {result.distance && (
                    <div className="flex items-center gap-2 mb-2">
                      <Navigation size={14} className="text-gray-500" />
                      <p className="text-sm text-gray-600">
                        {result.distanceFormatted || `${result.distance} km`} away
                      </p>
                    </div>
                  )}

                  {/* Contact number. */}
                  {info.contactNumber && (
                    <div className="flex items-center gap-2 mb-3">
                      <Phone size={14} className="text-gray-500" />
                      <a
                        href={`tel:${info.contactNumber}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {info.contactNumber}
                      </a>
                    </div>
                  )}

                  {/* Directions link. */}
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
