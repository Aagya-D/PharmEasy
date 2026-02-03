import httpClient from "./httpClient";

/**
 * Pharmacy Service
 * Handles all pharmacy-related API calls
 */

/**
 * Create pharmacy onboarding
 */
export const createPharmacy = async (pharmacyData) => {
  const response = await httpClient.post("/pharmacy/register", pharmacyData);
  return response.data;
};

/**
 * Submit pharmacy onboarding (alias)
 */
export const submitPharmacyOnboarding = async (pharmacyData) => {
  const response = await httpClient.post("/pharmacy/register", pharmacyData);
  return response.data;
};

/**
 * Get pharmacy details
 */
export const getPharmacy = async (pharmacyId) => {
  const response = await httpClient.get(`/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Get pharmacy by ID (alias)
 */
export const getPharmacyById = async (pharmacyId) => {
  const response = await httpClient.get(`/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Get my pharmacy (current user)
 */
export const getMyPharmacy = async () => {
  const response = await httpClient.get("/pharmacy/my-pharmacy");
  return response.data;
};

/**
 * Get all pharmacies
 */
export const getAllPharmacies = async (filters) => {
  const response = await httpClient.get("/pharmacy", { params: filters });
  return response.data;
};

/**
 * Get pending pharmacies
 */
export const getPendingPharmacies = async () => {
  const response = await httpClient.get("/pharmacy", { 
    params: { status: "PENDING_VERIFICATION" } 
  });
  return response.data;
};

/**
 * Approve pharmacy
 */
export const approvePharmacy = async (pharmacyId) => {
  const response = await httpClient.post(`/pharmacy/${pharmacyId}/approve`);
  return response.data;
};

/**
 * Reject pharmacy
 */
export const rejectPharmacy = async (pharmacyId, reason) => {
  const response = await httpClient.post(`/pharmacy/${pharmacyId}/reject`, { reason });
  return response.data;
};

/**
 * Update pharmacy
 */
export const updatePharmacy = async (pharmacyId, pharmacyData) => {
  const response = await httpClient.put(`/pharmacy/${pharmacyId}`, pharmacyData);
  return response.data;
};

/**
 * Delete pharmacy
 */
export const deletePharmacy = async (pharmacyId) => {
  const response = await httpClient.delete(`/pharmacy/${pharmacyId}`);
  return response.data;
};

/**
 * Search pharmacies
 */
export const searchPharmacies = async (searchParams) => {
  const response = await httpClient.get("/pharmacy/search", { params: searchParams });
  return response.data;
};

/**
 * Get pharmacy by user ID
 */
export const getPharmacyByUserId = async (userId) => {
  const response = await httpClient.get(`/pharmacy/user/${userId}`);
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
};

export default pharmacyService;
