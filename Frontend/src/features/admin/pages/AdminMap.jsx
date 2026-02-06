import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { MapPin, AlertCircle, Check, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SOS Marker Icon (Pulsing Red)
const sosIcon = L.divIcon({
  className: 'custom-sos-marker',
  html: `
    <div class="relative">
      <div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
      <div class="relative bg-red-600 text-white rounded-full p-2 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Custom Pharmacy Marker Icon (Green Hospital)
const pharmacyIcon = L.divIcon({
  className: 'custom-pharmacy-marker',
  html: `
    <div class="bg-green-600 text-white rounded-full p-2 shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M2 12h20"></path>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Nepal Provinces/Regions for filtering
const NEPAL_REGIONS = [
  { name: 'All Nepal', center: [28.3949, 84.1240], zoom: 7 },
  { name: 'Province 1 (Koshi)', center: [27.0, 87.0], zoom: 8 },
  { name: 'Madhesh Province', center: [26.8, 85.5], zoom: 8 },
  { name: 'Bagmati Province', center: [27.7172, 85.3240], zoom: 9 },
  { name: 'Gandaki Province', center: [28.2096, 83.9856], zoom: 8 },
  { name: 'Lumbini Province', center: [27.7, 83.0], zoom: 8 },
  { name: 'Karnali Province', center: [29.0, 82.0], zoom: 8 },
  { name: 'Sudurpashchim Province', center: [29.0, 80.5], zoom: 8 },
];

const AdminMap = () => {
  const [sosRequests, setSosRequests] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]); // Kathmandu, Nepal
  const [mapZoom, setMapZoom] = useState(7);
  const [filter, setFilter] = useState('all'); // 'all', 'sos', 'pharmacies'
  const [regionFilter, setRegionFilter] = useState('All Nepal');

  useEffect(() => {
    fetchMapData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMapData = async () => {
    try {
      // Fetch SOS requests
      const sosResponse = await fetch('http://localhost:3000/api/admin/sos-locations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const sosData = await sosResponse.json();
      
      // Fetch pharmacies
      const pharmacyResponse = await fetch('http://localhost:3000/api/admin/pharmacies', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const pharmacyData = await pharmacyResponse.json();

      // Filter active SOS requests with coordinates
      const activeSOS = (sosData.data || []).filter(
        sos => sos.status === 'pending' && sos.latitude && sos.longitude
      );
      
      // Filter verified pharmacies with coordinates
      const verifiedPharmacies = (pharmacyData.data || []).filter(
        pharmacy => pharmacy.verificationStatus === 'VERIFIED' && pharmacy.latitude && pharmacy.longitude
      );

      setSosRequests(activeSOS);
      setPharmacies(verifiedPharmacies);
      setLastUpdated(new Date());
      setIsLoading(false);

      // Center map on first SOS request or first pharmacy if available
      if (activeSOS.length > 0) {
        setMapCenter([activeSOS[0].latitude, activeSOS[0].longitude]);
      } else if (verifiedPharmacies.length > 0) {
        setMapCenter([verifiedPharmacies[0].latitude, verifiedPharmacies[0].longitude]);
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
      setIsLoading(false);
    }
  };

  const getFilteredMarkers = () => {
    if (filter === 'sos') return { sos: sosRequests, pharmacies: [] };
    if (filter === 'pharmacies') return { sos: [], pharmacies };
    return { sos: sosRequests, pharmacies };
  };

  const filteredData = getFilteredMarkers();

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="text-red-600" />
                  Nepal Emergency SOS Map
                </h1>
                <p className="text-gray-600 mt-1">
                  Real-time tracking of emergency requests and pharmacy locations across Nepal
                </p>
              </div>
              <button
                onClick={fetchMapData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active SOS Requests</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{sosRequests.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="text-red-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Verified Pharmacies</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{pharmacies.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Check className="text-green-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Last Updated</p>
                  <p className="text-lg font-semibold text-gray-900 mt-2">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <RefreshCw className="text-blue-600 w-8 h-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex flex-col gap-4">
              {/* Marker Type Filter */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Filter by Type:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => setFilter('sos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'sos'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    SOS Only
                  </button>
                  <button
                    onClick={() => setFilter('pharmacies')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'pharmacies'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pharmacies Only
                  </button>
                </div>
              </div>

              {/* Nepal Region Filter */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Filter by Region (Nepal):</p>
                <div className="flex flex-wrap gap-2">
                  {NEPAL_REGIONS.map((region) => (
                    <button
                      key={region.name}
                      onClick={() => {
                        setRegionFilter(region.name);
                        setMapCenter(region.center);
                        setMapZoom(region.zoom);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        regionFilter === region.name
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div style={{ height: '600px', width: '100%' }}>
              {!isLoading && (
                <MapContainer
                  key={regionFilter}
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* SOS Request Markers */}
                  {filteredData.sos.map((sos) => (
                    <React.Fragment key={sos.id}>
                      <Marker
                        position={[sos.latitude, sos.longitude]}
                        icon={sosIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-bold text-red-600 text-lg mb-2">
                              🚨 Emergency SOS Request
                            </h3>
                            <div className="space-y-1 text-sm">
                              <p><strong>Patient:</strong> {sos.patientName}</p>
                              <p><strong>Medicine:</strong> {sos.medicineName}</p>
                              <p><strong>Quantity:</strong> {sos.quantity}</p>
                              <p><strong>Contact:</strong> {sos.contactNumber}</p>
                              <p><strong>Address:</strong> {sos.address}</p>
                              <p><strong>Urgency:</strong> 
                                <span className="font-semibold text-red-600 ml-1">
                                  {sos.urgencyLevel.toUpperCase()}
                                </span>
                              </p>
                              {sos.additionalNotes && (
                                <p><strong>Notes:</strong> {sos.additionalNotes}</p>
                              )}
                              <p className="text-gray-500 text-xs mt-2">
                                Requested {new Date(sos.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                      {/* Pulsing circle around SOS marker */}
                      <Circle
                        center={[sos.latitude, sos.longitude]}
                        radius={500}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: 0.1,
                          weight: 2,
                          dashArray: '5, 5',
                        }}
                      />
                    </React.Fragment>
                  ))}

                  {/* Pharmacy Markers */}
                  {filteredData.pharmacies.map((pharmacy) => (
                    <Marker
                      key={pharmacy.id}
                      position={[pharmacy.latitude, pharmacy.longitude]}
                      icon={pharmacyIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-green-600 text-lg mb-2">
                            ⚕️ {pharmacy.pharmacyName}
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p><strong>License:</strong> {pharmacy.licenseNumber}</p>
                            <p><strong>Contact:</strong> {pharmacy.contactNumber}</p>
                            <p><strong>Address:</strong> {pharmacy.address}</p>
                            <p>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Verified
                              </span>
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}

              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading map data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Map Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Active SOS Request</p>
                  <p className="text-sm text-gray-600">Pulsing red marker with radius</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Verified Pharmacy</p>
                  <p className="text-sm text-gray-600">Green hospital icon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminMap;
