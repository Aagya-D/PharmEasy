/**
 * Patient Controller
 * Handles all patient-specific operations
 */

import { prisma } from "../../database/prisma.js";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import notificationService from "../notifications/notification.service.js";
import { isValidNepaliPhone } from "../../utils/validation.js";

// ─── SOS Expiration Config ────────────────────────────
const SOS_TTL_MINUTES = 30;

/**
 * Automatically expire stale SOS requests.
 * Marks any "pending" SOS older than 30 minutes as "expired".
 * Called lazily on every SOS read to keep data fresh without a cron job.
 */
async function expireStaleSOSRequests() {
  const cutoff = new Date(Date.now() - SOS_TTL_MINUTES * 60 * 1000);
  try {
    const result = await prisma.sOSRequest.updateMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
      },
      data: { status: "expired" },
    });
    if (result.count > 0) {
      logger.info(`[SOS] Auto-expired ${result.count} stale SOS request(s)`);
    }
  } catch (err) {
    logger.error("[SOS] Failed to expire stale requests", { error: err.message });
  }
}

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
    logger.info(`[PATIENT] Dashboard loaded for patient ${patientId}`, {
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
  const startTime = Date.now();
  const patientId = req.user?.userId;
  const { name, phone } = req.body;

  // Validate user identity
  if (!patientId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  // Validate phone format if provided
  if (phone && !isValidNepaliPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
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
  const startTime = Date.now();
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
      whereClause.status = String(status).toUpperCase();
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      take: parseInt(limit) || 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            inventory: {
              select: {
                id: true,
                name: true,
                genericName: true,
              },
            },
          },
        },
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            address: true,
            contactNumber: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    logger.info("PATIENT", "Orders retrieved", {
      userId: patientId,
      count: orders.length,
      duration: `${Date.now() - startTime}ms`,
    });

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
  const startTime = Date.now();
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

    // Validate Nepal phone format
    if (!isValidNepaliPhone(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
      });
    }

    // GPS coordinates are mandatory for SOS requests
    const parsedLat = latitude ? parseFloat(latitude) : null;
    const parsedLng = longitude ? parseFloat(longitude) : null;
    if (!parsedLat || !parsedLng || parsedLat === 0 || parsedLng === 0 || isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        message: "Valid GPS coordinates are required for SOS requests."
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
      latitude: parsedLat,
      longitude: parsedLng,
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

    // Notify nearby pharmacies about the new SOS request
    try {
      logger.info(`[BROADCAST] SOS ${sosRequest.id} created — searching for nearby VERIFIED pharmacies within 50km`, {
        sosId: sosRequest.id,
        medicineName: sosRequest.medicineName,
        patientName: sosRequest.patientName,
        lat: sosRequest.latitude,
        lng: sosRequest.longitude,
      });

      const notifiedCount = await notificationService.notifyNearbyPharmacies(sosRequest);
      logger.info(`[BROADCAST] Notifying ${notifiedCount} pharmacies about new SOS`, {
        sosId: sosRequest.id,
        notifiedPharmacies: notifiedCount,
      });

      // Safety net: if notifyNearbyPharmacies created 0 records, create at least
      // one broadcast so the SOS is never silently lost
      if (notifiedCount === 0) {
        logger.warn(`[BROADCAST] Warning: 0 pharmacies notified via radius — falling back to all VERIFIED pharmacies`, {
          sosId: sosRequest.id,
        });
        const allPharmacies = await prisma.pharmacy.findMany({
          where: { verificationStatus: "VERIFIED" },
          select: { userId: true },
        });
        const allUserIds = allPharmacies.map((p) => p.userId);
        if (allUserIds.length > 0) {
          await notificationService.broadcastNotification(
            allUserIds,
            `🚨 NEW EMERGENCY SOS`,
            `${sosRequest.patientName} needs ${sosRequest.medicineName} nearby.`,
            "SOS_ALERT",
            {
              sosId: sosRequest.id,
              medicineName: sosRequest.medicineName,
              patientName: sosRequest.patientName,
              address: sosRequest.address,
              link: "/pharmacy/sos-requests",
            },
            "PHARMACY",
            "high"
          );
          logger.info(`[BROADCAST] Fallback broadcast sent to ${allUserIds.length} pharmacies`, {
            sosId: sosRequest.id,
            count: allUserIds.length,
          });
        }
      }

      // Real-time Socket.IO push — broadcasted to all connected pharmacy clients
      const io = req.app.get("io");
      if (io) {
        const alertPayload = {
          type: "NEW_SOS_ALERT",
          sosId: sosRequest.id,
          medicineName: sosRequest.medicineName,
          patientName: sosRequest.patientName,
          urgencyLevel: sosRequest.urgencyLevel,
          address: sosRequest.address,
          latitude: sosRequest.latitude,
          longitude: sosRequest.longitude,
          message: `🚨 URGENT: New SOS from ${sosRequest.patientName} for ${sosRequest.medicineName}.`,
          createdAt: sosRequest.createdAt,
        };
        // Emit to a pharmacy-wide channel so every connected pharmacy client gets it
        io.emit("NEW_SOS_ALERT", alertPayload);
        logger.info(`[BROADCAST] Socket.IO event NEW_SOS_ALERT emitted to all pharmacy clients`, { sosId: sosRequest.id });
      } else {
        logger.warn(`[BROADCAST] io not available — socket notification skipped`, { sosId: sosRequest.id });
      }
    } catch (notifErr) {
      console.error("[PATIENT] Failed to notify pharmacies:", notifErr.message);
      // Non-blocking — SOS is already created
    }

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
 * Get SOS history (with auto-expiration)
 */
export const getSOSHistory = async (req, res) => {
  const startTime = Date.now();
  const patientId = req.user?.userId;

  if (!patientId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    // Auto-expire stale SOS before reading
    await expireStaleSOSRequests();

    const { filter } = req.query; // "7days" or "all" (default: all)
    const where = { patientId };

    if (filter === "7days") {
      where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    const sosRequests = await prisma.sOSRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        pharmacyResponses: {
          where: { response: "accepted" },
          take: 1,
          select: {
            pharmacyId: true,
            note: true,
            respondedAt: true,
          },
        },
      },
    });

    // Enrich with pharmacy name for accepted requests
    const enriched = await Promise.all(
      sosRequests.map(async (sos) => {
        let pharmacyName = null;
        if (sos.acceptedBy) {
          const pharmacy = await prisma.pharmacy.findFirst({
            where: { userId: sos.acceptedBy },
            select: { pharmacyName: true },
          });
          pharmacyName = pharmacy?.pharmacyName || null;
        }
        return { ...sos, pharmacyName };
      })
    );

    logger.info("[PATIENT] SOS history retrieved", { userId: patientId, count: enriched.length });

    return res.status(200).json({
      success: true,
      data: { sosRequests: enriched },
      message: "SOS history retrieved successfully",
    });
  } catch (error) {
    console.error("[PATIENT] Get SOS history error:", error.message, error.stack);
    logger.error("[PATIENT] Get SOS history error", { error: error.message, userId: patientId });
    return res.status(500).json({
      success: false,
      message: "Failed to get SOS history",
      data: { sosRequests: [] },
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get single SOS request details (with auto-expiration)
 */
export const getSOSDetails = async (req, res) => {
  const startTime = Date.now();
  const patientId = req.user?.userId;
  const { sosId } = req.params;

  if (!patientId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    await expireStaleSOSRequests();

    const sosRequest = await prisma.sOSRequest.findFirst({
      where: { id: sosId, patientId },
      include: {
        pharmacyResponses: {
          select: {
            pharmacyId: true,
            response: true,
            note: true,
            respondedAt: true,
          },
        },
      },
    });

    if (!sosRequest) {
      return res.status(404).json({ success: false, message: "SOS request not found" });
    }

    // Enrich with pharmacy name
    let pharmacyName = null;
    if (sosRequest.acceptedBy) {
      const pharmacy = await prisma.pharmacy.findFirst({
        where: { id: sosRequest.acceptedBy },
        select: { pharmacyName: true },
      });
      pharmacyName = pharmacy?.pharmacyName || null;
    }

    return res.status(200).json({
      success: true,
      data: { sosRequest: { ...sosRequest, pharmacyName } },
    });
  } catch (error) {
    console.error("[PATIENT] Get SOS details error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get SOS details",
    });
  }
};

/**
 * Get active (pending) SOS for the current patient
 * Used by dashboard to show countdown timer
 */
export const getActiveSOS = async (req, res) => {
  const startTime = Date.now();
  const patientId = req.user?.userId;

  if (!patientId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    await expireStaleSOSRequests();

    const activeSOS = await prisma.sOSRequest.findFirst({
      where: { patientId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: { activeSOS: activeSOS || null, ttlMinutes: SOS_TTL_MINUTES },
    });
  } catch (error) {
    console.error("[PATIENT] Get active SOS error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to get active SOS" });
  }
};

// ─── Favorite Medicines ──────────────────────────────

/**
 * GET /api/patient/favorites
 * List patient's favorite medicines
 */
export const getFavorites = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const favorites = await prisma.favoriteMedicine.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: { favorites },
    });
  } catch (error) {
    console.error("[PATIENT] Get favorites error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to get favorites" });
  }
};

/**
 * POST /api/patient/favorites
 * Add a medicine to favorites
 * Body: { medicineName, genericName?, imageUrl?, lastPrice?, lastPharmacy? }
 */
export const addFavorite = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const { medicineName, genericName, imageUrl, lastPrice, lastPharmacy } = req.body;

  if (!medicineName) {
    return res.status(400).json({ success: false, message: "medicineName is required" });
  }

  try {
    // Upsert: if already favorited, update metadata
    const favorite = await prisma.favoriteMedicine.upsert({
      where: { userId_medicineName: { userId, medicineName } },
      update: {
        genericName: genericName || undefined,
        imageUrl: imageUrl || undefined,
        lastPrice: lastPrice ? parseFloat(lastPrice) : undefined,
        lastPharmacy: lastPharmacy || undefined,
      },
      create: {
        userId,
        medicineName,
        genericName: genericName || null,
        imageUrl: imageUrl || null,
        lastPrice: lastPrice ? parseFloat(lastPrice) : null,
        lastPharmacy: lastPharmacy || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: { favorite },
      message: "Medicine added to favorites",
    });
  } catch (error) {
    console.error("[PATIENT] Add favorite error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to add favorite" });
  }
};

/**
 * DELETE /api/patient/favorites/:id
 * Remove a medicine from favorites
 */
export const removeFavorite = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    await prisma.favoriteMedicine.deleteMany({
      where: { id, userId },
    });

    return res.status(200).json({
      success: true,
      message: "Medicine removed from favorites",
    });
  } catch (error) {
    console.error("[PATIENT] Remove favorite error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove favorite" });
  }
};

// ─── Cart Management ───────────────────────────────

const cartItemSelect = {
  id: true,
  medicineId: true,
  pharmacyId: true,
  medicineName: true,
  genericName: true,
  price: true,
  quantity: true,
  selected: true,
  inStock: true,
  expiryDate: true,
  pharmacyName: true,
  pharmacyAddress: true,
  pharmacyContact: true,
  createdAt: true,
  updatedAt: true,
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "desc" },
    select: cartItemSelect,
  },
};

const getOrCreateCart = async (userId) => {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
};

/**
 * GET /api/patient/cart
 * Returns persistent cart with items
 */
export const getCart = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    });

    return res.status(200).json({
      success: true,
      data: { cart },
      message: "Cart retrieved successfully",
    });
  } catch (error) {
    console.error("[PATIENT] Get cart error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to get cart" });
  }
};

/**
 * POST /api/patient/cart/items
 * Add a medicine to cart, incrementing quantity if item already exists
 */
export const addCartItem = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const {
    medicineId,
    pharmacyId,
    medicineName,
    genericName,
    price,
    quantity,
    inStock,
    expiryDate,
    pharmacyName,
    pharmacyAddress,
    pharmacyContact,
  } = req.body || {};

  if (!medicineId || !medicineName || price === undefined || price === null) {
    return res.status(400).json({
      success: false,
      message: "medicineId, medicineName and price are required",
    });
  }

  const safePrice = Number(price);
  if (!Number.isFinite(safePrice) || safePrice < 0) {
    return res.status(400).json({ success: false, message: "price must be a valid non-negative number" });
  }

  const safeQuantity = Math.max(1, Number.parseInt(quantity || 1, 10) || 1);
  const normalizedPharmacyId = String(pharmacyId || "unknown-pharmacy");

  try {
    const cart = await getOrCreateCart(userId);

    await prisma.cartItem.upsert({
      where: {
        cartId_medicineId_pharmacyId: {
          cartId: cart.id,
          medicineId: String(medicineId),
          pharmacyId: normalizedPharmacyId,
        },
      },
      update: {
        quantity: { increment: safeQuantity },
        selected: true,
        price: safePrice,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        genericName: genericName || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        pharmacyName: pharmacyName || null,
        pharmacyAddress: pharmacyAddress || null,
        pharmacyContact: pharmacyContact || null,
      },
      create: {
        cartId: cart.id,
        medicineId: String(medicineId),
        pharmacyId: normalizedPharmacyId,
        medicineName: String(medicineName),
        genericName: genericName || null,
        price: safePrice,
        quantity: safeQuantity,
        selected: true,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        pharmacyName: pharmacyName || null,
        pharmacyAddress: pharmacyAddress || null,
        pharmacyContact: pharmacyContact || null,
      },
    });

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return res.status(200).json({
      success: true,
      data: { cart: refreshed },
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("[PATIENT] Add cart item error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to add item to cart" });
  }
};

/**
 * PATCH /api/patient/cart/items/:itemId
 * Update quantity or selected state
 */
export const updateCartItem = async (req, res) => {
  const userId = req.user?.userId;
  const { itemId } = req.params;
  const { quantity, selected } = req.body || {};

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const cart = await getOrCreateCart(userId);

    const existing = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    const updateData = {};

    if (quantity !== undefined) {
      const safeQuantity = Number.parseInt(quantity, 10);
      if (!Number.isFinite(safeQuantity) || safeQuantity < 1) {
        return res.status(400).json({ success: false, message: "quantity must be at least 1" });
      }
      updateData.quantity = safeQuantity;
    }

    if (selected !== undefined) {
      updateData.selected = Boolean(selected);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return res.status(200).json({
      success: true,
      data: { cart: refreshed },
      message: "Cart item updated",
    });
  } catch (error) {
    console.error("[PATIENT] Update cart item error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update cart item" });
  }
};

/**
 * DELETE /api/patient/cart/items/:itemId
 * Remove item from cart
 */
export const removeCartItem = async (req, res) => {
  const userId = req.user?.userId;
  const { itemId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const cart = await getOrCreateCart(userId);

    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    const refreshed = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: cartInclude,
    });

    return res.status(200).json({
      success: true,
      data: { cart: refreshed },
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("[PATIENT] Remove cart item error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove cart item" });
  }
};
