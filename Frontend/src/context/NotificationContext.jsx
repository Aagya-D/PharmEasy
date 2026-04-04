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

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [hasHighPriority, setHasHighPriority] = useState(false);

  // Track previous counts so we only chime on NEW events during polling
  const prevNotifCountRef = useRef(0);
  const prevMsgCountRef   = useRef(0);

  // ── Fetch notification unread count from backend ──────────────────────────
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
      // silent — badge stays at last known value
    }
  }, [isAuthenticated]);

  // ── Fetch chat unread count from backend ──────────────────────────────────
  const refreshMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await chatService.getUnreadCount();
      const count = res?.data?.unreadCount ?? 0;
      setUnreadMessages(count);
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  // ── Initial fetch + fallback polling (60s) ───────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
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

  // ── Socket.IO real-time listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();

    // NEW_SOS_ALERT — emitted by patient.controller when SOS is filed
    const onSOS = () => {
      setUnreadNotifications((c) => c + 1);
      setHasHighPriority(true);
      playNotificationSound("urgent");
    };

    // NEW_MESSAGE — our new canonical event for chat messages
    const onNewMessage = (payload) => {
      // Only increment for the intended recipient
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadMessages((c) => c + 1);
      playNotificationSound("urgent");
    };

    // new_message_notification — legacy lowercase alias emitted by chat controller
    const onNewMessageLegacy = (payload) => {
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadMessages((c) => c + 1);
      playNotificationSound("urgent");
    };

    // ADMIN_BROADCAST — emitted by admin.controller when announcement is published
    const onAdminBroadcast = () => {
      setUnreadNotifications((c) => c + 1);
      playNotificationSound("standard");
    };

    // NEW_ORDER — emitted when patient places a checkout order
    const onNewOrder = (payload) => {
      const myId = user?.id;
      if (payload?.recipientId && myId && payload.recipientId !== myId) return;
      setUnreadNotifications((c) => c + 1);
      playNotificationSound("standard");
    };

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

  // ── Imperative badge-clearing helpers ─────────────────────────────────────

  const decrementNotifications = useCallback((n = 1) => {
    setUnreadNotifications((c) => Math.max(0, c - n));
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadNotifications(0);
    setHasHighPriority(false);
  }, []);

  const clearMessages = useCallback(() => {
    setUnreadMessages(0);
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
