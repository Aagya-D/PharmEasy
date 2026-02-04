/**
 * Inventory Controller - HTTP request handlers for inventory operations
 * Handles medicine CRUD endpoints for pharmacy inventory management
 */

import inventoryService from "./inventory.service.js";
import logger from "../../utils/logger.js";

/**
 * POST /api/inventory
 * Add a new medicine to pharmacy inventory
 * Requires: Authentication, PHARMACY_ADMIN role, VERIFIED pharmacy status
 */
export const addMedicine = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const pharmacyId = req.user.pharmacyId;
    logger.operation('INVENTORY', 'addMedicine', 'START', { pharmacyId });

    const medicineData = {
      name: req.body.name,
      genericName: req.body.genericName,
      quantity: parseInt(req.body.quantity),
      price: parseFloat(req.body.price),
      expiryDate: req.body.expiryDate,
    };

    logger.debug('INVENTORY', '[ADD] Medicine data received', { 
      name: medicineData.name, 
      genericName: medicineData.genericName 
    });

    const inventoryItem = await inventoryService.addMedicine(
      pharmacyId,
      medicineData
    );

    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'addMedicine', duration, 'SUCCESS');
    logger.operation('INVENTORY', 'addMedicine', 'SUCCESS', { 
      inventoryId: inventoryItem.id, 
      pharmacyId 
    });

    res.status(201).json({
      success: true,
      message: "Medicine added to inventory successfully",
      data: inventoryItem,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'addMedicine', duration, 'ERROR');
    logger.operation('INVENTORY', 'addMedicine', 'ERROR', { error: error.message });
    next(error);
  }
};

/**
 * GET /api/inventory/my-stock
 * Get pharmacy's inventory with pagination
 * Requires: Authentication, PHARMACY_ADMIN role
 * Query params: page (default: 1), limit (default: 20)
 */
export const getMyInventory = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const pharmacyId = req.user.pharmacyId;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    logger.operation('INVENTORY', 'getMyInventory', 'START', { 
      pharmacyId, 
      page, 
      limit 
    });

    const result = await inventoryService.getPharmacyInventory(
      pharmacyId,
      page,
      limit
    );

    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'getMyInventory', duration, 'SUCCESS');
    logger.operation('INVENTORY', 'getMyInventory', 'SUCCESS', { 
      pharmacyId, 
      itemsCount: result.items.length 
    });

    res.status(200).json({
      success: true,
      message: "Inventory retrieved successfully",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'getMyInventory', duration, 'ERROR');
    logger.operation('INVENTORY', 'getMyInventory', 'ERROR', { error: error.message });
    next(error);
  }
};

/**
 * PATCH /api/inventory/:id
 * Update inventory item (price, quantity, etc.)
 * Requires: Authentication, PHARMACY_ADMIN role, ownership validation
 */
export const updateInventoryItem = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation('INVENTORY', 'updateInventoryItem', 'START', { 
      inventoryId, 
      pharmacyId 
    });

    const updateData = {
      name: req.body.name,
      genericName: req.body.genericName,
      quantity: req.body.quantity !== undefined ? parseInt(req.body.quantity) : undefined,
      price: req.body.price !== undefined ? parseFloat(req.body.price) : undefined,
      expiryDate: req.body.expiryDate,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const updatedItem = await inventoryService.updateInventoryItem(
      inventoryId,
      pharmacyId,
      updateData
    );

    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'updateInventoryItem', duration, 'SUCCESS');
    logger.operation('INVENTORY', 'updateInventoryItem', 'SUCCESS', { 
      inventoryId, 
      pharmacyId 
    });

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'updateInventoryItem', duration, 'ERROR');
    logger.operation('INVENTORY', 'updateInventoryItem', 'ERROR', { error: error.message });
    next(error);
  }
};

/**
 * DELETE /api/inventory/:id
 * Delete inventory item from pharmacy
 * Requires: Authentication, PHARMACY_ADMIN role, ownership validation
 */
export const deleteInventoryItem = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation('INVENTORY', 'deleteInventoryItem', 'START', { 
      inventoryId, 
      pharmacyId 
    });

    const deletedItem = await inventoryService.deleteInventoryItem(
      inventoryId,
      pharmacyId
    );

    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'deleteInventoryItem', duration, 'SUCCESS');
    logger.operation('INVENTORY', 'deleteInventoryItem', 'SUCCESS', { 
      inventoryId, 
      pharmacyId 
    });

    res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
      data: {
        id: deletedItem.id,
        name: deletedItem.name,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.timing('INVENTORY', 'deleteInventoryItem', duration, 'ERROR');
    logger.operation('INVENTORY', 'deleteInventoryItem', 'ERROR', { error: error.message });
    next(error);
  }
};

export default {
  addMedicine,
  getMyInventory,
  updateInventoryItem,
  deleteInventoryItem,
};
