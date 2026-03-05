/**
 * Patient Routes
 * All patient-specific endpoints
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePatient } from "../../middlewares/roleCheck.js";
import { uploadPrescription } from "../../middlewares/upload.middleware.js";
import * as patientController from "./patient.controller.js";

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
 * @route   GET /api/patient/prescriptions
 * @desc    Get patient prescriptions
 * @access  Private (Patient only)
 */
router.get("/prescriptions", patientController.getPrescriptions);

/**
 * @route   GET /api/patient/medications
 * @desc    Get patient medications
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
