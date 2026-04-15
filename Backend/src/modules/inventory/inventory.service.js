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

const ALLOWED_ROUTES = ["ORAL", "TOPICAL"];
const ALLOWED_TIMINGS = ["BEFORE_FOOD", "AFTER_FOOD"];

const sanitizeText = (value) => String(value || "").trim();

const normalizeCategory = (value) => {
  const cleaned = String(value || "").trim().toLowerCase();
  return cleaned.replace(/\s+/g, "_");
};

const sanitizeOptionalText = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  return cleaned || null;
};

const sanitizeImageUrl = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const cleaned = String(value).trim();
  return cleaned || null;
};

const normalizeMedicineData = (medicineData) => ({
  name: sanitizeText(medicineData.name),
  genericName: sanitizeText(medicineData.genericName),
  category: normalizeCategory(medicineData.category),
  quantity: Number(medicineData.quantity),
  price: Number(medicineData.price),
  expiryDate: medicineData.expiryDate,
  sideEffects: sanitizeText(medicineData.sideEffects),
  contraindications: sanitizeText(medicineData.contraindications),
  warnings: sanitizeText(medicineData.warnings),
  isPrescriptionRequired: medicineData.isPrescriptionRequired,
  dosageInstructions: sanitizeText(medicineData.dosageInstructions),
  route: medicineData.route || null,
  timing: medicineData.timing || null,
  strength: sanitizeOptionalText(medicineData.strength),
  form: sanitizeOptionalText(medicineData.form),
  manufacturer: sanitizeOptionalText(medicineData.manufacturer),
  batchNumber: sanitizeOptionalText(medicineData.batchNumber),
  imageUrl: sanitizeImageUrl(medicineData.imageUrl),
});

const validateMedicinePayload = (medicineData) => {
  if (!medicineData.name || !medicineData.genericName || !medicineData.category) {
    throw new AppError("Missing required fields: name, genericName, category", 400);
  }

  if (!Number.isFinite(medicineData.quantity) || medicineData.quantity < 0) {
    throw new AppError("Quantity must be a non-negative number", 400);
  }

  if (!Number.isFinite(medicineData.price) || medicineData.price <= 0) {
    throw new AppError("Price must be a positive number", 400);
  }

  if (!medicineData.sideEffects || !medicineData.contraindications || !medicineData.warnings) {
    throw new AppError(
      "Safety fields are required: sideEffects, contraindications, warnings",
      400
    );
  }

  if (typeof medicineData.isPrescriptionRequired !== "boolean") {
    throw new AppError("isPrescriptionRequired must be a boolean", 400);
  }

  if (!medicineData.dosageInstructions) {
    throw new AppError("dosageInstructions is required", 400);
  }

  if (medicineData.route !== null && !ALLOWED_ROUTES.includes(medicineData.route)) {
    throw new AppError("route must be ORAL or TOPICAL", 400);
  }

  if (medicineData.timing !== null && !ALLOWED_TIMINGS.includes(medicineData.timing)) {
    throw new AppError("timing must be BEFORE_FOOD or AFTER_FOOD", 400);
  }

  const expiry = new Date(medicineData.expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    throw new AppError("Invalid expiry date format", 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) {
    throw new AppError("Expiry date must be in the future", 400);
  }

  return {
    ...medicineData,
    expiryDate: expiry,
  };
};

/**
 * Add a new medicine to pharmacy inventory
 * Includes duplicate checking by name and genericName
 * 
 * @param {string} pharmacyId - ID of the pharmacy
 * @param {object} medicineData - Medicine details
 * @returns {Promise<object>} Created inventory item
 */
export const addMedicine = async (pharmacyId, medicineData) => {
  const preparedData = validateMedicinePayload(normalizeMedicineData(medicineData));

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
      name: { equals: preparedData.name, mode: "insensitive" },
      genericName: { equals: preparedData.genericName, mode: "insensitive" },
    },
  });

  if (existingMedicine) {
    throw new AppError(
      `Medicine "${preparedData.name}" (${preparedData.genericName}) already exists in your inventory. Please update the existing entry instead.`,
      409
    );
  }

  // Create inventory item
  const inventoryItem = await prisma.inventory.create({
    data: {
      name: preparedData.name,
      genericName: preparedData.genericName,
      category: preparedData.category,
      quantity: preparedData.quantity,
      price: preparedData.price,
      expiryDate: preparedData.expiryDate,
      sideEffects: preparedData.sideEffects,
      contraindications: preparedData.contraindications,
      warnings: preparedData.warnings,
      isPrescriptionRequired: preparedData.isPrescriptionRequired,
      dosageInstructions: preparedData.dosageInstructions,
      route: preparedData.route,
      timing: preparedData.timing,
      strength: preparedData.strength,
      form: preparedData.form,
      manufacturer: preparedData.manufacturer,
      batchNumber: preparedData.batchNumber,
      imageUrl: preparedData.imageUrl ?? null,
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

  const mergedData = {
    ...inventoryItem,
    ...updateData,
    expiryDate: updateData.expiryDate ?? inventoryItem.expiryDate,
  };

  const updates = validateMedicinePayload(normalizeMedicineData(mergedData));

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
 * Get single inventory item with ownership validation
 */
export const getInventoryItemById = async (inventoryId, pharmacyId) => {
  const item = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      pharmacy: {
        select: {
          id: true,
          pharmacyName: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError("Inventory item not found", 404);
  }

  if (item.pharmacyId !== pharmacyId) {
    throw new AppError("You do not have permission to view this inventory item", 403);
  }

  return item;
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

  const linkedOrderItems = await prisma.orderItem.count({
    where: { inventoryId },
  });

  if (linkedOrderItems > 0) {
    throw new AppError(
      "Cannot delete this medicine because it is linked to existing orders. Try marking it as out of stock instead.",
      400
    );
  }

  const sosLinkFilters = [{ medicineName: inventoryItem.name }];
  if (inventoryItem.genericName) {
    sosLinkFilters.push({ genericName: inventoryItem.genericName });
  }

  const linkedSosRequests = await prisma.sOSRequest.count({
    where: {
      OR: sosLinkFilters,
    },
  });

  if (linkedSosRequests > 0) {
    throw new AppError(
      "Cannot delete this medicine because it is linked to SOS requests. Try marking it as out of stock instead.",
      400
    );
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
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
};
