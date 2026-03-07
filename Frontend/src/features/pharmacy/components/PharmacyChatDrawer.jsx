import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare,
  X,
  Pill,
  Clock,
  ChevronRight,
  Loader,
  MessageCircle,
  Bell,
} from "lucide-react";
import httpClient from "../../../core/services/httpClient";
import ChatWindow from "../../chat/components/ChatWindow";
import { connectSocket } from "../../../core/services/socket";

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const URGENCY_COLORS = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
};

/** Soft two-tone chime using Web Audio API — no audio file required */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {
    /* AudioContext blocked before user gesture — ignore */
  }
}

export default function PharmacyChatDrawer({ isOpen, onClose, currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChatSOS, setActiveChatSOS] = useState(null);
  const [activeChatPatient, setActiveChatPatient] = useState("");

  // ── Fetch rooms from the correct /chat/rooms endpoint ──────────────
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get("/chat/rooms");
      // API returns { success, data: { chatRooms: [...] } }
      setConversations(res.data?.data?.chatRooms || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !activeChatSOS) fetchConversations();
  }, [isOpen, activeChatSOS, fetchConversations]);

  // ── Socket: live new-message sidebar updates + new-chat alert ──────
  useEffect(() => {
    if (!isOpen) return;

    const socket = connectSocket();

    /** When any message is sent, update the matching room's snippet + sort it to top */
    const handleNewMessage = (data) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.roomId);
        if (idx === -1) return prev; // not our room
        const updated = [...prev];
        const room = {
          ...updated[idx],
          lastMessage: {
            content: data.preview,
            senderName: data.senderName,
            createdAt: data.createdAt,
          },
          // Only bump unreadCount when the active chat is a different room
          unreadCount:
            activeChatSOS !== updated[idx].sosRequestId
              ? (updated[idx].unreadCount || 0) + 1
              : 0,
        };
        updated.splice(idx, 1);
        return [room, ...updated];
      });

      // Chime only when the pharmacy is NOT already watching that room
      const inActiveChat =
        activeChatSOS != null &&
        conversations.find((c) => c.id === data.roomId)?.sosRequestId === activeChatSOS;
      if (!inActiveChat) playChime();
    };

    /** When SOS is accepted, a new ChatRoom is created — add it to the sidebar instantly */
    const handleNewChat = (data) => {
      if (data.pharmacyId !== currentUser?.id) return;
      setConversations((prev) => {
        if (prev.some((c) => c.sosRequestId === data.room.sosRequestId)) return prev;
        return [data.room, ...prev];
      });
      playChime();
    };

    socket.on("new_message_notification", handleNewMessage);
    socket.on("new_chat_available", handleNewChat);

    return () => {
      socket.off("new_message_notification", handleNewMessage);
      socket.off("new_chat_available", handleNewChat);
    };
  }, [isOpen, currentUser?.id, activeChatSOS, conversations]);

  const handleBack = () => {
    setActiveChatSOS(null);
    setActiveChatPatient("");
    // Re-fetch so unread counts are cleared after reading
    fetchConversations();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            {activeChatSOS ? (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
            ) : (
              <MessageSquare size={22} />
            )}
            <div>
              <h3 className="font-semibold text-sm">
                {activeChatSOS ? `Chat with ${activeChatPatient}` : "Messages"}
              </h3>
              <p className="text-xs text-blue-100">
                {activeChatSOS
                  ? "SOS Emergency Chat"
                  : `${conversations.length} active conversation${conversations.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {activeChatSOS ? (
            <ChatWindow
              sosRequestId={activeChatSOS}
              currentUser={currentUser}
              onClose={handleBack}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader className="animate-spin text-blue-600" size={28} />
                  <span className="ml-2 text-gray-500 text-sm">Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="p-4 bg-blue-50 rounded-2xl mb-4">
                    <MessageCircle size={36} className="text-blue-300" />
                  </div>
                  <p className="text-gray-700 font-semibold">No conversations yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Accept an SOS request to start chatting with patients
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {conversations.map((room) => {
                    const patientName = room.patient?.name || "Patient";
                    const initials = patientName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const urgency = room.sosRequest?.urgencyLevel;
                    const medicine = room.sosRequest?.medicineName;
                    const lastTime = room.lastMessage?.createdAt || room.createdAt;

                    return (
                      <li
                        key={room.id || room.sosRequestId}
                        onClick={() => {
                          setActiveChatSOS(room.sosRequestId);
                          setActiveChatPatient(patientName);
                        }}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        {/* Avatar */}
                        <div className="relative w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold text-sm">{initials}</span>
                          {room.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                              {room.unreadCount > 9 ? "9+" : room.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold truncate ${room.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                              {patientName}
                            </p>
                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                              {timeAgo(lastTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Pill size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 truncate">{medicine}</span>
                            {urgency && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  URGENCY_COLORS[urgency] || "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {urgency}
                              </span>
                            )}
                          </div>
                          {room.lastMessage ? (
                            <p className={`text-xs mt-0.5 truncate ${room.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                              {room.lastMessage.senderName
                                ? `${room.lastMessage.senderName}: ${room.lastMessage.content}`
                                : room.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5 italic">No messages yet</p>
                          )}
                        </div>

                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
