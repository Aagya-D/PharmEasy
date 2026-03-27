/**
 * Patient Routes
 * All patient-specific endpoints
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePatient } from "../../middlewares/roleCheck.js";
import { uploadPrescription } from "../../middlewares/upload.middleware.js";
import * as patientController from "./patient.controller.js";
import * as cartController from "../cart/cart.controller.js";
import { placeOrderFromCart, verifyKhaltiPayment } from "../order/order.controller.js";

const router = express.Router();

// All patient routes require authentication and PATIENT role
router.use(authenticate());
router.use(requirePatient);

/**
 * @route   GET /api/patient/dashboard
 * @desc    Get patient dashboard data
 * @access  Private (Patient only)
 */
router.get("/dashboard", patientController.getDashboard);

/**
 * @route   GET /api/patient/profile
 * @desc    Get patient profile
 * @access  Private (Patient only)
 */
router.get("/profile", patientController.getProfile);

/**
 * @route   PUT /api/patient/profile
 * @desc    Update patient profile
 * @access  Private (Patient only)
 */
router.put("/profile", patientController.updateProfile);

/**
 * @route   GET /api/patient/orders
 * @desc    Get patient orders
 * @access  Private (Patient only)
 */
router.get("/orders", patientController.getOrders);

/**
 * @route   GET /api/patient/cart
 * @desc    Get patient cart with grouped cart items
 * @access  Private (Patient only)
 */
router.get("/cart", cartController.getCart);

/**
 * @route   POST /api/patient/cart/items
 * @desc    Add or increment a medicine in cart
 * @access  Private (Patient only)
 */
router.post("/cart/items", cartController.addToCart);

/**
 * @route   PATCH /api/patient/cart/items/:itemId
 * @desc    Update cart item quantity/selection
 * @access  Private (Patient only)
 */
router.patch("/cart/items/:itemId", cartController.updateQuantity);

/**
 * @route   DELETE /api/patient/cart/items/:itemId
 * @desc    Remove cart item
 * @access  Private (Patient only)
 */
router.delete("/cart/items/:itemId", cartController.removeItem);

/**
 * @route   POST /api/patient/orders/checkout
 * @desc    Convert selected cart items into an order
 * @access  Private (Patient only)
 */
router.post("/orders/checkout", placeOrderFromCart);

/**
 * @route   POST /api/patient/orders/payment/khalti/verify
 * @desc    Verify Khalti payment status using lookup API
 * @access  Private (Patient only)
 */
router.post("/orders/payment/khalti/verify", verifyKhaltiPayment);

/**
 * @route   GET /api/patient/medications
 * @desc    Get patient's purchased medicines summary
 * @access  Private (Patient only)
 */
router.get("/medications", patientController.getMedications);

/**
 * @route   POST /api/patient/sos/request
 * @desc    Submit emergency SOS request
 * @access  Private (Patient only)
 * @note    Accepts optional prescription file upload
 */
router.post("/sos/request", uploadPrescription, patientController.submitSOSRequest);

/**
 * @route   GET /api/patient/sos/active
 * @desc    Get the current pending SOS for countdown timer
 * @access  Private (Patient only)
 */
router.get("/sos/active", patientController.getActiveSOS);

/**
 * @route   GET /api/patient/sos/history
 * @desc    Get SOS request history (supports ?filter=7days)
 * @access  Private (Patient only)
 */
router.get("/sos/history", patientController.getSOSHistory);

/**
 * @route   GET /api/patient/sos/:sosId
 * @desc    Get single SOS request details
 * @access  Private (Patient only)
 */
router.get("/sos/:sosId", patientController.getSOSDetails);

// ─── Favorite Medicines ──────────────────────────────

/**
 * @route   GET /api/patient/favorites
 * @desc    Get patient's favorite medicines
 * @access  Private (Patient only)
 */
router.get("/favorites", patientController.getFavorites);

/**
 * @route   POST /api/patient/favorites
 * @desc    Add medicine to favorites
 * @access  Private (Patient only)
 */
router.post("/favorites", patientController.addFavorite);

/**
 * @route   DELETE /api/patient/favorites/:id
 * @desc    Remove medicine from favorites
 * @access  Private (Patient only)
 */
router.delete("/favorites/:id", patientController.removeFavorite);

export default router;
