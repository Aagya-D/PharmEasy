/**
 * Patient Routes
 * All patient-specific endpoints
 */

import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePatient } from "../../middlewares/roleCheck.js";
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
 */
router.post("/sos/request", patientController.submitSOSRequest);

/**
 * @route   GET /api/patient/sos/history
 * @desc    Get SOS request history
 * @access  Private (Patient only)
 */
router.get("/sos/history", patientController.getSOSHistory);

export default router;
