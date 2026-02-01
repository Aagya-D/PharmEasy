/**
 * Admin Authorization Middleware
 * Identifies System Admin by roleId=1
 * NO database schema changes - uses existing User.roleId field
 */

import { prisma } from "../database/prisma.js";
import { AppError } from "./errorHandler.js";

/**
 * Require System Admin (roleId=1)
 * Blocks all users except those with roleId=1
 */
export const requireSystemAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Fetch user to check roleId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, isActive: true },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (!user.isActive) {
      return next(new AppError("Account is disabled", 403));
    }

    // System Admin must have roleId=1
    if (user.roleId !== 1) {
      return next(new AppError("Access denied. System Administrator access required.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  requireSystemAdmin,
};
