/**
 * Patient Controller
 * Handles all patient-specific operations
 */

import { prisma } from "../../database/prisma.js";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";

/**
 * Get patient dashboard data
 */
export const getDashboard = async (req, res) => {
  const startTime = Date.now();
  const patientId = req.user?.userId;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    // Get patient orders (recent 5)
    const orders = await prisma.order.findMany({
      where: { patientId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Get prescriptions count
    const prescriptionsCount = await prisma.prescription.count({
      where: { patientId }
    });

    // Get active medications count
    const medicationsCount = await prisma.medication.count({
      where: { 
        patientId,
        isActive: true 
      }
    });

    const responseTime = Date.now() - startTime;
    logger.success(`[PATIENT] Dashboard loaded for patient ${patientId}`, {
      userId: patientId,
      responseTime: `${responseTime}ms`,
    });

    return res.status(200).json({
      success: true,
      data: {
        orders: orders || [],
        stats: {
          totalOrders: orders.length,
          prescriptions: prescriptionsCount,
          medications: medicationsCount,
        }
      },
      message: "Dashboard data retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Dashboard error:', error.message, error.stack);
    logger.error("[PATIENT] Dashboard error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
      data: { orders: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get patient profile
 */
export const getProfile = async (req, res) => {
  const patientId = req.user?.userId;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: { patient },
      message: "Profile retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Get profile error:', error.message, error.stack);
    logger.error("[PATIENT] Get profile error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Update patient profile
 */
export const updateProfile = async (req, res) => {
  const patientId = req.user?.userId;
  const { name, phone } = req.body;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const updatedPatient = await prisma.user.update({
      where: { id: patientId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      }
    });

    // Log activity
    await createLog(
      patientId,
      LOG_ACTIONS.PATIENT_UPDATED,
      `Patient profile updated: ${updatedPatient.name}`,
      "PATIENT",
      { name, phone }
    );

    logger.info("[PATIENT] Profile updated", { userId: patientId });

    return res.status(200).json({
      success: true,
      data: { patient: updatedPatient },
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Update profile error:', error.message, error.stack);
    logger.error("[PATIENT] Update profile error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get patient orders
 */
export const getOrders = async (req, res) => {
  const patientId = req.user?.userId;
  const { limit = 10, status } = req.query;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const whereClause = { patientId };
    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      take: parseInt(limit) || 10,
      orderBy: { createdAt: 'desc' },
    });

    logger.info("[PATIENT] Orders retrieved", { userId: patientId, count: orders.length });

    return res.status(200).json({
      success: true,
      data: { orders: orders || [] },
      message: "Orders retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Get orders error:', error.message, error.stack);
    logger.error("[PATIENT] Get orders error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get orders",
      data: { orders: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get patient prescriptions
 */
export const getPrescriptions = async (req, res) => {
  const patientId = req.user?.userId;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    logger.info("[PATIENT] Prescriptions retrieved", { userId: patientId, count: prescriptions.length });

    return res.status(200).json({
      success: true,
      data: { prescriptions: prescriptions || [] },
      message: "Prescriptions retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Get prescriptions error:', error.message, error.stack);
    logger.error("[PATIENT] Get prescriptions error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get prescriptions",
      data: { prescriptions: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get patient medications
 */
export const getMedications = async (req, res) => {
  const patientId = req.user?.userId;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const medications = await prisma.medication.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    logger.info("[PATIENT] Medications retrieved", { userId: patientId, count: medications.length });

    return res.status(200).json({
      success: true,
      data: { medications: medications || [] },
      message: "Medications retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Get medications error:', error.message, error.stack);
    logger.error("[PATIENT] Get medications error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get medications",
      data: { medications: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Submit SOS request
 */
export const submitSOSRequest = async (req, res) => {
  const patientId = req.user?.userId;

  // Validate user identity first
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  // Check if req.body exists (multer should populate this)
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is empty. Please ensure you're sending form data correctly."
    });
  }

  const { 
    medicineName, 
    genericName, 
    quantity, 
    urgencyLevel, 
    patientName,
    contactNumber,
    address,
    latitude,
    longitude,
    additionalNotes,
    prescriptionRequired
  } = req.body;

  try {
    // Validate required fields
    if (!medicineName || !patientName || !contactNumber || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: medicineName, patientName, contactNumber, address"
      });
    }

    // Prepare SOS request data
    const sosData = {
      patientId,
      medicineName,
      genericName: genericName || null,
      quantity: parseInt(quantity) || 1,
      urgencyLevel: urgencyLevel || 'high',
      patientName,
      contactNumber,
      address,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      additionalNotes: additionalNotes || null,
      prescriptionRequired: prescriptionRequired === 'true' || prescriptionRequired === true,
      status: 'pending',
    };

    // Add prescription URL if file was uploaded
    if (req.file && req.file.path) {
      sosData.prescriptionUrl = req.file.path;
    }

    // Create SOS request
    const sosRequest = await prisma.sOSRequest.create({
      data: sosData
    });

    logger.info("[PATIENT] SOS request created", { 
      sosId: sosRequest.id, 
      userId: patientId,
      urgency: urgencyLevel,
      hasPrescription: !!req.file
    });

    return res.status(201).json({
      success: true,
      data: { sosRequest },
      message: "SOS request submitted successfully"
    });
  } catch (error) {
    console.error('[PATIENT] SOS request error:', error.message, error.stack);
    logger.error("[PATIENT] SOS request error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to submit SOS request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Get SOS history
 */
export const getSOSHistory = async (req, res) => {
  const patientId = req.user?.userId;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    const sosRequests = await prisma.sOSRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    logger.info("[PATIENT] SOS history retrieved", { userId: patientId, count: sosRequests.length });

    return res.status(200).json({
      success: true,
      data: { sosRequests: sosRequests || [] },
      message: "SOS history retrieved successfully"
    });
  } catch (error) {
    console.error('[PATIENT] Get SOS history error:', error.message, error.stack);
    logger.error("[PATIENT] Get SOS history error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get SOS history",
      data: { sosRequests: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};
