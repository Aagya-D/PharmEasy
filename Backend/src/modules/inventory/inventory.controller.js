/**
 * Inventory Controller - HTTP request handlers for inventory operations
 * Handles medicine CRUD endpoints for pharmacy inventory management
 */

import inventoryService from "./inventory.service.js";
import logger from "../../utils/logger.js";
import notificationService from "../notifications/notification.service.js";
import { createAuditLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import prisma from "../../database/prisma.js";

/**
 * POST /api/inventory
 * Add a new medicine to pharmacy inventory
 * Requires: Authentication, PHARMACY_ADMIN role, VERIFIED pharmacy status
 */
export const addMedicine = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const pharmacyId = req.user.pharmacyId;
    logger.operation('INVENTORY', 'addMedicine', 'START', { pharmacyId });

    const medicineData = {
      name: req.body.name,
      genericName: req.body.genericName,
      quantity: parseInt(req.body.quantity),
      price: parseFloat(req.body.price),
      expiryDate: req.body.expiryDate,
      sideEffects: req.body.sideEffects,
      contraindications: req.body.contraindications,
      warnings: req.body.warnings,
      isPrescriptionRequired:
        req.body.isPrescriptionRequired === true || req.body.isPrescriptionRequired === "true",
      dosageInstructions: req.body.dosageInstructions,
      route: req.body.route,
      timing: req.body.timing,
      strength: req.body.strength,
      form: req.body.form,
      manufacturer: req.body.manufacturer,
      batchNumber: req.body.batchNumber,
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

    // Fire-and-forget: check for low stock & expiry alerts
    const ownerId = req.user.userId || req.user.id;
    try {
      if (inventoryItem.quantity > 0 && inventoryItem.quantity < 20) {
        await notificationService.notifyLowStock(ownerId, inventoryItem);
      }
      await notificationService.notifyExpiringSoon(ownerId, inventoryItem);
    } catch (e) {
      console.error('[INVENTORY] Notification trigger error:', e.message);
    }
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

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
 * GET /api/inventory/:id
 * Get full medicine record by inventory ID
 * Requires: Authentication, PHARMACY_ADMIN role, ownership validation
 */
export const getInventoryItem = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation("INVENTORY", "getInventoryItem", "START", {
      inventoryId,
      pharmacyId,
    });

    const item = await inventoryService.getInventoryItemById(inventoryId, pharmacyId);

    const duration = Date.now() - startTime;
    logger.timing("INVENTORY", "getInventoryItem", duration, "SUCCESS");

    res.status(200).json({
      success: true,
      message: "Inventory item retrieved successfully",
      data: item,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.timing("INVENTORY", "getInventoryItem", duration, "ERROR");
    next(error);
  }
};

/**
 * PATCH /api/inventory/:id
 * Update inventory item (price, quantity, etc.)
 * Requires: Authentication, PHARMACY_ADMIN role, ownership validation
 */
export const updateInventoryItem = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation('INVENTORY', 'updateInventoryItem', 'START', { 
      inventoryId, 
      pharmacyId 
    });

    // ── Capture BEFORE state for audit delta ──
    const beforeItem = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        name: true,
        genericName: true,
        quantity: true,
        price: true,
        expiryDate: true,
        sideEffects: true,
        contraindications: true,
        warnings: true,
        isPrescriptionRequired: true,
        dosageInstructions: true,
        route: true,
        timing: true,
        strength: true,
        form: true,
        manufacturer: true,
        batchNumber: true,
      },
    });

    const updateData = {
      name: req.body.name,
      genericName: req.body.genericName,
      quantity: req.body.quantity !== undefined ? parseInt(req.body.quantity) : undefined,
      price: req.body.price !== undefined ? parseFloat(req.body.price) : undefined,
      expiryDate: req.body.expiryDate,
      sideEffects: req.body.sideEffects,
      contraindications: req.body.contraindications,
      warnings: req.body.warnings,
      isPrescriptionRequired:
        req.body.isPrescriptionRequired !== undefined
          ? req.body.isPrescriptionRequired === true || req.body.isPrescriptionRequired === "true"
          : undefined,
      dosageInstructions: req.body.dosageInstructions,
      route: req.body.route,
      timing: req.body.timing,
      strength: req.body.strength,
      form: req.body.form,
      manufacturer: req.body.manufacturer,
      batchNumber: req.body.batchNumber,
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

    // ── Audit: full delta + client metadata ──
    const actorId = req.user.userId || req.user.id;
    const changedFields = Object.keys(updateData);
    const deltaDesc = changedFields.map(f => {
      const oldVal = beforeItem?.[f];
      const newVal = updatedItem[f] ?? updateData[f];
      return `${f}: ${oldVal} → ${newVal}`;
    }).join(", ");

    await createAuditLog({
      actorId,
      action: LOG_ACTIONS.INVENTORY_UPDATED,
      message: `Inventory "${updatedItem.name}" updated (${deltaDesc})`,
      category: "INVENTORY",
      resourceType: "Inventory",
      resourceId: inventoryId,
      oldValue: beforeItem,
      newValue: {
        id: updatedItem.id,
        name: updatedItem.name,
        genericName: updatedItem.genericName,
        quantity: updatedItem.quantity,
        price: updatedItem.price,
        expiryDate: updatedItem.expiryDate,
        sideEffects: updatedItem.sideEffects,
        contraindications: updatedItem.contraindications,
        warnings: updatedItem.warnings,
        isPrescriptionRequired: updatedItem.isPrescriptionRequired,
        dosageInstructions: updatedItem.dosageInstructions,
        route: updatedItem.route,
        timing: updatedItem.timing,
        strength: updatedItem.strength,
        form: updatedItem.form,
        manufacturer: updatedItem.manufacturer,
        batchNumber: updatedItem.batchNumber,
      },
      metadata: { pharmacyId, changedFields },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });

    // Fire-and-forget: check for low stock & expiry alerts
    const ownerId = req.user.userId || req.user.id;
    try {
      if (updatedItem.quantity > 0 && updatedItem.quantity < 20) {
        await notificationService.notifyLowStock(ownerId, updatedItem);
      }
      await notificationService.notifyExpiringSoon(ownerId, updatedItem);
    } catch (e) {
      console.error('[INVENTORY] Notification trigger error:', e.message);
    }
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
  const startTime = Date.now();
  try {
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
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
