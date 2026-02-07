/**
 * NotificationDropdown Component
 * 
 * Features:
 * - Real-time unread badge count
 * - Dropdown list of latest notifications
 * - Distinct icons for different notification types
 * - Mark single notification as read
 * - Mark all as read button
 * - Empty state message
 * - Short polling (every 60 seconds for real-time updates)
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Megaphone,
  Heart,
  AlertCircle,
  X,
  CheckDone,
  Check,
  ChevronDown,
} from "lucide-react";
import notificationService from "../../core/services/notification.service";

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch unread count periodically (short polling every 60 seconds)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationService.getUnreadCount();
        if (response.data) {
          setUnreadCount(response.data.unreadCount || 0);
        }
      } catch (err) {
        console.error("[NOTIFICATION DROPDOWN] Failed to fetch unread count:", err);
      }
    };

    // Fetch immediately on mount
    fetchUnreadCount();

    // Set up polling every 60 seconds
    const pollInterval = setInterval(fetchUnreadCount, 60000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fetch detailed notifications when dropdown opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await notificationService.getNotifications(10, 0);
        const notifs = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setNotifications(notifs);

        console.log("[NOTIFICATION DROPDOWN] Fetched notifications:", notifs.length);
      } catch (err) {
        console.error("[NOTIFICATION DROPDOWN] Failed to fetch notifications:", err);
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    // Mark as read if not already
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }

    // Navigate to link if available in metadata
    if (notif.metadata?.link) {
      setIsOpen(false);
      navigate(notif.metadata.link);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      
      // Update UI
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      console.log("[NOTIFICATION DROPDOWN] Marked notification as read:", notificationId);
    } catch (err) {
      console.error("[NOTIFICATION DROPDOWN] Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update UI
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);

      console.log("[NOTIFICATION DROPDOWN] Marked all as read");
    } catch (err) {
      console.error("[NOTIFICATION DROPDOWN] Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update UI
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      const deletedNotif = notifications.find((n) => n.id === notificationId);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      console.log("[NOTIFICATION DROPDOWN] Deleted notification:", notificationId);
    } catch (err) {
      console.error("[NOTIFICATION DROPDOWN] Failed to delete notification:", err);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "CMS_ALERT":
        return <Megaphone size={16} className="text-blue-500" />;
      case "SOS_UPDATE":
        return <Heart size={16} className="text-red-500 animate-pulse" />;
      case "MEDICINE_ALERT":
        return <AlertCircle size={16} className="text-green-500" />;
      case "SYSTEM_MESSAGE":
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  // Format timestamp
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
    <div ref={dropdownRef} className="relative">
      {/* Notification Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-700" />
        
        {/* Badge with unread count */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckDone size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="px-4 py-8 text-center text-red-600">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="px-4 py-12 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckDone size={32} className="text-green-500" />
                </div>
                <p className="text-gray-700 font-semibold">You're all caught up!</p>
                <p className="text-gray-500 text-sm mt-1">No new notifications at the moment.</p>
              </div>
            )}

            {!loading &&
              !error &&
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notif.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold text-gray-900 ${
                          !notif.isRead ? "font-bold" : ""
                        }`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-2">
                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} className="text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notif.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Delete"
                      >
                        <X size={14} className="text-gray-500 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Footer */}
          {!loading && !error && notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <a
                href="/notifications"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
