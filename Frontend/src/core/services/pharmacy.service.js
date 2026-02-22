import httpClient from "./httpClient";

/**
 * Pharmacy Service
 * Handles all pharmacy-related API calls
 */

/**
 * Create pharmacy onboarding
 * Backend: POST /api/pharmacy/onboard
 * Accepts FormData with file upload
 */
export const createPharmacy = async (pharmacyData) => {
  // When pharmacyData is FormData, we need to set proper headers
  const config = {};
  
  // Check if pharmacyData is FormData (file upload)
  if (pharmacyData instanceof FormData) {
    // Let browser set Content-Type with boundary for multipart/form-data
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }
  
  const response = await httpClient.post("/pharmacy/onboard", pharmacyData, config);
  return response.data;
};

/**
 * Submit pharmacy onboarding (alias)
 * Backend: POST /api/pharmacy/onboard
 * Accepts FormData with file upload
 */
export const submitPharmacyOnboarding = async (pharmacyData) => {
  // When pharmacyData is FormData, we need to set proper headers
  const config = {};
  
  // Check if pharmacyData is FormData (file upload)
  if (pharmacyData instanceof FormData) {
    // Let browser set Content-Type with boundary for multipart/form-data
    // Remove the default application/json header
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }
  
  const response = await httpClient.post("/pharmacy/onboard", pharmacyData, config);
  return response.data;
};

/**
 * Get pharmacy details (Admin endpoint)
 * Backend: GET /api/admin/pharmacy/:id
 */
export const getPharmacy = async (pharmacyId) => {
  const response = await httpClient.get(`/admin/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Get pharmacy by ID (alias for getPharmacy)
 * Backend: GET /api/admin/pharmacy/:id
 */
export const getPharmacyById = async (pharmacyId) => {
  const response = await httpClient.get(`/admin/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Get my pharmacy (current pharmacy user)
 * Backend: GET /api/pharmacy/my-pharmacy
 */
export const getMyPharmacy = async () => {
  const response = await httpClient.get("/pharmacy/my-pharmacy");
  return response.data;
};

/**
 * Get all pharmacies (Admin endpoint)
 * Backend: GET /api/admin/pharmacies
 */
export const getAllPharmacies = async (filters) => {
  const response = await httpClient.get("/admin/pharmacies", { params: filters });
  return response.data;
};

/**
 * Get pending pharmacies (Admin endpoint)
 * Backend: GET /api/admin/pharmacies/pending
 */
export const getPendingPharmacies = async () => {
  const response = await httpClient.get("/admin/pharmacies/pending");
  return response.data;
};

/**
 * Approve pharmacy (Admin endpoint)
 * Backend: PATCH /api/admin/pharmacy/:id/approve
 */
export const approvePharmacy = async (pharmacyId) => {
  const response = await httpClient.patch(`/admin/pharmacy/${pharmacyId}/approve`);
  return response.data;
};

/**
 * Reject pharmacy (Admin endpoint)
 * Backend: PATCH /api/admin/pharmacy/:id/reject
 */
export const rejectPharmacy = async (pharmacyId, reason) => {
  const response = await httpClient.patch(`/admin/pharmacy/${pharmacyId}/reject`, { reason });
  return response.data;
};

/**
 * Update pharmacy status (Admin endpoint)
 * Backend: PATCH /api/admin/pharmacy/:id/status
 */
export const updatePharmacy = async (pharmacyId, pharmacyData) => {
  const response = await httpClient.patch(`/admin/pharmacy/${pharmacyId}/status`, pharmacyData);
  return response.data;
};

/**
 * Delete pharmacy (Not implemented in backend)
 * TODO: Add backend endpoint if needed
 */
export const deletePharmacy = async (pharmacyId) => {
  const response = await httpClient.delete(`/admin/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Search pharmacies (Not implemented in backend)
 * TODO: Add backend endpoint if needed
 */
export const searchPharmacies = async (searchParams) => {
  const response = await httpClient.get("/admin/pharmacies", { params: searchParams });
  return response.data;
};

/**
 * Get dashboard statistics from backend
 * Backend: GET /api/pharmacy/dashboard-stats
 * Returns real-time computed stats for the logged-in pharmacy
 */
export const getDashboardStats = async () => {
  try {
    const response = await httpClient.get("/pharmacy/dashboard-stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw {
      success: false,
      error: {
        message: error.response?.data?.message || 
                 error.message || 
                 "Failed to fetch dashboard statistics"
      }
    };
  }
};

/**
 * Get pharmacy orders from backend
 * Backend: GET /api/pharmacy/orders
 * Returns orders for the logged-in pharmacy
 */
export const getPharmacyOrders = async (page = 1, limit = 50, status = 'all') => {
  try {
    const response = await httpClient.get("/pharmacy/orders", {
      params: { page, limit, status }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching pharmacy orders:", error);
    throw {
      success: false,
      error: {
        message: error.response?.data?.message || 
                 error.message || 
                 "Failed to fetch orders"
      }
    };
  }
};

/**
 * Get pharmacy by user ID (Not implemented in backend)
 * TODO: Add backend endpoint if needed
 */
export const getPharmacyByUserId = async (userId) => {
  const response = await httpClient.get(`/admin/pharmacy/user/${userId}`);
  return response.data;
};

// Default export for backward compatibility
const pharmacyService = {
  createPharmacy,
  submitPharmacyOnboarding,
  getPharmacy,
  getPharmacyById,
  getMyPharmacy,
  getAllPharmacies,
  getPendingPharmacies,
  approvePharmacy,
  rejectPharmacy,
  updatePharmacy,
  deletePharmacy,
  searchPharmacies,
  getPharmacyByUserId,
  getDashboardStats,
  getPharmacyOrders,
};

export default pharmacyService;
