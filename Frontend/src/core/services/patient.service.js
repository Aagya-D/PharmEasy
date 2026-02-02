import httpClient from "./httpClient";

/**
 * Patient Service
 * Handles all patient-related API calls
 */
const patientService = {
  /**
   * Search medicines/pharmacies
   */
  searchMedicines: async (searchParams) => {
    const response = await httpClient.get("/patient/search", { params: searchParams });
    return response.data;
  },

  /**
   * Get nearby pharmacies
   */
  getNearbyPharmacies: async (location) => {
    const response = await httpClient.get("/patient/pharmacies/nearby", { params: location });
    return response.data;
  },

  /**
   * Create emergency request
   */
  createEmergencyRequest: async (requestData) => {
    const response = await httpClient.post("/patient/emergency", requestData);
    return response.data;
  },

  /**
   * Get user requests
   */
  getMyRequests: async () => {
    const response = await httpClient.get("/patient/requests");
    return response.data;
  },

  /**
   * Get notifications
   */
  getNotifications: async () => {
    const response = await httpClient.get("/patient/notifications");
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: async (notificationId) => {
    const response = await httpClient.put(`/patient/notifications/${notificationId}/read`);
    return response.data;
  },
};

export default patientService;
