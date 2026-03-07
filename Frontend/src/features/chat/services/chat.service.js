import httpClient from "../../../core/services/httpClient";

const chatService = {
  /**
   * Fetch all chat rooms for the authenticated user
   * @returns {Promise<{ success: boolean, data: { rooms: Array } }>}
   */
  getChatRooms: async () => {
    const response = await httpClient.get("/chat/rooms");
    return response.data;
  },

  /**
   * Fetch messages for a specific chat room
   * @param {string} roomId
   * @returns {Promise<{ success: boolean, data: { room: Object, messages: Array } }>}
   */
  getChatMessages: async (roomId) => {
    const response = await httpClient.get(`/chat/rooms/${roomId}/messages`);
    return response.data;
  },

  /**
   * Get unread message count for the authenticated user
   * @returns {Promise<{ success: boolean, data: { unreadCount: number } }>}
   */
  getUnreadCount: async () => {
    const response = await httpClient.get("/chat/unread-count");
    return response.data;
  },

  /**
   * Send a message in a chat room (via HTTP, not socket)
   * @param {string} roomId
   * @param {string} content
   * @returns {Promise<{ success: boolean, data: { message: Object } }>}
   */
  sendMessage: async (roomId, content) => {
    const response = await httpClient.post(`/chat/rooms/${roomId}/messages`, {
      content,
    });
    return response.data;
  },

  /**
   * Mark all messages in a room as read
   * @param {string} roomId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  markMessagesAsRead: async (roomId) => {
    const response = await httpClient.put(`/chat/rooms/${roomId}/mark-read`);
    return response.data;
  },

  // Legacy method for backward compatibility
  getChatHistory: async (sosRequestId) => {
    const response = await httpClient.get(`/chat/${sosRequestId}`);
    return response.data;
  },
};

export default chatService;
