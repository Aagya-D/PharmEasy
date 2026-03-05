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
} from "lucide-react";
import httpClient from "../../../core/services/httpClient";
import ChatWindow from "../../chat/components/ChatWindow";

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

export default function PharmacyChatDrawer({ isOpen, onClose, currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChatSOS, setActiveChatSOS] = useState(null);
  const [activeChatPatient, setActiveChatPatient] = useState("");

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get("/chat/conversations");
      setConversations(res.data?.data?.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !activeChatSOS) fetchConversations();
  }, [isOpen, activeChatSOS, fetchConversations]);

  const handleBack = () => {
    setActiveChatSOS(null);
    setActiveChatPatient("");
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
                  {conversations.map((conv) => (
                    <li
                      key={conv.sosRequestId}
                      onClick={() => {
                        setActiveChatSOS(conv.sosRequestId);
                        setActiveChatPatient(conv.patientName);
                      }}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-bold text-sm">
                          {conv.patientName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {conv.patientName}
                          </p>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">
                            {conv.lastMessage
                              ? timeAgo(conv.lastMessage.createdAt)
                              : timeAgo(conv.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Pill size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">
                            {conv.medicineName}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              URGENCY_COLORS[conv.urgencyLevel] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {conv.urgencyLevel}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {conv.lastMessage.senderName}:{" "}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>

                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
