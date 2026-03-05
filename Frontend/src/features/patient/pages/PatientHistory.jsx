import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  Pill,
  Heart,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Phone,
  Timer,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import patientService from "../services/patient.service";

// ─── Status Badge Component ──────────────────────────
function StatusBadge({ status }) {
  const configs = {
    accepted: {
      label: "Accepted",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: CheckCircle,
    },
    pending: {
      label: "Pending",
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: Clock,
    },
    expired: {
      label: "Expired",
      bg: "bg-gray-100",
      text: "text-gray-600",
      icon: Timer,
    },
    rejected: {
      label: "Declined",
      bg: "bg-red-100",
      text: "text-red-600",
      icon: XCircle,
    },
  };

  const config = configs[status] || configs.expired;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
}

// ─── Relative Time Formatter ──────────────────────────
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PatientHistory() {
  const navigate = useNavigate();

  // SOS History state
  const [sosHistory, setSOSHistory] = useState([]);
  const [sosLoading, setSOSLoading] = useState(true);
  const [sosError, setSOSError] = useState(null);
  const [sosFilter, setSOSFilter] = useState("all"); // "all" | "7days"

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(true);
  const [favError, setFavError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // ─── Data Fetch ────────────────────────────────────
  const loadSOSHistory = useCallback(async () => {
    setSOSLoading(true);
    setSOSError(null);
    try {
      const res = await patientService.getSOSHistory(sosFilter);
      setSOSHistory(res?.data?.sosRequests || []);
    } catch (err) {
      setSOSError(err?.message || "Failed to load SOS history");
    } finally {
      setSOSLoading(false);
    }
  }, [sosFilter]);

  const loadFavorites = useCallback(async () => {
    setFavLoading(true);
    setFavError(null);
    try {
      const res = await patientService.getFavorites();
      setFavorites(res?.data?.favorites || []);
    } catch (err) {
      setFavError(err?.message || "Failed to load favorites");
    } finally {
      setFavLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSOSHistory();
  }, [loadSOSHistory]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFavorite = async (id) => {
    setRemovingId(id);
    try {
      await patientService.removeFromFavorites(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // ignore
    } finally {
      setRemovingId(null);
    }
  };

  const handleQuickReorder = (medicineName) => {
    navigate(`/medicine-search?q=${encodeURIComponent(medicineName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-blue-500" size={28} />
            <h1 className="text-3xl font-bold text-slate-900">History</h1>
          </div>
          <p className="text-slate-600 ml-11">
            Your SOS requests and favorite medicines in one place
          </p>
        </div>

        {/* ══════════ SECTION 1: SOS HISTORY ══════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md">
                <AlertTriangle className="text-white" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">SOS History</h2>
                <p className="text-sm text-slate-500">All your emergency medicine requests</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter toggle */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setSOSFilter("7days")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sosFilter === "7days"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setSOSFilter("all")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sosFilter === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  All Time
                </button>
              </div>
              <button
                onClick={loadSOSHistory}
                disabled={sosLoading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className={`text-slate-500 ${sosLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {sosLoading ? (
              <div className="flex flex-col items-center py-12 text-slate-400">
                <Loader size={32} className="animate-spin text-blue-500 mb-3" />
                <p className="text-sm font-medium">Loading SOS history...</p>
              </div>
            ) : sosError ? (
              <div className="flex flex-col items-center py-12 text-red-500">
                <AlertTriangle size={32} className="mb-3" />
                <p className="text-sm">{sosError}</p>
                <button
                  onClick={loadSOSHistory}
                  className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : sosHistory.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Clock size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-semibold text-slate-600 mb-1">No SOS requests yet</p>
                <p className="text-sm text-slate-400">
                  Your emergency requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sosHistory.map((sos) => (
                  <div
                    key={sos.id}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/sos/${sos.id}`)}
                  >
                    {/* Medicine icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                      <Pill size={22} className="text-blue-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {sos.medicineName}
                        </h3>
                        <StatusBadge status={sos.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {timeAgo(sos.createdAt)}
                        </span>
                        {sos.pharmacyName && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <MapPin size={12} />
                            {sos.pharmacyName}
                          </span>
                        )}
                        {sos.contactNumber && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {sos.contactNumber}
                          </span>
                        )}
                        <span className="capitalize">
                          Urgency: {sos.urgencyLevel}
                        </span>
                      </div>
                    </div>

                    {/* Qty badge */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-slate-400">Qty</p>
                      <p className="text-lg font-bold text-slate-700">{sos.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════ SECTION 2: FAVORITE MEDICINES ══════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-md">
                <Heart className="text-white" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Favorite Medicines</h2>
                <p className="text-sm text-slate-500">
                  Quick re-order your starred medicines
                </p>
              </div>
            </div>
            <button
              onClick={loadFavorites}
              disabled={favLoading}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={`text-slate-500 ${favLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-6">
            {favLoading ? (
              <div className="flex flex-col items-center py-12 text-slate-400">
                <Loader size={32} className="animate-spin text-pink-500 mb-3" />
                <p className="text-sm font-medium">Loading favorites...</p>
              </div>
            ) : favError ? (
              <div className="flex flex-col items-center py-12 text-red-500">
                <AlertTriangle size={32} className="mb-3" />
                <p className="text-sm">{favError}</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Heart size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-semibold text-slate-600 mb-1">No favorites yet</p>
                <p className="text-sm text-slate-400 mb-4">
                  Star medicines from search results for quick re-ordering
                </p>
                <button
                  onClick={() => navigate("/medicine-search")}
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Find Medicines
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="group relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-pink-200 hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Top icon area */}
                    <div className="h-28 bg-gradient-to-br from-blue-100 via-blue-50 to-white flex items-center justify-center relative">
                      <Pill size={48} className="text-blue-400 opacity-80" />
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(fav.id);
                        }}
                        disabled={removingId === fav.id}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-50 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove from favorites"
                      >
                        {removingId === fav.id ? (
                          <Loader size={14} className="animate-spin text-gray-400" />
                        ) : (
                          <Trash2 size={14} className="text-red-400" />
                        )}
                      </button>
                      {/* Heart badge */}
                      <div className="absolute top-2 left-2 p-1.5 bg-pink-100 rounded-full">
                        <Heart size={14} className="text-pink-500 fill-pink-500" />
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 text-sm truncate mb-1">
                        {fav.medicineName}
                      </h3>
                      {fav.genericName && (
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {fav.genericName}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        {fav.lastPrice ? (
                          <span className="text-sm font-semibold text-blue-600">
                            NPR {fav.lastPrice}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Price varies</span>
                        )}
                        {fav.lastPharmacy && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                            {fav.lastPharmacy}
                          </span>
                        )}
                      </div>

                      {/* Quick Re-order button */}
                      <button
                        onClick={() => handleQuickReorder(fav.medicineName)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm hover:shadow-md"
                      >
                        <ShoppingCart size={14} />
                        Quick Re-order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
