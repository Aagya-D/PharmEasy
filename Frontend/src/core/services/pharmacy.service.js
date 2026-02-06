import httpClient from "./httpClient";

/**
 * Pharmacy Service
 * Handles all pharmacy-related API calls
 */

/**
 * Create pharmacy onboarding
 * Backend: POST /api/pharmacy/onboard
 */
export const createPharmacy = async (pharmacyData) => {
  const response = await httpClient.post("/pharmacy/onboard", pharmacyData);
  return response.data;
};

/**
 * Submit pharmacy onboarding (alias)
 * Backend: POST /api/pharmacy/onboard
 */
export const submitPharmacyOnboarding = async (pharmacyData) => {
  const response = await httpClient.post("/pharmacy/onboard", pharmacyData);
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
 * Get dashboard statistics
 * Fetches inventory data and calculates pharmacy dashboard metrics
 * Backend: GET /api/inventory/my-stock
 */
export const getDashboardStats = async () => {
  try {
    // Fetch inventory data
    const inventoryResponse = await httpClient.get("/inventory/my-stock", {
      params: { page: 1, limit: 1000 } // Get all items for accurate stats
    });

    const inventory = inventoryResponse.data?.data || [];
    
    // Calculate statistics
    const totalItems = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockItems = inventory.filter(item => item.quantity < 50).length;
    const totalMedicines = inventory.length;
    
    // Calculate average price
    const totalValue = inventory.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.price || 0));
    }, 0);
    
    // Get items expiring soon (within 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringItems = inventory.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry <= thirtyDaysLater && expiry > today;
    }).length;

    return {
      success: true,
      data: {
        stats: [
          {
            title: "Total Stock",
            value: totalItems.toLocaleString(),
            change: "+5%",
            trend: "up",
            icon: "Package",
            color: "bg-blue-500"
          },
          {
            title: "Low Stock Items",
            value: lowStockItems.toString(),
            change: "-3%",
            trend: "down",
            icon: "AlertTriangle",
            color: "bg-yellow-500"
          },
          {
            title: "Total Medicines",
            value: totalMedicines.toString(),
            change: "+2%",
            trend: "up",
            icon: "Pill",
            color: "bg-purple-500"
          },
          {
            title: "Expiring Soon",
            value: expiringItems.toString(),
            change: expiringItems > 0 ? "!" : "✓",
            trend: expiringItems > 0 ? "warning" : "up",
            icon: "Calendar",
            color: expiringItems > 0 ? "bg-red-500" : "bg-green-500"
          },
          {
            title: "Stock Value",
            value: `$${totalValue.toFixed(2)}`,
            change: "+8%",
            trend: "up",
            icon: "TrendingUp",
            color: "bg-green-500"
          }
        ],
        inventory: inventory.slice(0, 10) // Return top 10 for dashboard preview
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw {
      success: false,
      error: {
        message: error.response?.data?.error?.message || 
                 error.message || 
                 "Failed to fetch dashboard statistics"
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
};

export default pharmacyService;
