import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  MessageCircle,
  AlertTriangle,
  MapPin,
  Pill,
  Phone,
  Star,
  Timer,
} from "lucide-react";
import patientService from "../services/patient.service";
import ChatWindow from "../../chat/components/ChatWindow";
import RatePharmacyModal from "../../reviews/components/RatePharmacyModal";

/**
 * Countdown timer that shows minutes:seconds remaining until SOS expires.
 * Re-renders every second. When time runs out, shows "Expired" text.
 */
function CountdownTimer({ createdAt, ttlMinutes = 30 }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const ttlMs = ttlMinutes * 60 * 1000;
    const created = new Date(createdAt).getTime();

    const tick = () => {
      const left = Math.max(0, created + ttlMs - Date.now());
      setRemaining(left);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt, ttlMinutes]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pct = Math.max(0, (remaining / (ttlMinutes * 60 * 1000)) * 100);
  const isLow = mins < 5;

  if (remaining <= 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 text-center">
        <p className="text-sm font-semibold text-gray-500">Request time expired</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 ${isLow ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${isLow ? "text-red-600" : "text-blue-600"}`}>
          Time Remaining
        </span>
        <span className={`text-2xl font-mono font-bold tabular-nums ${isLow ? "text-red-600 animate-pulse" : "text-blue-700"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[10px] mt-1.5 ${isLow ? "text-red-500" : "text-blue-500"}`}>
        {isLow ? "Hurry! Request will expire soon." : "Pharmacies are being notified..."}
      </p>
    </div>
  );
}

/**
 * SOS Status Page
 * Shows the current status of an SOS request.
 * Embeds the ChatWindow component when the request status is "accepted".
 */
export default function SOSStatus() {
  const { sosId } = useParams();
  const [sosRequest, setSosRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Retrieve current user info from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          id: parsed.userId || parsed.id,
          name: parsed.name || parsed.email || "Patient",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch SOS details + poll for status changes
  useEffect(() => {
    if (!sosId) return;

    const fetchSOS = async () => {
      try {
        const response = await patientService.getSOSDetails(sosId);
        if (response.success && response.data) {
          const data = response.data.sosRequest || response.data;
          setSosRequest(data);
          // Auto-show chat when accepted
          if (data.status === "accepted") {
            setShowChat(true);
          }
        }
      } catch (err) {
        console.error("[SOS STATUS] Failed to fetch:", err);
        setError(err.response?.data?.message || "Failed to load SOS request");
      } finally {
        setLoading(false);
      }
    };

    fetchSOS();
    const interval = setInterval(fetchSOS, 15000);
    return () => clearInterval(interval);
  }, [sosId]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          color: "text-orange-600",
          bg: "bg-orange-100",
          label: "Pending – Finding pharmacies...",
        };
      case "accepted":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-100",
          label: "Accepted – Pharmacy is preparing your medicine",
        };
      case "rejected":
        return {
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-100",
          label: "Rejected",
        };
      case "expired":
        return {
          icon: Timer,
          color: "text-gray-500",
          bg: "bg-gray-100",
          label: "Expired – No pharmacy responded in time",
        };
      default:
        return {
          icon: AlertTriangle,
          color: "text-gray-600",
          bg: "bg-gray-100",
          label: status || "Unknown",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-green-600" size={36} />
      </div>
    );
  }

  if (error || !sosRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={40} />
          <p className="text-gray-700 mb-4">{error || "SOS request not found"}</p>
          <Link
            to="/sos"
            className="text-green-600 hover:underline flex items-center justify-center gap-1"
          >
            <ArrowLeft size={16} /> Back to SOS
          </Link>
        </div>
      </div>
    );
  }

  const status = getStatusConfig(sosRequest.status);
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <Link
          to="/patient"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">SOS Request Status</h1>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: SOS Details */}
        <div className="space-y-4">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 ${status.bg} rounded-xl flex items-center justify-center`}>
                <StatusIcon className={status.color} size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                <p className={`font-semibold ${status.color}`}>{status.label}</p>
              </div>
            </div>
            {sosRequest.status === "pending" && (() => {
              const SOS_TTL_MS = 30 * 60 * 1000;
              const createdAt = new Date(sosRequest.createdAt).getTime();
              const expiresAt = createdAt + SOS_TTL_MS;
              const remaining = Math.max(0, expiresAt - Date.now());
              const mins = Math.floor(remaining / 60000);
              const secs = Math.floor((remaining % 60000) / 1000);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    Searching for nearby pharmacies...
                  </div>
                  <CountdownTimer createdAt={sosRequest.createdAt} ttlMinutes={30} />
                </div>
              );
            })()}
            {sosRequest.status === "expired" && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <Timer size={16} />
                This request expired after 30 minutes with no pharmacy response.
              </div>
            )}
          </motion.div>

          {/* Medicine Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pill size={18} className="text-green-600" />
              Medicine Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Medicine</span>
                <span className="font-medium text-gray-900">{sosRequest.medicineName}</span>
              </div>
              {sosRequest.genericName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Generic Name</span>
                  <span className="text-gray-700">{sosRequest.genericName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity</span>
                <span className="text-gray-700">{sosRequest.quantity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Urgency</span>
                <span className="text-red-600 font-medium capitalize">{sosRequest.urgencyLevel}</span>
              </div>
            </div>
          </motion.div>

          {/* Contact & Location */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-600" />
              Contact & Location
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient</span>
                <span className="text-gray-700">{sosRequest.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <Phone size={14} /> Phone
                </span>
                <span className="text-gray-700">{sosRequest.contactNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-700 text-right max-w-[60%]">{sosRequest.address}</span>
              </div>
            </div>
          </motion.div>

          {/* Open Chat button (when chat panel is hidden) */}
          {sosRequest.status === "accepted" && !showChat && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowChat(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              <MessageCircle size={20} />
              Open Chat with Pharmacy
            </motion.button>
          )}

          {/* Mark as Completed + Rate Pharmacy */}
          {sosRequest.status === "accepted" && !hasReviewed && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowRatingModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Star size={20} />
              Mark as Completed &amp; Rate Pharmacy
            </motion.button>
          )}
          {hasReviewed && (
            <div className="flex items-center gap-2 justify-center py-3 text-green-700 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle size={18} />
              <span className="font-medium">Review submitted — Thank you!</span>
            </div>
          )}
        </div>

        {/* Right: Chat Panel (only when accepted) */}
        {sosRequest.status === "accepted" && showChat && currentUser && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-[600px] lg:h-[calc(100vh-200px)] lg:sticky lg:top-8"
          >
            <ChatWindow
              sosRequestId={sosId}
              currentUser={currentUser}
              onClose={() => setShowChat(false)}
            />
          </motion.div>
        )}

        {/* Placeholder when chat is not available */}
        {sosRequest.status !== "accepted" && (
          <div className="hidden lg:flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="text-center text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-40" />
              <p className="font-medium">Chat Unavailable</p>
              <p className="text-sm mt-1">
                Chat will be enabled once a pharmacy accepts your SOS request.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <RatePharmacyModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        pharmacyId={sosRequest.acceptedBy || ""}
        pharmacyName={sosRequest.pharmacyName || "Pharmacy"}
        sosRequestId={sosId}
        onSuccess={() => {
          setHasReviewed(true);
          setShowRatingModal(false);
        }}
      />
    </div>
  );
}
