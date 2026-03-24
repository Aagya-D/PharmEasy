import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Loader, WifiOff, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { connectSocket, disconnectSocket } from "../../../core/services/socket";
import chatService from "../services/chat.service";

/**
 * ChatWindow Component
 *
 * Real-time chat between Patient and Pharmacy after SOS acceptance.
 *
 * @param {Object} props
 * @param {string} props.sosRequestId - The SOS request ID (links chat to the emergency)
 * @param {Object} props.currentUser  - { id: string, name: string } – the logged-in user
 * @param {Function} [props.onClose]  - Optional callback to close/hide the chat panel
 * @param {boolean} [props.readOnly]  - If true, render read-only chat history (no message input)
 */
export default function ChatWindow({ sosRequestId, currentUser, onClose, readOnly = false }) {
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  // "pending" = room not yet created, retrying; "ready" = roomId resolved; "error" = fatal
  const [roomStatus, setRoomStatus] = useState("pending");
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Step 1: Resolve sosRequestId → roomId (with polling retry) ─────
  useEffect(() => {
    if (!sosRequestId) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 12;   // 12 × 3 s = 36 s max wait
    const RETRY_MS = 3000;

    const resolveRoom = async () => {
      if (cancelled) return;
      try {
        const res = await chatService.getRoomBySosRequest(sosRequestId);
        if (cancelled) return;

        if (res.success && res.data?.roomId) {
          setRoomStatus("ready");
          setRoomId(res.data.roomId);
          return;
        }

        // notInitialized = room not yet created → keep retrying
        if (res.notInitialized && attempts < MAX_ATTEMPTS) {
          attempts += 1;
          retryTimerRef.current = setTimeout(resolveRoom, RETRY_MS);
          return;
        }
      } catch (_err) {
        if (cancelled) return;
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          retryTimerRef.current = setTimeout(resolveRoom, RETRY_MS);
          return;
        }
      }

      // Exhausted retries
      setRoomStatus("error");
      setError("Could not connect to chat room. Please close and try again.");
      setIsLoading(false);
    };

    setRoomStatus("pending");
    resolveRoom();
    return () => {
      cancelled = true;
      clearTimeout(retryTimerRef.current);
    };
  }, [sosRequestId]);

  // ── Step 2: Fetch chat history once roomId is known ─────────────────
  useEffect(() => {
    // Guard: do nothing until roomId is resolved
    if (!roomId) return;

    let cancelled = false;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await chatService.getChatMessages(roomId);
        if (!cancelled && response.success && response.data?.messages) {
          setMessages(response.data.messages);
        }
      } catch (err) {
        console.error("[CHAT] Failed to fetch history:", err);
        if (!cancelled) setError("Failed to load chat history");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [roomId]);

  // ── Step 3: Socket — only AFTER roomId AND userId are ready ────────
  useEffect(() => {
    // Guard: do not connect until both roomId and user are available
    if (!roomId || !currentUser?.id) return;

    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      // Send both roomId and userId as required by the backend chatHandler
      socket.emit("join_room", { roomId, userId: currentUser.id });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomJoined = (data) => {
      console.log("[CHAT] Joined room:", data.room);
    };

    const onChatError = (data) => {
      console.error("[CHAT] Socket error:", data.message);
      setError(data.message);
    };

    const onReceiveMessage = (message) => {
      setMessages((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_joined", onRoomJoined);
    socket.on("chat_error", onChatError);
    socket.on("receive_message", onReceiveMessage);

    // If already connected, join immediately
    if (socket.connected) {
      setIsConnected(true);
      socket.emit("join_room", { roomId, userId: currentUser.id });
    }

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_joined", onRoomJoined);
      socket.off("chat_error", onChatError);
      socket.off("receive_message", onReceiveMessage);
      disconnectSocket();
    };
  }, [roomId, currentUser?.id]);

  // ── Send a message ───────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = newMessage.trim();
    if (readOnly || !trimmed || !socketRef.current || isSending || !roomId) return;

    setIsSending(true);
    socketRef.current.emit("send_message", {
      roomId,
      senderId: currentUser.id,
      content: trimmed,
    });

    setNewMessage("");
    setIsSending(false);
    inputRef.current?.focus();
  }, [newMessage, roomId, currentUser?.id, isSending, readOnly]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Helpers ──────────────────────────────────────────────
  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (ts) => {
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <MessageCircle size={20} />
          <div>
            <h3 className="font-semibold text-sm">{readOnly ? "SOS Chat History" : "SOS Chat"}</h3>
            <div className="flex items-center gap-1.5 text-xs text-green-100">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-300" : "bg-red-400"
                }`}
              />
              {isConnected ? "Connected" : "Reconnecting..."}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Connection warning ── */}
      {!isConnected && !isLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-700 text-xs">
          <WifiOff size={14} />
          <span>Connection lost. Messages will be sent when reconnected.</span>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0 bg-gray-50">
        {roomStatus === "pending" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 px-6 text-center">
            <Clock className="animate-pulse text-green-500" size={36} />
            <p className="font-medium text-gray-700">Connecting to Pharmacist...</p>
            <p className="text-sm text-gray-400">Chat will open as soon as the request is processed.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="animate-spin text-green-600" size={28} />
            <span className="ml-2 text-gray-500 text-sm">Loading chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-500">
                  {formatDate(dateMessages[0].createdAt)}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {dateMessages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex mb-2 ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-green-600 text-white rounded-br-md"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-semibold text-green-700 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={`text-[10px] mt-1 text-right ${
                            isOwn ? "text-green-200" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      {!readOnly && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-h-24"
              style={{ minHeight: "40px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 96) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending || !isConnected || roomStatus !== "ready"}
              className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {readOnly && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
          <p className="text-sm font-semibold text-amber-700">Case Closed</p>
          <p className="text-xs text-amber-600 mt-0.5">
            This SOS case has been archived. Chat is available in read-only mode.
          </p>
        </div>
      )}
    </div>
  );
}
