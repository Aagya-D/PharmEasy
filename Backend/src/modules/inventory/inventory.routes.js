/**
 * Inventory routes for pharmacy stock management.
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requireVerifiedPharmacy } from "../../middlewares/roleCheck.js";
import inventoryController, { uploadMedicineImage } from "./inventory.controller.js";

const router = express.Router();

// All inventory routes require a verified pharmacy.

router.post(
  "/inventory",
  authenticate(),
  requireVerifiedPharmacy,
  (req, res, next) => {
    uploadMedicineImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Medicine image upload failed",
        });
      }
      return next();
    });
  },
  inventoryController.addMedicine
);

/**
 * GET /api/inventory/my-stock
 * Get authenticated pharmacy's inventory with pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * 
 * Response includes:
 * - items: Array of inventory items
 * - pagination: { currentPage, totalPages, totalItems, itemsPerPage, hasNextPage, hasPreviousPage }
 * 
 * Items are ordered by:
 * 1. Expiry date (ascending) - items expiring soon appear first
 * 2. Name (alphabetically)
 */
router.get(
  "/inventory/my-stock",
  authenticate(),
  requireVerifiedPharmacy,
  inventoryController.getMyInventory
);

router.get(
  "/inventory/:id",
  authenticate(),
  requireVerifiedPharmacy,
  inventoryController.getInventoryItem
);

/**
 * PATCH /api/inventory/:id
 * Update inventory item (price, quantity, name, genericName, expiryDate)
 * 
 * Request Body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "genericName": "Updated Generic Name",
 *   "quantity": 50,
 *   "price": 6.99,
 *   "expiryDate": "2026-01-31"
 * }
 * 
 * Security:
 * - Validates pharmacy ownership before update
 * - Only allows updating specific fields (price, quantity, etc.)
 * - Validates data types and ranges
 */
router.patch(
  "/inventory/:id",
  authenticate(),
  requireVerifiedPharmacy,
  (req, res, next) => {
    uploadMedicineImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Medicine image upload failed",
        });
      }
      return next();
    });
  },
  inventoryController.updateInventoryItem
);

/**
 * DELETE /api/inventory/:id
 * Permanently delete inventory item from pharmacy
 * 
 * Security:
 * - Validates pharmacy ownership before deletion
 * - Permanently removes item from database
 */
router.delete(
  "/inventory/:id",
  authenticate(),
  requireVerifiedPharmacy,
  inventoryController.deleteInventoryItem
);

export default router;
