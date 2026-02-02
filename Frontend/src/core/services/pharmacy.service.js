import httpClient from "./httpClient";

/**
 * Pharmacy Service
 * Handles all pharmacy-related API calls
 */
const pharmacyService = {
  /**
   * Create pharmacy onboarding
   */
  createPharmacy: async (pharmacyData) => {
    const response = await httpClient.post("/pharmacy/register", pharmacyData);
    return response.data;
  },

  /**
   * Get pharmacy details
   */
  getPharmacy: async (pharmacyId) => {
    const response = await httpClient.get(`/pharmacy/${pharmacyId}`);
    return response.data;
  },

  /**
   * Get all pharmacies
   */
  getAllPharmacies: async (filters) => {
    const response = await httpClient.get("/pharmacy", { params: filters });
    return response.data;
  },

  /**
   * Update pharmacy
   */
  updatePharmacy: async (pharmacyId, pharmacyData) => {
    const response = await httpClient.put(`/pharmacy/${pharmacyId}`, pharmacyData);
    return response.data;
  },

  /**
   * Delete pharmacy
   */
  deletePharmacy: async (pharmacyId) => {
    const response = await httpClient.delete(`/pharmacy/${pharmacyId}`);
    return response.data;
  },

  /**
   * Search pharmacies
   */
  searchPharmacies: async (searchParams) => {
    const response = await httpClient.get("/pharmacy/search", { params: searchParams });
    return response.data;
  },

  /**
   * Get pharmacy by user ID
   */
  getPharmacyByUserId: async (userId) => {
    const response = await httpClient.get(`/pharmacy/user/${userId}`);
    return response.data;
  },
};

export default pharmacyService;
