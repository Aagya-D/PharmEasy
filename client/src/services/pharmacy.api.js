import { api } from "./auth.api";

/**
 * Pharmacy API Service
 * Handles all pharmacy-related API calls
 */

/**
 * Submit pharmacy onboarding
 * @param {FormData} formData - Multipart form data with pharmacy details and document
 * @returns {Promise}
 */
export const submitPharmacyOnboarding = async (formData) => {
  const token = localStorage.getItem("accessToken");
  const response = await api.post("/pharmacy/onboard", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Get current user's pharmacy details
 * @returns {Promise}
 */
export const getMyPharmacy = async () => {
  const token = localStorage.getItem("accessToken");
  const response = await api.get("/pharmacy/my-pharmacy", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Get all pending pharmacies (Admin only)
 * @returns {Promise}
 */
export const getPendingPharmacies = async () => {
  const token = localStorage.getItem("accessToken");
  const response = await api.get("/admin/pharmacies/pending", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Get all pharmacies with optional filter (Admin only)
 * @param {string} status - Optional status filter (PENDING_VERIFICATION, VERIFIED, REJECTED)
 * @returns {Promise}
 */
export const getAllPharmacies = async (status = null) => {
  const token = localStorage.getItem("accessToken");
  const url = status ? `/admin/pharmacies?status=${status}` : "/admin/pharmacies";
  const response = await api.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Get specific pharmacy by ID (Admin only)
 * @param {string} pharmacyId
 * @returns {Promise}
 */
export const getPharmacyById = async (pharmacyId) => {
  const token = localStorage.getItem("accessToken");
  const response = await api.get(`/admin/pharmacy/${pharmacyId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Approve pharmacy (Admin only)
 * @param {string} pharmacyId
 * @returns {Promise}
 */
export const approvePharmacy = async (pharmacyId) => {
  const token = localStorage.getItem("accessToken");
  const response = await api.patch(
    `/admin/pharmacy/${pharmacyId}/approve`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Reject pharmacy (Admin only)
 * @param {string} pharmacyId
 * @param {string} reason - Rejection reason
 * @returns {Promise}
 */
export const rejectPharmacy = async (pharmacyId, reason) => {
  const token = localStorage.getItem("accessToken");
  const response = await api.patch(
    `/admin/pharmacy/${pharmacyId}/reject`,
    { reason },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export default {
  submitPharmacyOnboarding,
  getMyPharmacy,
  getPendingPharmacies,
  getAllPharmacies,
  getPharmacyById,
  approvePharmacy,
  rejectPharmacy,
};
