/**
 * NotificationContext.jsx
 *
 * Global real-time notification state for the PharmEasy application.
 *
 * Provides:
 *   unreadNotifications  — count of unread bell-notifications (for all role nav badges)
 *   unreadMessages       — count of unread chat messages (for chat FAB / drawer badges)
 *   hasHighPriority      — true when any unread notification is SOS / high-priority
 *
 * Real-time triggers (Socket.IO):
 *   NEW_SOS_ALERT        — increments unreadNotifications + plays urgent chime
 *   NEW_MESSAGE          — increments unreadMessages + plays urgent chime
 *   new_message_notification — same as NEW_MESSAGE (legacy alias from chat controller)
 *   ADMIN_BROADCAST      — increments unreadNotifications + plays standard ping
 *   NEW_ORDER            — increments unreadNotifications + plays standard ping (pharmacy)
 *   SYSTEM_ALERT         — global system-admin alert stream (registrations, SOS, security flags)
 *
 * Imperative API (for badge-clearing after user actions):
 *   refreshNotifications()     — re-fetches notification count from backend
 *   refreshMessages()          — re-fetches chat unread count from backend
 *   decrementNotifications(n)  — subtract n from unreadNotifications (mark-as-read)
 *   clearNotifications()       — set unreadNotifications to 0 (mark-all-as-read)
 *   clearMessages()            — set unreadMessages to 0 (enter chat room)
 *   setUnreadNotifications(n)  — direct setter (for components that know the exact count)
 *   setHasHighPriority(bool)   — direct setter
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { connectSocket } from "../core/services/socket";
import { useAuth } from "./AuthContext";
import { playNotificationSound } from "../utils/notificationSound";
import notificationService from "../core/services/notification.service";
import chatService from "../features/chat/services/chat.service";

// Notification context object.
const NotificationContext = createContext(null);

// Notification provider component.
export function NotificationProvider({ children }) {
  // Read auth state so listeners only run for authenticated users.
  const { isAuthenticated, user } = useAuth();

  // Unread bell-notification count.
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // Unread chat-message count.
  const [unreadMessages, setUnreadMessages] = useState(0);
  // High-priority notification flag.
  const [hasHighPriority, setHasHighPriority] = useState(false);

  // Keep previous counts for polling-based sound control.
  const prevNotifCountRef = useRef(0);
  const prevMsgCountRef   = useRef(0);

  // Fetch unread notification count from backend.
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      const count =
        res?.data?.data?.unreadCount ??
        res?.data?.unreadCount ??
        0;
      const high =
        res?.data?.data?.hasHighPriority ??
        res?.data?.hasHighPriority ??
        false;
      setUnreadNotifications(count);
      setHasHighPriority(high);
    } catch {
      // Keep previous badge value on fetch failure.
    }
  }, [isAuthenticated]);

  // Fetch unread chat message count from backend.
  const refreshMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await chatService.getUnreadCount();
      const count = res?.data?.unreadCount ?? 0;
      setUnreadMessages(count);
    } catch {
      // Keep previous message count on fetch failure.
    }
  }, [isAuthenticated]);

  // Initial unread fetch with 60-second polling fallback.
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset all counters when user is logged out.
      setUnreadNotifications(0);
      setUnreadMessages(0);
      setHasHighPriority(false);
      prevNotifCountRef.current = 0;
      prevMsgCountRef.current   = 0;
      return;
    }

    refreshNotifications();
    refreshMessages();

    const interval = setInterval(() => {
      refreshNotifications();
      refreshMessages();
    }, 60_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshNotifications, refreshMessages]);

  // Register real-time socket listeners for incoming alerts.
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();

    // Handle SOS alert events.
    const onSOS = () => {
      setUnreadNotifications((c) => c + 1);
      setHasHighPriority(true);
      playNotificationSound("urgent");
    };

    // Handle chat message events (canonical event name).
    const onNewMessage = (payload) => {
      // Only increment for intended recipient.
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadMessages((c) => c + 1);
      playNotificationSound("urgent");
    };

    // Handle legacy chat message event alias.
    const onNewMessageLegacy = (payload) => {
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadMessages((c) => c + 1);
      playNotificationSound("urgent");
    };

    // Handle admin/cms broadcasts (announcements and health tips) with role-aware filtering.
    const onAdminBroadcast = (payload = {}) => {
      const roleId = Number(user?.roleId);
      const myRole =
        roleId === 1 ? "ADMIN" :
        roleId === 2 ? "PHARMACY" :
        roleId === 3 ? "PATIENT" :
        null;

      const targetRole = String(payload?.targetRole || "").toUpperCase();
      const isTargetedToMe =
        !targetRole ||
        targetRole === "ALL" ||
        targetRole === myRole ||
        (myRole === "PHARMACY" && targetRole === "PHARMACY_ADMIN");

      if (!isTargetedToMe) return;

      setUnreadNotifications((c) => c + 1);
      if (payload?.priority === "high") {
        setHasHighPriority(true);
      }
      playNotificationSound("cms");
    };

    // Handle new order events.
    const onNewOrder = (payload) => {
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadNotifications((c) => c + 1);
      playNotificationSound("standard");
    };

    // Handle system alert events for admin role.
    const onSystemAlert = () => {
      if (user?.roleId !== 1) return;
      setUnreadNotifications((c) => c + 1);
      setHasHighPriority(true);
      playNotificationSound("admin");
    };

    socket.on("NEW_SOS_ALERT",              onSOS);
    socket.on("NEW_MESSAGE",                onNewMessage);
    socket.on("new_message_notification",   onNewMessageLegacy);
    socket.on("ADMIN_BROADCAST",            onAdminBroadcast);
    socket.on("NEW_ORDER",                  onNewOrder);
    socket.on("SYSTEM_ALERT",               onSystemAlert);

    return () => {
      socket.off("NEW_SOS_ALERT",             onSOS);
      socket.off("NEW_MESSAGE",               onNewMessage);
      socket.off("new_message_notification",  onNewMessageLegacy);
      socket.off("ADMIN_BROADCAST",           onAdminBroadcast);
      socket.off("NEW_ORDER",                 onNewOrder);
      socket.off("SYSTEM_ALERT",              onSystemAlert);
    };
  }, [isAuthenticated, user?.id, user?.roleId]);

  // Imperative badge-clearing helpers.

  const decrementNotifications = useCallback((n = 1) => {
    // Decrease notification count without going below zero.
    setUnreadNotifications((c) => Math.max(0, c - n));
  }, []);

  const clearNotifications = useCallback(() => {
    // Clear bell count and reset priority flag.
    setUnreadNotifications(0);
    setHasHighPriority(false);
  }, []);

  const clearMessages = useCallback(() => {
    // Clear chat unread counter.
    setUnreadMessages(0);
  }, []);

  // Context value exposed to consumers.

  const value = {
    unreadNotifications,
    unreadMessages,
    hasHighPriority,
    setUnreadNotifications,
    setHasHighPriority,
    refreshNotifications,
    refreshMessages,
    decrementNotifications,
    clearNotifications,
    clearMessages,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * useNotification()
 *
 * Returns the global notification state and imperative helpers.
 * Must be used inside <NotificationProvider>.
 */
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return ctx;
}

export default NotificationContext;
