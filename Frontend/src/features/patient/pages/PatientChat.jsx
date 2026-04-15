import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Send,
  Loader,
  WifiOff,
  AlertCircle,
  CheckCheck,
  Check,
  MessageCircle,
  Pill,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import { connectSocket } from "../../../core/services/socket";
import chatService from "../../chat/services/chat.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Helper functions for time, grouping, and display names.


function fmtDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

// Main patient chat page.


function groupByDate(msgs) {
  const map = new Map();
  for (const m of msgs) {
    const label = fmtDateLabel(m.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(m);
  }
  return Array.from(map.entries());
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function getPharmacyName(room) {
  return room?.pharmacy?.name ?? room?.pharmacy?.user?.name ?? "Pharmacy";
}

function normalizeSOSStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function isClosedSOSStatus(status) {
  const value = normalizeSOSStatus(status);
  return value === "COMPLETED" || value === "EXPIRED" || value === "REJECTED" || value === "DECLINED";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientChat() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── State
  // Page state.


  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingLabel, setTypingLabel] = useState("");
  const [roomsError, setRoomsError] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Refs
  // Refs for scrolling, input focus, and socket timing.


  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);

  // ── Auto-scroll on new content
  // Keep the latest message visible.


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingLabel]);

  // ── Load chat rooms
  // Load the room list and refresh it on a timer.


  const loadRooms = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoadingRooms(true);
      setRoomsError(null);
      const res = await chatService.getChatRooms("all");
      setChatRooms(res.data?.chatRooms ?? res.data ?? []);
    } catch {
      if (!silent) setRoomsError("Could not load conversations.");
    } finally {
      if (!silent) setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms(false);
    const interval = setInterval(() => {
      loadRooms(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [loadRooms]);

  // Keep selected room metadata synced when room list refreshes
  // Keep the selected room in sync when the room list refreshes.


  useEffect(() => {
    if (!selectedRoom?.id || !chatRooms.length) return;
    const refreshed = chatRooms.find((room) => room.id === selectedRoom.id);
    if (refreshed) {
      setSelectedRoom(refreshed);
    }
  }, [chatRooms, selectedRoom?.id]);

  // ── Load messages for selected room
  // Load messages for the active room.


  useEffect(() => {
    if (!selectedRoom) return;
    async function loadMessages() {
      try {
        setIsLoadingMessages(true);
        const res = await chatService.getChatMessages(selectedRoom.id);
        setMessages(res.data?.messages ?? res.data ?? []);
        chatService.markMessagesAsRead(selectedRoom.id).catch(() => {});
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }
    loadMessages();
  }, [selectedRoom]);

  // ── Socket lifecycle
  // Connect the socket only when a room is selected.


  useEffect(() => {
    if (!selectedRoom || !user) return;

    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit("join_room", { roomId: selectedRoom.id, userId: user.id });
    };
    const onDisconnect = () => setIsConnected(false);
    const onMessage = (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.senderId !== user.id) {
        setTypingLabel("");
        chatService.markMessagesAsRead(selectedRoom.id).catch(() => {});
        try { new Audio("/sounds/notification.mp3").play(); } catch {}
      }
      setChatRooms((prev) =>
        prev.map((r) => (r.id === selectedRoom.id ? { ...r, lastMessage: msg, unreadCount: 0 } : r))
      );
    };
    const onTyping = ({ userId: uid, isTyping }) => {
      if (uid === user.id) return;
      if (isTyping) {
        setTypingLabel(`${getPharmacyName(selectedRoom)} is typing…`);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingLabel(""), 3500);
      } else {
        setTypingLabel("");
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", onMessage);
    socket.on("user_typing", onTyping);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      clearTimeout(typingTimerRef.current);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", onMessage);
      socket.off("user_typing", onTyping);
      socket.emit("leave_room", { roomId: selectedRoom.id });
    };
  }, [selectedRoom, user]);

  // ── Send message
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const isClosedCase = isClosedSOSStatus(selectedRoom?.sosRequest?.status);
    if (!text || !selectedRoom || isSending || isClosedCase) return;
    setInput("");
    setIsSending(true);
    clearTimeout(typingTimerRef.current);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("typing_stop", { roomId: selectedRoom.id, userId: user.id });
        socketRef.current.emit("send_message", {
          roomId: selectedRoom.id,
          senderId: user.id,
          content: text,
        });
      } else {
        const res = await chatService.sendMessage(selectedRoom.id, text);
        const msg = res.data?.message ?? res.data;
        setMessages((prev) => [...prev, msg]);
        setChatRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom.id ? { ...r, lastMessage: msg } : r))
        );
      }
    } catch {
      // silent
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, selectedRoom, isSending, user]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socketRef.current?.connected || !selectedRoom) return;
    socketRef.current.emit("typing_start", { roomId: selectedRoom.id, userId: user.id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("typing_stop", { roomId: selectedRoom.id, userId: user.id });
    }, 1000);
  };

  const handleSelectRoom = (room) => {
    if (selectedRoom?.id === room.id) return;
    setSelectedRoom(room);
    setMessages([]);
    setTypingLabel("");
    setInput("");
    setChatRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
    );
  };

  // ── Grouped messages + read receipt helper
  const grouped = groupByDate(messages);

  const activeRooms = useMemo(
    () => chatRooms.filter((room) => !isClosedSOSStatus(room?.sosRequest?.status)),
    [chatRooms]
  );

  const archivedRooms = useMemo(
    () => chatRooms.filter((room) => isClosedSOSStatus(room?.sosRequest?.status)),
    [chatRooms]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRooms = useMemo(() => {
    const source = activeTab === "archive" ? archivedRooms : activeRooms;
    if (!normalizedQuery) return source;

    return source.filter((room) => {
      const pharmacy = getPharmacyName(room).toLowerCase();
      const medicineName = String(room?.sosRequest?.medicineName || "").toLowerCase();
      const lastMessage = String(room?.lastMessage?.content || "").toLowerCase();
      return pharmacy.includes(normalizedQuery)
        || medicineName.includes(normalizedQuery)
        || lastMessage.includes(normalizedQuery);
    });
  }, [activeTab, activeRooms, archivedRooms, normalizedQuery]);

  const selectedRoomIsClosed = isClosedSOSStatus(selectedRoom?.sosRequest?.status);

  const ReadIcon = ({ msg }) => {
    if (msg.senderId !== user?.id) return null;
    if (msg.isRead) return <CheckCheck size={12} className="text-blue-200" />;
    return <Check size={12} className="text-blue-300 opacity-70" />;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  const pharmacyName = selectedRoom ? getPharmacyName(selectedRoom) : null;
  const medicine = selectedRoom?.sosRequest?.medicineName ?? null;
  const urgency = selectedRoom?.sosRequest?.urgency ?? null;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex flex-col">

      {/* ══════════════════════════════════════════════
           GLOBAL HEADER
          ══════════════════════════════════════════════ */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-10">
        {/* Left: PharmEasy home */}
        <button
          onClick={() => navigate("/patient")}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors group"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-[10px] font-black">PE</span>
          </div>
          <span className="hidden sm:inline font-semibold text-slate-700">PharmEasy</span>
          <ArrowLeft size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
        </button>

        {/* Center: pharmacy name + status OR page title */}
        <div className="flex flex-col items-center">
          {pharmacyName ? (
            <>
              <p className="text-sm font-semibold text-slate-800 leading-none">{pharmacyName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-amber-400"}`} />
                <span className={`text-[11px] font-medium ${isConnected ? "text-green-600" : "text-amber-500"}`}>
                  {isConnected ? "Active" : "Connecting…"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-slate-700">Chat Hub</p>
            </div>
          )}
        </div>

        {/* Right: live / offline badge */}
        <div className="flex items-center gap-2 w-28 justify-end">
          {selectedRoom && !isConnected && (
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <WifiOff size={13} />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
          {selectedRoom && isConnected && (
            <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">● Live</span>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════
           BODY: 3-COLUMN LAYOUT
          ══════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

      {/* ═══════════════════════════════════════════
           LEFT COLUMN: Conversations
          ═══════════════════════════════════════════ */}
      <aside
        className={`flex flex-col w-full sm:w-72 xl:w-80 border-r border-slate-200 bg-white flex-shrink-0
          ${selectedRoom ? "hidden sm:flex" : "flex"}`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Conversations</p>
            <MessageCircle size={16} className="text-green-600" />
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "active"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              Active ({activeRooms.length})
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={`px-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "archive"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              Archive ({archivedRooms.length})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "active" ? "Search active chats" : "Search archive"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader size={24} className="animate-spin" />
              <p className="text-sm">Loading conversations…</p>
            </div>
          ) : roomsError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 px-4 text-center">
              <AlertCircle size={24} className="text-red-400" />
              <p className="text-sm text-slate-500">{roomsError}</p>
            </div>
          ) : visibleRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                <MessageCircle size={28} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-600 text-sm">
                {activeTab === "active" ? "No active conversations" : "Your archive is empty"}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeTab === "active"
                  ? "Chats open automatically when a pharmacy accepts your SOS request."
                  : "Completed or closed SOS conversations will appear here."}
              </p>
            </div>
          ) : (
            visibleRooms.map((room) => {
              const pharmacyName = getPharmacyName(room);
              const medicine = room.sosRequest?.medicineName ?? "SOS Request";
              const lastMsg = room.lastMessage;
              const isSelected = selectedRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 border-b border-slate-50
                    ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(pharmacyName)}
                    </div>
                    {isSelected && isConnected && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-slate-800 truncate">{pharmacyName}</p>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                          {fmtTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {lastMsg ? lastMsg.content : `💊 ${medicine}`}
                      </p>
                      {room.unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {room.unreadCount > 9 ? "9+" : room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
           CENTER COLUMN: Message Thread
          ═══════════════════════════════════════════ */}
      <main
        className={`flex-1 flex flex-col bg-[#f0f2f5] min-w-0 overflow-hidden
          ${selectedRoom ? "flex" : "hidden sm:flex"}`}
      >
        {!selectedRoom ? (
          /* Desktop empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center">
              <MessageCircle size={36} className="text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-500">Select a conversation</p>
            <p className="text-sm text-slate-400">
              Choose a pharmacy chat from the sidebar to start messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile back row — hidden on sm+ since global header handles nav */}
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
              >
                <ArrowLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-slate-700 truncate">{pharmacyName}</p>
            </div>

            {/* ── Messages thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <Loader size={24} className="animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                  <Pill size={28} className="text-slate-300" />
                  <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                grouped.map(([label, msgs]) => (
                  <div key={label}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[11px] text-slate-400 font-medium px-2">{label}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {msgs.map((msg) => {
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`flex mb-1.5 items-end gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          {!isOwn && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 self-end">
                              {getInitials(pharmacyName)}
                            </div>
                          )}
                          <div
                            className={`max-w-[65%] px-3.5 py-2 rounded-2xl text-sm shadow-sm
                              ${isOwn
                                ? "bg-blue-500 text-white rounded-br-sm"
                                : "bg-white text-slate-800 rounded-bl-sm"
                              }`}
                          >
                            <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                              <span className={`text-[10px] ${isOwn ? "text-blue-200" : "text-slate-400"}`}>
                                {fmtTime(msg.createdAt)}
                              </span>
                              <ReadIcon msg={msg} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {typingLabel && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex justify-start mb-1"
                  >
                    <div className="flex items-end gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                        {getInitials(pharmacyName)}
                      </div>
                      <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Sticky input bar */}
            {selectedRoomIsClosed ? (
              <div className="flex-shrink-0 bg-amber-50 border-t border-amber-200 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700">Case Closed</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This emergency case is completed. You can view chat history, but new messages are disabled.
                </p>
              </div>
            ) : (
              <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all max-h-28 overflow-y-auto"
                    style={{ lineHeight: "1.5" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all shadow-sm"
                  >
                    {isSending ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══════════════════════════════════════════
           RIGHT COLUMN: SOS Context Panel (xl screens)
          ═══════════════════════════════════════════ */}
      {selectedRoom && (
        <aside className="hidden xl:flex flex-col w-64 border-l border-slate-200 bg-white flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">SOS Details</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Pharmacy card */}
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {getInitials(getPharmacyName(selectedRoom))}
              </div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">{getPharmacyName(selectedRoom)}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-slate-300"}`} />
                <span className={`text-xs font-medium ${isConnected ? "text-green-600" : "text-slate-400"}`}>
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* SOS Fields */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              {medicine && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Medicine</p>
                  <div className="flex items-center gap-2">
                    <Pill size={13} className="text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-slate-700 font-medium">{medicine}</p>
                  </div>
                </div>
              )}
              {urgency && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Urgency</p>
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                      urgency === "HIGH" || urgency === "CRITICAL"
                        ? "bg-red-100 text-red-600"
                        : urgency === "MEDIUM"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {urgency}
                  </span>
                </div>
              )}
              {selectedRoom?.sosRequest?.createdAt && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Requested</p>
                  <p className="text-xs text-slate-600">
                    {new Date(selectedRoom.sosRequest.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
              {selectedRoom?.sosRequest?.status && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Status</p>
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-600">
                    {selectedRoom.sosRequest.status}
                  </span>
                </div>
              )}
            </div>

            {/* Back to dashboard */}
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => navigate("/patient")}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all font-medium"
              >
                <ArrowLeft size={14} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </aside>
      )}

      </div>
    </div>
  );
}