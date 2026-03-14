import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Siren,
  Package,
  AlertTriangle,
  Megaphone,
  Clock,
  Volume2,
  VolumeX,
  ExternalLink,
  Zap,
} from "lucide-react";
import notificationService from "../../../core/services/notification.service";
import { connectSocket } from "../../../core/services/socket";
import { useNotification } from "../../../context/NotificationContext";

// ── Type visual config
const TYPE_CONFIG = {
  SOS_ALERT: {
    icon: Siren,
    bg: "bg-red-100",
    text: "text-red-600",
    ring: "ring-red-300",
    label: "Emergency SOS",
    pulse: true,
  },
  SOS_UPDATE: {
    icon: Siren,
    bg: "bg-red-100",
    text: "text-red-600",
    ring: "ring-red-300",
    label: "SOS Alert",
    pulse: true,
  },
  LOW_STOCK_WARNING: {
    icon: Package,
    bg: "bg-amber-100",
    text: "text-amber-600",
    ring: "ring-amber-200",
    label: "Low Stock",
    pulse: false,
  },
  EXPIRY_WARNING: {
    icon: AlertTriangle,
    bg: "bg-orange-100",
    text: "text-orange-600",
    ring: "ring-orange-200",
    label: "Expiring Soon",
    pulse: false,
  },
  MEDICINE_ALERT: {
    icon: AlertTriangle,
    bg: "bg-amber-100",
    text: "text-amber-600",
    ring: "ring-amber-200",
    label: "Medicine Alert",
    pulse: false,
  },
  CMS_ALERT: {
    icon: Megaphone,
    bg: "bg-blue-100",
    text: "text-blue-600",
    ring: "ring-blue-200",
    label: "Announcement",
    pulse: false,
  },
  SYSTEM_MESSAGE: {
    icon: Bell,
    bg: "bg-gray-100",
    text: "text-gray-600",
    ring: "ring-gray-200",
    label: "System",
    pulse: false,
  },
  NEW_ORDER: {
    icon: Package,
    bg: "bg-blue-100",
    text: "text-blue-600",
    ring: "ring-blue-200",
    label: "New Order",
    pulse: true,
  },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.SYSTEM_MESSAGE;
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Extract a navigable link from notification metadata */
function getActionLink(n) {
  try {
    const meta = typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata;
    return meta?.link || null;
  } catch {
    return null;
  }
}

export default function PharmacyNotificationBell() {
  const navigate = useNavigate();

  // ── Auth safety check ────────────────────────────────
  const token = typeof window !== "undefined"
    ? localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
    : null;
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // ── Global notification state from context ───────────
  const {
    unreadNotifications: unreadCount,
    hasHighPriority,
    decrementNotifications,
    clearNotifications,
    setUnreadNotifications,
    setHasHighPriority,
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // If auth state is incomplete, render nothing (avoids 401 cascade)
  if (!token || !storedUser?.id) {
    return null;
  }

  // ── Fetch notifications list (for dropdown display) ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(20, 0);
      const data = res?.data?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);

      // Sync badge count from the authoritative DB list
      const realUnread = list.filter((n) => !n.isRead).length;
      setUnreadNotifications(realUnread);
      setHasHighPriority(
        list.some(
          (n) => !n.isRead && (n.priority === "high" || n.type === "SOS_ALERT" || n.type === "SOS_UPDATE")
        )
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotifications, setHasHighPriority]);

  // ── Refresh notifications when dropdown opens ────────
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // ── Also refresh list on SOS alert (keep list fresh) ─
  // NotificationContext already handles sound + badge increment.
  // We just need to refresh the list so the new SOS row appears.
  useEffect(() => {
    const socket = connectSocket();
    const onSOS = () => { if (isOpen) fetchNotifications(); };
    socket.on("NEW_SOS_ALERT", onSOS);
    return () => { socket.off("NEW_SOS_ALERT", onSOS); };
  }, [isOpen, fetchNotifications]);

  // ── Click-outside to close popover ───────────────────
  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // ── Actions ──────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      decrementNotifications(1);
    } catch {
      /* silent */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      clearNotifications();
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (id, wasUnread) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) decrementNotifications(1);
    } catch {
      /* silent */
    }
  };

  /** Navigate to the notification's action link and auto-mark as read */
  const handleNotificationClick = async (n) => {
    const link = getActionLink(n);
    if (!n.isRead) {
      handleMarkRead(n.id); // fire-and-forget
    }
    if (link) {
      setIsOpen(false);
      navigate(link);
    }
  };

  const isHighPriority = (n) =>
    n.priority === "high" || n.type === "SOS_UPDATE" || n.type === "SOS_ALERT";

  // Sort: SOS_ALERT first, then SOS_UPDATE, then unread, then by date
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aSOS = (a.type === "SOS_ALERT" || a.type === "SOS_UPDATE") && !a.isRead;
    const bSOS = (b.type === "SOS_ALERT" || b.type === "SOS_UPDATE") && !b.isRead;
    // Emergency SOS_ALERT always tops
    if (a.type === "SOS_ALERT" && !a.isRead && b.type !== "SOS_ALERT") return -1;
    if (b.type === "SOS_ALERT" && !b.isRead && a.type !== "SOS_ALERT") return 1;
    if (aSOS && !bSOS) return -1;
    if (!aSOS && bSOS) return 1;
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="relative">
      {/* ── Bell Button ──────────────────────────────── */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen((o) => !o)}
        className={`relative p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
          hasHighPriority && unreadCount > 0
            ? "bg-red-50 hover:bg-red-100"
            : "hover:bg-gray-100"
        }`}
        aria-label="Notifications"
      >
        {hasHighPriority && unreadCount > 0 ? (
          <Siren
            size={22}
            className="text-red-500 animate-pulse"
          />
        ) : (
          <Bell
            size={22}
            className={`transition-colors ${isOpen ? "text-blue-600" : "text-gray-600"}`}
          />
        )}

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1 text-white text-[11px] font-bold rounded-full shadow-lg ring-2 ring-white ${
                hasHighPriority ? "bg-red-600 animate-pulse" : "bg-red-500"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Dropdown Panel ───────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-[420px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Pharmacy Alerts
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Sound toggle */}
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  title={soundEnabled ? "Mute alerts" : "Enable alerts"}
                >
                  {soundEnabled ? (
                    <Volume2 size={16} className="text-gray-500" />
                  ) : (
                    <VolumeX size={16} className="text-gray-400" />
                  )}
                </button>
                {/* Mark all read */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={16} className="text-gray-500" />
                  </button>
                )}
                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="p-4 bg-gray-100 rounded-2xl mb-4">
                    <Bell size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-700 font-semibold">All clear!</p>
                  <p className="text-gray-400 text-sm mt-1">
                    SOS alerts, stock warnings, and announcements will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {sortedNotifications.map((n) => {
                    const cfg = getConfig(n.type);
                    const Icon = cfg.icon;
                    const highPri = isHighPriority(n);
                    const link = getActionLink(n);
                    // Treat both SOS_ALERT and unread SOS_UPDATE as actionable SOS rows
                    const isSOS = (n.type === "SOS_ALERT" || n.type === "SOS_UPDATE") && !n.isRead;
                    // SOS_ALERT rows get the emergency red border; SOS_UPDATE unread get softer red
                    const isEmergency = n.type === "SOS_ALERT" && !n.isRead;

                    return (
                      <li
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`group relative flex gap-3 px-5 py-4 transition-colors ${
                          link ? "cursor-pointer" : ""
                        } ${
                          isEmergency
                            ? "bg-red-50/70 hover:bg-red-100/70 border-l-4 border-red-500"
                            : isSOS
                            ? "bg-red-50/40 hover:bg-red-50/70 border-l-2 border-red-400"
                            : !n.isRead
                            ? highPri
                              ? "bg-red-50/50 hover:bg-red-50"
                              : "bg-blue-50/40 hover:bg-blue-50/60"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Type icon */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} ${
                            cfg.pulse && !n.isRead ? `ring-2 ${cfg.ring} animate-pulse` : ""
                          }`}
                        >
                          <Icon size={18} className={cfg.text} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-sm leading-snug ${
                                  !n.isRead
                                    ? "font-semibold text-gray-900"
                                    : "text-gray-700"
                                }`}
                              >
                                {n.title}
                              </p>
                              {highPri && !n.isRead && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white rounded">
                                  Urgent
                                </span>
                              )}
                            </div>
                            {!n.isRead && (
                              <span className="mt-1.5 flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {timeAgo(n.createdAt)}
                            </span>
                            <span
                              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                            {isSOS && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!n.isRead) handleMarkRead(n.id);
                                  setIsOpen(false);
                                  navigate(link || "/pharmacy/sos-requests");
                                }}
                                className={`ml-auto flex items-center gap-1 px-2 py-0.5 text-white text-[11px] font-bold rounded hover:opacity-90 transition-colors ${
                                  isEmergency ? "bg-red-600" : "bg-red-500"
                                }`}
                              >
                                <Zap size={10} />
                                {isEmergency ? "Respond NOW" : "Respond"}
                              </button>
                            )}
                            {!isSOS && link && (
                              <span className="text-[11px] text-blue-500 flex items-center gap-0.5 ml-auto">
                                <ExternalLink size={10} /> View
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons (visible on hover) */}
                        <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1">
                          {!n.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(n.id);
                              }}
                              className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-blue-50 transition-colors"
                              title="Mark as read"
                            >
                              <Check size={13} className="text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(n.id, !n.isRead);
                            }}
                            className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} className="text-red-500" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60 text-center">
                <p className="text-xs text-gray-400">
                  Showing latest {notifications.length} alert
                  {notifications.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
