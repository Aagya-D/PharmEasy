import httpClient from "./httpClient";

/**
 * Admin Service
 * Handles all admin-related API calls
 */
const adminService = {
  /**
   * Get all users
   */
  getAllUsers: async (filters) => {
    const response = await httpClient.get("/admin/users", { params: filters });
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId) => {
    const response = await httpClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Update user
   */
  updateUser: async (userId, userData) => {
    const response = await httpClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (userId) => {
    const response = await httpClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Get all pharmacies (Admin)
   */
  getAllPharmacies: async (filters) => {
    const response = await httpClient.get("/admin/pharmacies", { params: filters });
    return response.data;
  },

  /**
   * Get pharmacy details (Admin)
   */
  getPharmacyById: async (pharmacyId) => {
    const response = await httpClient.get(`/admin/pharmacies/${pharmacyId}`);
    return response.data;
  },

  /**
   * Approve pharmacy
   */
  approvePharmacy: async (pharmacyId) => {
    const response = await httpClient.put(`/admin/pharmacies/${pharmacyId}/approve`);
    return response.data;
  },

  /**
   * Reject pharmacy
   */
  rejectPharmacy: async (pharmacyId, reason) => {
    const response = await httpClient.put(`/admin/pharmacies/${pharmacyId}/reject`, { reason });
    return response.data;
  },

  /**
   * Get audit logs
   */
  getLogs: async (filters) => {
    const response = await httpClient.get("/admin/logs", { params: filters });
    return response.data;
  },

  /**
   * Get dashboard stats
   */
  getDashboardStats: async () => {
    const response = await httpClient.get("/admin/dashboard/stats");
    return response.data;
  },
};

export default adminService;
