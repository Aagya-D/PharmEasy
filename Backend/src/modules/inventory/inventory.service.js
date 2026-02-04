/**
 * Inventory Service - Business logic for medicine inventory management
 * Handles CRUD operations for pharmacy inventory
 * 
 * Features:
 * - Add new medicines with duplicate checking
 * - View pharmacy inventory with pagination
 * - Update stock and pricing
 * - Delete inventory items
 * - Pharmacy ownership validation
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

/**
 * Add a new medicine to pharmacy inventory
 * Includes duplicate checking by name and genericName
 * 
 * @param {string} pharmacyId - ID of the pharmacy
 * @param {object} medicineData - Medicine details
 * @returns {Promise<object>} Created inventory item
 */
export const addMedicine = async (pharmacyId, medicineData) => {
  const { name, genericName, quantity, price, expiryDate } = medicineData;

  // Validate required fields
  if (!name || !genericName || quantity === undefined || !price || !expiryDate) {
    throw new AppError("Missing required fields: name, genericName, quantity, price, expiryDate", 400);
  }

  // Validate quantity
  if (typeof quantity !== "number" || quantity < 0) {
    throw new AppError("Quantity must be a non-negative number", 400);
  }

  // Validate price
  if (typeof price !== "number" || price <= 0) {
    throw new AppError("Price must be a positive number", 400);
  }

  // Validate expiry date
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) {
    throw new AppError("Invalid expiry date format", 400);
  }

  // Check if expiry date is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) {
    throw new AppError("Expiry date must be in the future", 400);
  }

  // Verify pharmacy exists
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  // Duplicate check: Check if medicine already exists in this pharmacy's inventory
  const existingMedicine = await prisma.inventory.findFirst({
    where: {
      pharmacyId,
      name: { equals: name.trim(), mode: "insensitive" },
      genericName: { equals: genericName.trim(), mode: "insensitive" },
    },
  });

  if (existingMedicine) {
    throw new AppError(
      `Medicine "${name}" (${genericName}) already exists in your inventory. Please update the existing entry instead.`,
      409
    );
  }

  // Create inventory item
  const inventoryItem = await prisma.inventory.create({
    data: {
      name: name.trim(),
      genericName: genericName.trim(),
      quantity,
      price,
      expiryDate: expiry,
      pharmacyId,
    },
    include: {
      pharmacy: {
        select: {
          pharmacyName: true,
          licenseNumber: true,
        },
      },
    },
  });

  return inventoryItem;
};

/**
 * Get pharmacy's inventory with pagination
 * 
 * @param {string} pharmacyId - ID of the pharmacy
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @returns {Promise<object>} Paginated inventory list
 */
export const getPharmacyInventory = async (pharmacyId, page = 1, limit = 20) => {
  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;

  // Verify pharmacy exists
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });

  if (!pharmacy) {
    throw new AppError("Pharmacy not found", 404);
  }

  // Get total count for pagination
  const totalItems = await prisma.inventory.count({
    where: { pharmacyId },
  });

  // Fetch inventory items
  const items = await prisma.inventory.findMany({
    where: { pharmacyId },
    orderBy: [
      { expiryDate: "asc" }, // Show items expiring soon first
      { name: "asc" },
    ],
    skip,
    take: limitNum,
  });

  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    items,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
};

/**
 * Update inventory item (price, quantity, etc.)
 * Validates pharmacy ownership before updating
 * 
 * @param {string} inventoryId - ID of the inventory item
 * @param {string} pharmacyId - ID of the pharmacy (for ownership validation)
 * @param {object} updateData - Fields to update
 * @returns {Promise<object>} Updated inventory item
 */
export const updateInventoryItem = async (inventoryId, pharmacyId, updateData) => {
  // Fetch the inventory item
  const inventoryItem = await prisma.inventory.findUnique({
    where: { id: inventoryId },
  });

  if (!inventoryItem) {
    throw new AppError("Inventory item not found", 404);
  }

  // Security check: Verify ownership
  if (inventoryItem.pharmacyId !== pharmacyId) {
    throw new AppError("You do not have permission to update this inventory item", 403);
  }

  // Build update object with only allowed fields
  const allowedFields = ["name", "genericName", "quantity", "price", "expiryDate"];
  const updates = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  }

  // Validate updates
  if (updates.quantity !== undefined) {
    if (typeof updates.quantity !== "number" || updates.quantity < 0) {
      throw new AppError("Quantity must be a non-negative number", 400);
    }
  }

  if (updates.price !== undefined) {
    if (typeof updates.price !== "number" || updates.price <= 0) {
      throw new AppError("Price must be a positive number", 400);
    }
  }

  if (updates.expiryDate !== undefined) {
    const expiry = new Date(updates.expiryDate);
    if (isNaN(expiry.getTime())) {
      throw new AppError("Invalid expiry date format", 400);
    }
    updates.expiryDate = expiry;
  }

  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
  }

  if (updates.genericName !== undefined) {
    updates.genericName = updates.genericName.trim();
  }

  // Check if no valid updates provided
  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  // Update the inventory item
  const updatedItem = await prisma.inventory.update({
    where: { id: inventoryId },
    data: updates,
    include: {
      pharmacy: {
        select: {
          pharmacyName: true,
        },
      },
    },
  });

  return updatedItem;
};

/**
 * Delete inventory item
 * Validates pharmacy ownership before deletion
 * 
 * @param {string} inventoryId - ID of the inventory item
 * @param {string} pharmacyId - ID of the pharmacy (for ownership validation)
 * @returns {Promise<object>} Deleted inventory item
 */
export const deleteInventoryItem = async (inventoryId, pharmacyId) => {
  // Fetch the inventory item
  const inventoryItem = await prisma.inventory.findUnique({
    where: { id: inventoryId },
  });

  if (!inventoryItem) {
    throw new AppError("Inventory item not found", 404);
  }

  // Security check: Verify ownership
  if (inventoryItem.pharmacyId !== pharmacyId) {
    throw new AppError("You do not have permission to delete this inventory item", 403);
  }

  // Delete the inventory item
  const deletedItem = await prisma.inventory.delete({
    where: { id: inventoryId },
  });

  return deletedItem;
};

export default {
  addMedicine,
  getPharmacyInventory,
  updateInventoryItem,
  deleteInventoryItem,
};
