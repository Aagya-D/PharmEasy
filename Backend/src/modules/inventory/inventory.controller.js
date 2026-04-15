// Inventory controller for medicine CRUD and image upload workflows.

import inventoryService from "./inventory.service.js";
import logger from "../../utils/logger.js";
import notificationService from "../notifications/notification.service.js";
import { createAuditLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import prisma from "../../database/prisma.js";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import cloudinary from "../../config/cloudinary.js";

// Allowed medicine image MIME types.
const MEDICINE_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
// Maximum upload size for medicine images.
const MEDICINE_IMAGE_MAX_SIZE = 4 * 1024 * 1024;

// Multer uploader for memory-buffered medicine image uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDICINE_IMAGE_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!MEDICINE_IMAGE_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new Error("Invalid medicine image type. Allowed: JPG, PNG, WEBP"));
      return;
    }
    cb(null, true);
  },
});

// Export upload middleware used by inventory routes.
export const uploadMedicineImage = upload.single("image");

// Parse boolean-like values from string/number inputs.
const parseBoolean = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

// Convert in-memory file buffer into data URI for Cloudinary upload.
const toUploadDataUri = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

// Infer extension from image mime type.
const toFileExtension = (mimetype) => {
  if (mimetype === "image/png") return "png";
  if (mimetype === "image/webp") return "webp";
  return "jpg";
};

// Fallback uploader: save image file to local uploads directory.
const uploadToLocalStorage = async (req, file) => {
  const extension = toFileExtension(file.mimetype);
  const fileName = `medicine_${req.user?.pharmacyId || "unknown"}_${Date.now()}_${crypto.randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "uploads", "medicine-images");
  await fs.mkdir(uploadDir, { recursive: true });

  const absolutePath = path.join(uploadDir, fileName);
  await fs.writeFile(absolutePath, file.buffer);

  // Return public URL that maps to Express static uploads path.
  return `${req.protocol}://${req.get("host")}/uploads/medicine-images/${fileName}`;
};

// Resolve medicine image URL from Cloudinary or local fallback storage.
const resolveMedicineImageUrl = async (req) => {
  // Keep image URL unchanged when request has no file.
  if (!req.file) return undefined;

  // Prefer Cloudinary when credentials are available, then fall back to local storage.
  const hasCloudinaryCreds =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

  if (hasCloudinaryCreds) {
    try {
      const result = await cloudinary.uploader.upload(toUploadDataUri(req.file), {
        folder: "medicines/images",
        public_id: `medicine_${req.user?.pharmacyId || "unknown"}_${Date.now()}`,
        resource_type: "image",
        overwrite: true,
      });

      if (result?.secure_url) {
        return result.secure_url;
      }
    } catch (error) {
      // Upload failures should not block the medicine from being saved.
      logger.warn("INVENTORY", "Cloudinary upload failed, falling back to local storage", {
        error: error?.message,
      });
    }
  }

  return uploadToLocalStorage(req, req.file);
};

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
    // The image URL comes from either Cloudinary or the local fallback.
    const imageUrl = await resolveMedicineImageUrl(req);

    // Map and normalize incoming medicine payload.
    const medicineData = {
      name: req.body.name,
      genericName: req.body.genericName,
      category: req.body.category,
      quantity: parseInt(req.body.quantity),
      price: parseFloat(req.body.price),
      expiryDate: req.body.expiryDate,
      sideEffects: req.body.sideEffects,
      contraindications: req.body.contraindications,
      warnings: req.body.warnings,
      // Accept boolean field from both JSON boolean and multipart string.
      isPrescriptionRequired:
        req.body.isPrescriptionRequired === true || req.body.isPrescriptionRequired === "true",
      dosageInstructions: req.body.dosageInstructions,
      route: req.body.route,
      timing: req.body.timing,
      strength: req.body.strength,
      form: req.body.form,
      manufacturer: req.body.manufacturer,
      batchNumber: req.body.batchNumber,
      imageUrl,
    };

    logger.debug('INVENTORY', '[ADD] Medicine data received', { 
      name: medicineData.name, 
      genericName: medicineData.genericName 
    });

    // Persist medicine row for this pharmacy.
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

    // Send alerts after the response so the upload feels fast.
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
    // Parse pagination params with safe defaults.
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    logger.operation('INVENTORY', 'getMyInventory', 'START', { 
      pharmacyId, 
      page, 
      limit 
    });

    // Fetch paginated inventory list from service layer.
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
    // Resolve route params and authenticated pharmacy scope.
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation("INVENTORY", "getInventoryItem", "START", {
      inventoryId,
      pharmacyId,
    });

    // Load one inventory item and enforce ownership at service layer.
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
    // Resolve item ID and pharmacy scope for ownership checks.
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation('INVENTORY', 'updateInventoryItem', 'START', { 
      inventoryId, 
      pharmacyId 
    });

    // Save the current record so the audit log can show what changed.
    const beforeItem = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        name: true,
        genericName: true,
        category: true,
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
        imageUrl: true,
      },
    });

    // Resolve uploaded replacement image when present.
    const uploadedImageUrl = await resolveMedicineImageUrl(req);

    // Build partial update payload from request body.
    const updateData = {
      name: req.body.name,
      genericName: req.body.genericName,
      category: req.body.category,
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
      // Keep existing image unless file upload or removeImage flag is provided.
      imageUrl:
        uploadedImageUrl !== undefined
          ? uploadedImageUrl
          : parseBoolean(req.body.removeImage)
          ? null
          : undefined,
    };

    // Remove fields the client did not send.
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Apply inventory update through service with ownership validation.
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

    // Store the diff so admins can review the exact change later.
    const actorId = req.user.userId || req.user.id;
    // Build field-level delta text for audit log message.
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
        category: updatedItem.category,
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
        imageUrl: updatedItem.imageUrl,
      },
      metadata: { pharmacyId, changedFields },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });

    // Alerting runs after the response so it never blocks the update.
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
    // Resolve inventory target and authenticated pharmacy.
    const inventoryId = req.params.id;
    const pharmacyId = req.user.pharmacyId;

    logger.operation('INVENTORY', 'deleteInventoryItem', 'START', { 
      inventoryId, 
      pharmacyId 
    });

    // Delete item via service with pharmacy ownership check.
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
    console.error('[DELETE ERROR]', error.code, error.message);
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
