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
   * Endpoint: GET /api/admin/pharmacy/:id (note: singular "pharmacy")
   */
  getPharmacyById: async (pharmacyId) => {
    const response = await httpClient.get(`/admin/pharmacy/${pharmacyId}`);
    return response.data;
  },

  /**
   * Verify pharmacy (Approve)
   * Endpoint: PATCH /api/admin/pharmacy/:id/verify
   */
  approvePharmacy: async (pharmacyId) => {
    const response = await httpClient.patch(`/admin/pharmacy/${pharmacyId}/verify`);
    return response.data;
  },

  /**
   * Reject pharmacy
   * Endpoint: PATCH /api/admin/pharmacy/:id/reject
   */
  rejectPharmacy: async (pharmacyId, reason) => {
    const response = await httpClient.patch(`/admin/pharmacy/${pharmacyId}/reject`, { reason });
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

  /**
   * Update admin profile
   * Endpoint: PATCH /api/admin/profile
   */
  updateProfile: async (profileData) => {
    const response = await httpClient.patch("/admin/profile", profileData);
    return response.data;
  },

  /**
   * Change admin password
   * Endpoint: PATCH /api/admin/change-password
   */
  changePassword: async (passwordData) => {
    const response = await httpClient.patch("/admin/change-password", passwordData);
    return response.data;
  },

  /**
   * Get activity logs
   * Endpoint: GET /api/admin/logs
   */
  getLogs: async (filters) => {
    const response = await httpClient.get("/admin/logs", { params: filters });
    return response.data;
  },
};

export default adminService;
