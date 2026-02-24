import httpClient from "../../../core/services/httpClient";

const chatService = {
  /**
   * Fetch chat history for a specific SOS request
   * @param {string} sosRequestId
   * @returns {Promise<{ success: boolean, data: { messages: Array } }>}
   */
  getChatHistory: async (sosRequestId) => {
    const response = await httpClient.get(`/chat/${sosRequestId}`);
    return response.data;
  },
};

export default chatService;
