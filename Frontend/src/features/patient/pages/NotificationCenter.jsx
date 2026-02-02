import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Package,
  Clock,
  X,
  Filter,
  Search,
  Settings,
  Trash2,
  ChevronRight,
  Info,
  AlertCircle,
  MoreVertical,
  Check,
  RefreshCw,
  Pill,
  MapPin,
  Phone,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";

/**
 * Notification & Activity Center
 * Color-coded notifications for patients and pharmacy admins
 */
export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Mock notifications data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "sos-claimed",
      title: "SOS Request Claimed",
      message:
        'Apollo Pharmacy has claimed your urgent request for "Insulin Injection"',
      time: "2 minutes ago",
      read: false,
      pharmacy: {
        name: "Apollo Pharmacy",
        phone: "+91 98765 43210",
        address: "123 MG Road, Koramangala",
        distance: "0.8 km",
      },
      medicine: "Insulin Injection",
      eta: "15 minutes",
    },
    {
      id: 2,
      type: "low-stock",
      title: "Low Stock Alert",
      message: "Paracetamol 500mg is running low (5 units remaining)",
      time: "15 minutes ago",
      read: false,
      medicine: "Paracetamol 500mg",
      currentStock: 5,
      threshold: 10,
    },
    {
      id: 3,
      type: "stock-refilled",
      title: "Stock Refilled",
      message: "Amoxicillin 250mg has been restocked (100 units added)",
      time: "1 hour ago",
      read: true,
      medicine: "Amoxicillin 250mg",
      addedQuantity: 100,
      totalStock: 150,
    },
    {
      id: 4,
      type: "sos-claimed",
      title: "SOS Request Fulfilled",
      message:
        'MedPlus has prepared your order for "Metformin 500mg". Ready for pickup.',
      time: "2 hours ago",
      read: true,
      pharmacy: {
        name: "MedPlus",
        phone: "+91 98765 43211",
        address: "456 Brigade Road, Bangalore",
        distance: "1.2 km",
      },
      medicine: "Metformin 500mg",
      status: "ready",
    },
    {
      id: 5,
      type: "low-stock",
      title: "Critical Stock Alert",
      message: "Azithromycin 500mg is out of stock!",
      time: "3 hours ago",
      read: false,
      medicine: "Azithromycin 500mg",
      currentStock: 0,
      threshold: 10,
    },
    {
      id: 6,
      type: "stock-refilled",
      title: "Bulk Stock Update",
      message: "15 medicines have been restocked from CSV upload",
      time: "5 hours ago",
      read: true,
      totalItems: 15,
      method: "CSV Upload",
    },
    {
      id: 7,
      type: "info",
      title: "New Feature Available",
      message:
        "You can now reserve medicines directly from the search results page!",
      time: "1 day ago",
      read: true,
    },
    {
      id: 8,
      type: "sos-claimed",
      title: "SOS Request Expired",
      message:
        'No pharmacy claimed your request for "Cetirizine 10mg". Please try again.',
      time: "1 day ago",
      read: true,
      medicine: "Cetirizine 10mg",
      status: "expired",
    },
  ]);

  const tabs = [
    { id: "all", label: "All", count: notifications.length },
    {
      id: "sos",
      label: "SOS Updates",
      count: notifications.filter((n) => n.type === "sos-claimed").length,
    },
    {
      id: "stock",
      label: "Stock Alerts",
      count: notifications.filter(
        (n) => n.type === "low-stock" || n.type === "stock-refilled"
      ).length,
    },
    { id: "unread", label: "Unread", count: notifications.filter((n) => !n.read).length },
  ];

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "sos" && notification.type === "sos-claimed") ||
      (activeTab === "stock" &&
        (notification.type === "low-stock" ||
          notification.type === "stock-refilled")) ||
      (activeTab === "unread" && !notification.read);

    return matchesSearch && matchesTab;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "sos-claimed":
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-blue-600" size={20} />
          </div>
        );
      case "low-stock":
        return (
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="text-yellow-600" size={20} />
          </div>
        );
      case "stock-refilled":
        return (
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="text-green-600" size={20} />
          </div>
        );
      case "info":
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Info className="text-gray-600" size={20} />
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
      case "sos-claimed":
        return "border-l-blue-500";
      case "low-stock":
        return "border-l-yellow-500";
      case "stock-refilled":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setSelectedNotification(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

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
              <AnimatePresence>
                {filteredNotifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl p-12 text-center"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No notifications
                    </h3>
                    <p className="text-gray-500">
                      You're all caught up! New notifications will appear here.
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
                                    !notification.read ? "font-bold" : ""
                                  }`}
                                >
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.read && (
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={12} />
                                {notification.time}
                              </span>

                              {notification.type === "sos-claimed" &&
                                notification.eta && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    ETA: {notification.eta}
                                  </span>
                                )}

                              {notification.type === "low-stock" && (
                                <span
                                  className={`text-xs font-medium ${
                                    notification.currentStock === 0
                                      ? "text-red-600"
                                      : "text-yellow-600"
                                  }`}
                                >
                                  {notification.currentStock} units left
                                </span>
                              )}
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
                            {selectedNotification.time}
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

                    {/* SOS Claimed Details */}
                    {selectedNotification.type === "sos-claimed" &&
                      selectedNotification.pharmacy && (
                        <div className="space-y-4">
                          <div className="bg-blue-50 rounded-xl p-4">
                            <h4 className="font-medium text-blue-900 mb-3">
                              Pharmacy Details
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Pill className="text-blue-600" size={16} />
                                <span className="text-gray-700">
                                  {selectedNotification.pharmacy.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="text-blue-600" size={16} />
                                <span className="text-gray-600">
                                  {selectedNotification.pharmacy.address}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="text-blue-600" size={16} />
                                <span className="text-gray-600">
                                  {selectedNotification.pharmacy.phone}
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedNotification.eta && (
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                              <span className="text-sm text-green-700">
                                Estimated Time
                              </span>
                              <span className="font-semibold text-green-700">
                                {selectedNotification.eta}
                              </span>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <a
                              href={`tel:${selectedNotification.pharmacy.phone}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                              <Phone size={18} />
                              Call Pharmacy
                            </a>
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                              <MapPin size={18} />
                              Directions
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Low Stock Details */}
                    {selectedNotification.type === "low-stock" && (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 rounded-xl p-4">
                          <h4 className="font-medium text-yellow-900 mb-3">
                            Stock Status
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Current Stock
                            </span>
                            <span
                              className={`font-bold ${
                                selectedNotification.currentStock === 0
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {selectedNotification.currentStock} units
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-600">
                              Threshold
                            </span>
                            <span className="font-medium text-gray-900">
                              {selectedNotification.threshold} units
                            </span>
                          </div>
                        </div>

                        <Link
                          to="/admin/inventory"
                          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition-colors"
                        >
                          <RefreshCw size={18} />
                          Restock Now
                        </Link>
                      </div>
                    )}

                    {/* Stock Refilled Details */}
                    {selectedNotification.type === "stock-refilled" && (
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-xl p-4">
                          <h4 className="font-medium text-green-900 mb-3">
                            Stock Update
                          </h4>
                          {selectedNotification.addedQuantity && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Added
                              </span>
                              <span className="font-bold text-green-600">
                                +{selectedNotification.addedQuantity} units
                              </span>
                            </div>
                          )}
                          {selectedNotification.totalStock && (
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm text-gray-600">
                                Total Stock
                              </span>
                              <span className="font-medium text-gray-900">
                                {selectedNotification.totalStock} units
                              </span>
                            </div>
                          )}
                          {selectedNotification.totalItems && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Items Updated
                              </span>
                              <span className="font-bold text-green-600">
                                {selectedNotification.totalItems} medicines
                              </span>
                            </div>
                          )}
                        </div>

                        <Link
                          to="/admin/inventory"
                          className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={18} />
                          View Inventory
                        </Link>
                      </div>
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
                    <p className="font-medium text-gray-900">Low Stock Alerts</p>
                    <p className="text-sm text-gray-500">
                      Get notified when inventory is running low
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
                    <p className="font-medium text-gray-900">Stock Updates</p>
                    <p className="text-sm text-gray-500">
                      Get notified when stock is refilled
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
  );
}

