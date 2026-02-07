import { httpClient } from "./httpClient";

/**
 * Content Service
 * Handles health tips and announcements API calls
 */
class ContentService {
  /**
   * Get active health tips
   * @returns {Promise} - List of active health tips
   */
  async getHealthTips() {
    try {
      const response = await httpClient.get("/content/health-tips");
      return response.data;
    } catch (error) {
      console.error("[CONTENT SERVICE] Error fetching health tips:", error);
      throw error;
    }
  }

  /**
   * Get latest active health tip for display
   * @returns {Promise} - Single most recent active health tip
   */
  async getLatestHealthTip() {
    try {
      const response = await httpClient.get("/content/health-tips/latest");
      return response.data;
    } catch (error) {
      console.error("[CONTENT SERVICE] Error fetching latest health tip:", error);
      throw error;
    }
  }

  /**
   * Get active announcements
   * @param {string} targetRole - Filter by target role (optional)
   * @returns {Promise} - List of active announcements
   */
  async getAnnouncements(targetRole = null) {
    try {
      const params = targetRole ? { targetRole } : {};
      const response = await httpClient.get("/content/announcements", { params });
      return response.data;
    } catch (error) {
      console.error("[CONTENT SERVICE] Error fetching announcements:", error);
      throw error;
    }
  }

  /**
   * Get high priority announcement for banner
   * @param {string} targetRole - Filter by target role (required)
   * @returns {Promise} - Single high priority announcement
   */
  async getHighPriorityAnnouncement(targetRole) {
    try {
      if (!targetRole) {
        console.warn("[CONTENT SERVICE] targetRole is required for high priority announcement");
        return { success: false, data: null };
      }
      
      const response = await httpClient.get("/content/announcements/priority", {
        params: { targetRole }
      });
      return response.data;
    } catch (error) {
      console.error("[CONTENT SERVICE] Error fetching high priority announcement:", error);
      throw error;
    }
  }

  /**
   * Get health tips by category
   * @param {string} category - Category to filter by
   * @returns {Promise} - List of health tips in category
   */
  async getHealthTipsByCategory(category) {
    try {
      const response = await httpClient.get(`/content/health-tips/category/${category}`);
      return response.data;
    } catch (error) {
      console.error("[CONTENT SERVICE] Error fetching health tips by category:", error);
      throw error;
    }
  }
}

export default new ContentService();
