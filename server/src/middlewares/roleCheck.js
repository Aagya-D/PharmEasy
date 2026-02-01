/**
 * Role-Based Access Control Middleware
 * Provides granular role and pharmacy status checking
 * 
 * Middleware functions:
 * - requireSystemAdmin: Only SYSTEM_ADMIN (roleId=1)
 * - requirePharmacyAdmin: Only PHARMACY_ADMIN (roleId=2)
 * - requirePatient: Only PATIENT (roleId=3)
 * - requireVerifiedPharmacy: PHARMACY_ADMIN with VERIFIED status
 * 
 * Usage:
 * router.post('/endpoint', authenticate(), requireVerifiedPharmacy, controller)
 */

import { prisma } from "../database/prisma.js";
import { AppError } from "./errorHandler.js";

/**
 * Require System Admin role (roleId=1)
 * Used for admin verification endpoints
 */
export const requireSystemAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.roleId !== 1) {
      return next(new AppError("Access denied. System Admin role required.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Pharmacy Admin role (roleId=2)
 * Does NOT check verification status - use for onboarding endpoint
 */
export const requirePharmacyAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.roleId !== 2) {
      return next(new AppError("Access denied. Pharmacy Admin role required.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Patient role (roleId=3)
 */
export const requirePatient = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.roleId !== 3) {
      return next(new AppError("Access denied. Patient role required.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require VERIFIED Pharmacy (roleId=2 + verificationStatus=VERIFIED)
 * Use this for protected pharmacy features:
 * - Inventory management (CRUD medicines)
 * - Responding to SOS requests
 * - Accessing pharmacy dashboard features
 * 
 * Blocks:
 * - Non-pharmacy users
 * - Pharmacies with PENDING_VERIFICATION status
 * - Pharmacies with REJECTED status
 */
export const requireVerifiedPharmacy = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Check user role and pharmacy status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        pharmacy: {
          select: {
            id: true,
            verificationStatus: true,
            pharmacyName: true,
          },
        },
      },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.roleId !== 2) {
      return next(new AppError("Access denied. Pharmacy Admin role required.", 403));
    }

    // Check if pharmacy exists
    if (!user.pharmacy) {
      return next(
        new AppError(
          "Pharmacy not registered. Please complete pharmacy onboarding first.",
          403
        )
      );
    }

    // Check if pharmacy is verified
    if (user.pharmacy.verificationStatus !== "VERIFIED") {
      const statusMessages = {
        PENDING_VERIFICATION: "Your pharmacy is pending admin verification. Please wait for approval.",
        REJECTED: "Your pharmacy registration was rejected. Please contact support.",
      };

      const message =
        statusMessages[user.pharmacy.verificationStatus] ||
        "Your pharmacy is not verified.";

      return next(new AppError(message, 403));
    }

    // Attach pharmacy info to request for controller use
    req.pharmacy = user.pharmacy;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check pharmacy status and attach to request
 * Does NOT block - just provides pharmacy info to controller
 * Useful for endpoints that need to know pharmacy status but allow access anyway
 */
export const attachPharmacyInfo = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        pharmacy: {
          select: {
            id: true,
            verificationStatus: true,
            pharmacyName: true,
            address: true,
            contactNumber: true,
          },
        },
      },
    });

    if (user && user.pharmacy) {
      req.pharmacy = user.pharmacy;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  requireSystemAdmin,
  requirePharmacyAdmin,
  requirePatient,
  requireVerifiedPharmacy,
  attachPharmacyInfo,
};
