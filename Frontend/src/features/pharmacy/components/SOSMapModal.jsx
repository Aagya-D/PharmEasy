import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crosshair, Navigation2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// --- Custom Icons ---

// Red pulsing patient icon (SVG inline)
const patientIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="position:relative;width:40px;height:40px;">
      <div style="
        position:absolute;inset:0;
        border-radius:50%;
        background:rgba(239,68,68,0.25);
        animation:sosPulse 1.5s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:6px;left:6px;width:28px;height:28px;
        border-radius:50%;
        background:#EF4444;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
             fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

// Blue pharmacy icon
const pharmacyIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:36px;height:36px;border-radius:50%;
      background:#3B82F6;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 6v12M6 12h12"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

// Inject pulse animation once
if (typeof document !== "undefined" && !document.getElementById("sos-pulse-style")) {
  const style = document.createElement("style");
  style.id = "sos-pulse-style";
  style.textContent = `
    @keyframes sosPulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// --- Map Helper Components ---

/** Fits the map to show both markers */
function FitBounds({ patient, pharmacy }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!fitted.current && patient && pharmacy) {
      const bounds = L.latLngBounds([
        [patient[0], patient[1]],
        [pharmacy[0], pharmacy[1]],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      fitted.current = true;
    }
  }, [map, patient, pharmacy]);

  return null;
}

/** Zoom-to-patient imperative control */
function ZoomToPatientControl({ latlng, triggerRef }) {
  const map = useMap();

  useEffect(() => {
    if (triggerRef) {
      triggerRef.current = () => {
        map.flyTo(latlng, 16, { duration: 1.2 });
      };
    }
  }, [map, latlng, triggerRef]);

  return null;
}

// --- Distance helper ---
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Main Modal Component ---

export default function SOSMapModal({ isOpen, onClose, sosRequest, pharmacyLocation }) {
  const zoomRef = useRef(null);

  if (!isOpen || !sosRequest) return null;

  const patientLat = sosRequest.latitude;
  const patientLng = sosRequest.longitude;
  const pharmLat = pharmacyLocation?.latitude;
  const pharmLng = pharmacyLocation?.longitude;

  const hasPatient = patientLat != null && patientLng != null;
  const hasPharmacy = pharmLat != null && pharmLng != null;

  if (!hasPatient) return null;

  const center = [patientLat, patientLng];
  const pharmCoords = hasPharmacy ? [pharmLat, pharmLng] : null;
  const distance =
    hasPharmacy ? haversine(patientLat, patientLng, pharmLat, pharmLng).toFixed(1) : null;

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${patientLat},${patientLng}${
      hasPharmacy ? `&origin=${pharmLat},${pharmLng}` : ""
    }`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sos-map-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal card */}
          <motion.div
            key="sos-map-card"
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <MapPin size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Patient Location — {sosRequest.patientName || sosRequest.patient?.name || "Patient"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {sosRequest.address || "Unknown address"}
                    {distance && (
                      <span className="ml-2 text-blue-600 font-medium">· {distance} km from pharmacy</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Close map"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Map */}
            <div className="relative w-full h-[420px]">
              <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom
                className="w-full h-full z-0"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Patient marker (red pulsing) */}
                <Marker position={center} icon={patientIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-red-600">
                        {sosRequest.patientName || sosRequest.patient?.name || "Patient"}
                      </p>
                      {sosRequest.medicineName && (
                        <p className="text-gray-700">💊 {sosRequest.medicineName}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">{sosRequest.address}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Pharmacy marker (blue) */}
                {pharmCoords && (
                  <Marker position={pharmCoords} icon={pharmacyIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-blue-600">
                          {pharmacyLocation.name || "Your Pharmacy"}
                        </p>
                        <p className="text-gray-500 text-xs">{distance} km to patient</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Auto-fit both markers */}
                {pharmCoords && (
                  <FitBounds patient={center} pharmacy={pharmCoords} />
                )}

                {/* Zoom-to-patient handle */}
                <ZoomToPatientControl latlng={center} triggerRef={zoomRef} />
              </MapContainer>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => zoomRef.current?.()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  <Crosshair size={16} className="text-red-500" />
                  Zoom to Patient
                </button>

                <button
                  onClick={handleGetDirections}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Navigation2 size={16} />
                  Get Directions
                </button>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
