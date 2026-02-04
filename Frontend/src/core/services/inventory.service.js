import httpClient from "./httpClient";

/**
 * Inventory Service
 * Handles all pharmacy inventory management API calls
 */

/**
 * Add medicine to inventory
 * Backend: POST /api/inventory
 * @param {object} medicineData - { name, genericName, quantity, price, expiryDate }
 * @throws {Error} Throws error with detailed message
 */
export const addMedicine = async (medicineData) => {
  try {
    const response = await httpClient.post("/inventory", medicineData);
    
    if (!response.data) {
      throw new Error("Invalid response format from server");
    }
    
    return response.data;
  } catch (error) {
    let errorMessage = "Failed to add medicine";

    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    const err = new Error(errorMessage);
    err.statusCode = error.response?.status;
    throw err;
  }
};

/**
 * Get pharmacy's inventory with pagination
 * Backend: GET /api/inventory/my-stock
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @throws {Error} Throws error with detailed message
 */
export const getMyInventory = async (page = 1, limit = 20) => {
  try {
    const response = await httpClient.get("/inventory/my-stock", {
      params: { page, limit },
    });

    // Validate response structure
    if (!response.data || !response.data.data) {
      throw new Error("Invalid response format from server");
    }

    return response.data;
  } catch (error) {
    // Extract meaningful error message from various error formats
    let errorMessage = "Failed to load inventory";

    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Create a new error with clean message for frontend
    const err = new Error(errorMessage);
    err.statusCode = error.response?.status;
    err.originalError = error;
    throw err;
  }
};

/**
 * Update inventory item
 * Backend: PATCH /api/inventory/:id
 * @param {string} inventoryId - Inventory item ID
 * @param {object} updateData - Fields to update (quantity, price, name, genericName, expiryDate)
 * @throws {Error} Throws error with detailed message
 */
export const updateInventoryItem = async (inventoryId, updateData) => {
  try {
    const response = await httpClient.patch(`/inventory/${inventoryId}`, updateData);
    
    if (!response.data) {
      throw new Error("Invalid response format from server");
    }
    
    return response.data;
  } catch (error) {
    let errorMessage = "Failed to update item";

    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    const err = new Error(errorMessage);
    err.statusCode = error.response?.status;
    throw err;
  }
};

/**
 * Delete inventory item
 * Backend: DELETE /api/inventory/:id
 * @param {string} inventoryId - Inventory item ID
 * @throws {Error} Throws error with detailed message
 */
export const deleteInventoryItem = async (inventoryId) => {
  try {
    const response = await httpClient.delete(`/inventory/${inventoryId}`);
    
    if (!response.data) {
      throw new Error("Invalid response format from server");
    }
    
    return response.data;
  } catch (error) {
    let errorMessage = "Failed to delete item";

    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    const err = new Error(errorMessage);
    err.statusCode = error.response?.status;
    throw err;
  }
};

// Default export for backward compatibility
const inventoryService = {
  addMedicine,
  getMyInventory,
  updateInventoryItem,
  deleteInventoryItem,
};

export default inventoryService;
