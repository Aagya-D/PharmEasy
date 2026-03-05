import { io } from "socket.io-client";

/**
 * Socket.IO client singleton for real-time features.
 * Connects to the backend server (same origin, no /api prefix).
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5050");

let socket = null;

/**
 * Get or create the Socket.IO client instance (lazy singleton).
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * Connect the socket (idempotent).
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Disconnect the socket.
 */
export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export default { getSocket, connectSocket, disconnectSocket };
