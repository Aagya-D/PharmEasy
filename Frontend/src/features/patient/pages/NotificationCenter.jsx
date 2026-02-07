import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Clock,
  X,
  Search,
  Settings,
  Trash2,
  Check,
  Megaphone,
  Heart,
  AlertCircle,
  Loader,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../../../shared/layouts/Layout";
import notificationService from "../../../core/services/notification.service";

/**
 * Notification & Activity Center
 * Real-time notifications from backend (SOS updates, Admin announcements)
 */
export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notifications from backend on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications(50, 0);
      const notifs = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setNotifications(notifs);
      console.log("[NOTIFICATION CENTER] Fetched notifications:", notifs.length);
    } catch (err) {
      console.error("[NOTIFICATION CENTER] Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "all", label: "All", count: notifications.length },
    {
      id: "sos",
      label: "SOS Updates",
      count: notifications.filter((n) => n.type === "SOS_UPDATE").length,
    },
    {
      id: "announcements",
      label: "Announcements",
      count: notifications.filter((n) => n.type === "CMS_ALERT").length,
    },
    { id: "unread", label: "Unread", count: notifications.filter((n) => !n.isRead).length },
  ];

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "sos" && notification.type === "SOS_UPDATE") ||
      (activeTab === "announcements" && notification.type === "CMS_ALERT") ||
      (activeTab === "unread" && !notification.isRead);

    return matchesSearch && matchesTab;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "SOS_UPDATE":
        return (
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="text-red-600" size={20} />
          </div>
        );
      case "CMS_ALERT":
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Megaphone className="text-blue-600" size={20} />
          </div>
        );
      case "MEDICINE_ALERT":
        return (
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="text-green-600" size={20} />
          </div>
        );
      case "SYSTEM_MESSAGE":
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Bell className="text-gray-600" size={20} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Bell className="text-gray-600" size={20} />
          </div>
        );
    }
  };

  const getNotificationBorderColor = (type) => {
    switch (type) {
      case "SOS_UPDATE":
        return "border-l-red-500";
      case "CMS_ALERT":
        return "border-l-blue-500";
      case "MEDICINE_ALERT":
        return "border-l-green-500";
      case "SYSTEM_MESSAGE":
        return "border-l-gray-400";
      default:
        return "border-l-gray-300";
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      console.log("[NOTIFICATION CENTER] Marked as read:", id);
    } catch (err) {
      console.error("[NOTIFICATION CENTER] Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      console.log("[NOTIFICATION CENTER] Marked all as read");
    } catch (err) {
      console.error("[NOTIFICATION CENTER] Failed to mark all as read:", err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter((n) => n.id !== id));
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
      console.log("[NOTIFICATION CENTER] Deleted notification:", id);
    } catch (err) {
      console.error("[NOTIFICATION CENTER] Failed to delete notification:", err);
    }
  };

  const clearAll = async () => {
    try {
      // Delete all notifications one by one
      for (const notif of notifications) {
        await notificationService.deleteNotification(notif.id);
      }
      setNotifications([]);
      setSelectedNotification(null);
      console.log("[NOTIFICATION CENTER] Cleared all notifications");
    } catch (err) {
      console.error("[NOTIFICATION CENTER] Failed to clear all:", err);
    }
  };

  // Format timestamp to relative time
  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Notifications
              </h1>
              <p className="text-gray-500">
                Stay updated with your medicine requests and stock alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Check size={16} />
              Mark all read
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Notifications List */}
          <div className="flex-1">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notifications..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
                  <p className="text-gray-500">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-gray-500 mb-4">{error}</p>
                  <button
                    onClick={fetchNotifications}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredNotifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-xl p-12 text-center"
                    >
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="text-green-600" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        All Caught Up!
                      </h3>
                      <p className="text-gray-500">
                        You have no notifications at the moment. New updates will appear here.
                      </p>
                    </motion.div>
                  ) : (
                  filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      layout
                      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                        selectedNotification?.id === notification.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedNotification(notification);
                        markAsRead(notification.id);
                      }}
                    >
                      <div
                        className={`border-l-4 ${getNotificationBorderColor(
                          notification.type
                        )} p-4`}
                      >
                        <div className="flex items-start gap-4">
                          {getNotificationIcon(notification.type)}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3
                                  className={`font-semibold text-gray-900 ${
                                    !notification.isRead ? "font-bold" : ""
                                  }`}
                                >
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={12} />
                                {formatTime(notification.createdAt)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {notification.type === "SOS_UPDATE" && "SOS Update"}
                                {notification.type === "CMS_ALERT" && "Announcement"}
                                {notification.type === "MEDICINE_ALERT" && "Medicine Alert"}
                                {notification.type === "SYSTEM_MESSAGE" && "System"}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={16} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Notification Detail Panel */}
          <AnimatePresence>
            {selectedNotification && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full lg:w-96 flex-shrink-0"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-24">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getNotificationIcon(selectedNotification.type)}
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {selectedNotification.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatTime(selectedNotification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedNotification(null)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X size={18} className="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-600 mb-6">
                      {selectedNotification.message}
                    </p>

                    {/* Metadata Display */}
                    {selectedNotification.metadata && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Additional Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          {selectedNotification.metadata.pharmacyName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pharmacy:</span>
                              <span className="font-medium text-gray-900">
                                {selectedNotification.metadata.pharmacyName}
                              </span>
                            </div>
                          )}
                          {selectedNotification.metadata.medicineName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Medicine:</span>
                              <span className="font-medium text-gray-900">
                                {selectedNotification.metadata.medicineName}
                              </span>
                            </div>
                          )}
                          {selectedNotification.metadata.status && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium capitalize ${
                                selectedNotification.metadata.status === 'accepted' 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {selectedNotification.metadata.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View SOS Details Button */}
                    {selectedNotification.type === "SOS_UPDATE" && selectedNotification.metadata?.link && (
                      <Link
                        to={selectedNotification.metadata.link}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        View SOS Details
                      </Link>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-100">
                    <button
                      onClick={() =>
                        deleteNotification(selectedNotification.id)
                      }
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Notification
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Notification Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">SOS Updates</p>
                    <p className="text-sm text-gray-500">
                      Get notified when pharmacies respond to your requests
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Admin Announcements</p>
                    <p className="text-sm text-gray-500">
                      Get notified about system announcements
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Medicine Alerts</p>
                    <p className="text-sm text-gray-500">
                      Get notified about medicine availability
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </Layout>
  );
}

