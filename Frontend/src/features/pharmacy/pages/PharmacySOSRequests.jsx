import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Loader, 
  CheckCircle, 
  XCircle, 
  Phone, 
  MapPin, 
  Clock,
  Eye,
  User,
  FileText,
  Navigation,
  Map as MapIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import httpClient from "../../../core/services/httpClient";
import { useSOSContext } from "../../../context/SOSContext";
import SOSMapModal from "../components/SOSMapModal";

export default function PharmacySOSRequests() {
  const { updateSOSCount } = useSOSContext();
  const [sosRequests, setSosRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedSOSForMap, setSelectedSOSForMap] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [pharmacyLocation, setPharmacyLocation] = useState(null);

  // Fetch SOS requests on mount and set up polling every 30 seconds
  useEffect(() => {
    fetchSOSRequests();
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchSOSRequests(true); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Fetch nearby SOS requests from backend
   */
  const fetchSOSRequests = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await httpClient.get("/pharmacy/sos/nearby", {
        params: { radius: 50 } // 50km radius for broader visibility
      });

      if (response.data.success) {
        const sosData = response.data.data.sosRequests || [];
        setSosRequests(sosData);
        // Store pharmacy location for map modal
        if (response.data.data.pharmacy) {
          setPharmacyLocation(response.data.data.pharmacy);
        }
        // Update global SOS count
        updateSOSCount(sosData);
      }
    } catch (err) {
      console.error("Error fetching SOS requests:", err);
      if (!silent) {
        setError(
          err.response?.data?.error?.message || 
          "Failed to load SOS requests. Please try again."
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  /**
   * Respond to SOS request (accept or reject)
   */
  const handleRespond = async (sosId, response, note = "") => {
    setRespondingTo(sosId);

    try {
      await httpClient.post(
        `/pharmacy/sos/${sosId}/respond`,
        { response, note }
      );

      // Refresh the list after responding
      await fetchSOSRequests();

      // Show success message
      alert(`SOS request ${response === 'accepted' ? 'accepted' : 'rejected'} successfully!`);
    } catch (err) {
      console.error("Error responding to SOS:", err);
      alert(
        err.response?.data?.error?.message || 
        "Failed to respond to SOS request. Please try again."
      );
    } finally {
      setRespondingTo(null);
    }
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  /**
   * Stats calculation with defensive coding
   */
  const safeSOSRequests = Array.isArray(sosRequests) ? sosRequests : [];
  
  const stats = [
    { 
      title: "Pending Requests", 
      value: safeSOSRequests.filter(r => r.status === 'pending').length,
      icon: AlertTriangle,
      color: "orange"
    },
    { 
      title: "Nearby (< 5km)", 
      value: safeSOSRequests.filter(r => r.distance < 5).length,
      icon: Navigation,
      color: "blue"
    },
    { 
      title: "With Prescription", 
      value: safeSOSRequests.filter(r => r.prescriptionUrl).length,
      icon: FileText,
      color: "green"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading SOS requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency SOS Requests</h1>
            <p className="text-sm text-gray-500">Respond quickly to urgent patient medical needs</p>
          </div>
          <button
            onClick={() => fetchSOSRequests()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}-50`}>
                    <Icon size={24} className={`text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* SOS Requests List */}
        <div className="space-y-4">
          {safeSOSRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <AlertTriangle className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No SOS Requests</h3>
              <p className="text-gray-500">There are currently no pending emergency requests in your area.</p>
            </div>
          ) : (
            safeSOSRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section - Patient Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                            URGENT
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={14} />
                            {formatTimeAgo(request.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <User size={18} />
                          {request.patient?.name || request.patientName || 'Anonymous Patient'}
                        </h3>
                        {request.medicineName && (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            💊 Needs: {request.medicineName}{request.genericName ? ` (${request.genericName})` : ''} × {request.quantity || 1}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} className="text-blue-600" />
                        <span className="text-sm">{request.contactNumber || request.patient?.phone || 'N/A'}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedSOSForMap(request);
                          setIsMapModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group"
                        title="Click to view on map"
                      >
                        <MapPin size={16} className="text-purple-600" />
                        <span className="text-sm truncate">{request.address || 'Address not provided'}</span>
                        <MapIcon size={14} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} className="text-green-600" />
                        <span className="text-sm">{request.distance ? request.distance.toFixed(1) : '0.0'} km away</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 col-span-2">
                        <AlertTriangle size={16} className="text-orange-600" />
                        <span className="text-sm font-medium">{request.additionalNotes || "No additional notes"}</span>
                      </div>
                    </div>

                    {/* Prescription */}
                    {request.prescriptionUrl && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            // Construct full URL if it's a relative path
                            const prescriptionUrl = request.prescriptionUrl.startsWith('http')
                              ? request.prescriptionUrl
                              : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${request.prescriptionUrl}`;
                            setSelectedPrescription(prescriptionUrl);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={16} />
                          View Prescription
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleRespond(request.id, 'accepted')}
                      disabled={respondingTo === request.id}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {respondingTo === request.id ? (
                        <Loader className="animate-spin" size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      Accept
                    </button>

                    <button
                      onClick={() => {
                        const note = prompt("Why are you rejecting this request? (Optional)");
                        if (note !== null) {
                          handleRespond(request.id, 'rejected', note);
                        }
                      }}
                      disabled={respondingTo === request.id}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Prescription Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPrescription(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-gray-900">Prescription</h3>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle size={24} className="text-gray-600" />
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedPrescription}
                  alt="Prescription"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Map Modal */}
      <SOSMapModal
        isOpen={isMapModalOpen}
        onClose={() => {
          setIsMapModalOpen(false);
          setSelectedSOSForMap(null);
        }}
        sosRequest={selectedSOSForMap}
        pharmacyLocation={pharmacyLocation}
      />
    </div>
  );
}
