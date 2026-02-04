/**
 * Inventory Routes - API endpoints for pharmacy inventory management
 * 
 * All routes require:
 * - JWT authentication
 * - PHARMACY_ADMIN role (roleId=2)
 * - VERIFIED pharmacy status
 * 
 * Endpoints:
 * - POST   /api/inventory               - Add new medicine to inventory
 * - GET    /api/inventory/my-stock      - Get pharmacy's inventory (with pagination)
 * - PATCH  /api/inventory/:id           - Update inventory item
 * - DELETE /api/inventory/:id           - Delete inventory item
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requireVerifiedPharmacy } from "../../middlewares/roleCheck.js";
import inventoryController from "./inventory.controller.js";

const router = express.Router();

// ============================================
// INVENTORY MANAGEMENT ROUTES
// All routes require verified pharmacy
// ============================================

/**
 * POST /api/inventory
 * Add a new medicine to pharmacy inventory
 * 
 * Request Body:
 * {
 *   "name": "Cetamol 500mg",
 *   "genericName": "Paracetamol",
 *   "quantity": 100,
 *   "price": 5.99,
 *   "expiryDate": "2025-12-31"
 * }
 * 
 * Security:
 * - Duplicate check: Prevents adding same medicine twice
 * - Validates expiry date is in the future
 * - Validates quantity >= 0 and price > 0
 */
router.post(
  "/inventory",
  authenticate(),
  requireVerifiedPharmacy,
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
