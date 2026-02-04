import httpClient from "./httpClient";

/**
 * Inventory Service
 * Handles all pharmacy inventory management API calls
 */

/**
 * Add medicine to inventory
 * Backend: POST /api/inventory
 * @param {object} medicineData - { name, genericName, quantity, price, expiryDate }
 */
export const addMedicine = async (medicineData) => {
  const response = await httpClient.post("/inventory", medicineData);
  return response.data;
};

/**
 * Get pharmacy's inventory with pagination
 * Backend: GET /api/inventory/my-stock
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 */
export const getMyInventory = async (page = 1, limit = 20) => {
  const response = await httpClient.get("/inventory/my-stock", {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Update inventory item
 * Backend: PATCH /api/inventory/:id
 * @param {string} inventoryId - Inventory item ID
 * @param {object} updateData - Fields to update (quantity, price, name, genericName, expiryDate)
 */
export const updateInventoryItem = async (inventoryId, updateData) => {
  const response = await httpClient.patch(`/inventory/${inventoryId}`, updateData);
  return response.data;
};

/**
 * Delete inventory item
 * Backend: DELETE /api/inventory/:id
 * @param {string} inventoryId - Inventory item ID
 */
export const deleteInventoryItem = async (inventoryId) => {
  const response = await httpClient.delete(`/inventory/${inventoryId}`);
  return response.data;
};

// Default export for backward compatibility
const inventoryService = {
  addMedicine,
  getMyInventory,
  updateInventoryItem,
  deleteInventoryItem,
};

export default inventoryService;
