// System-admin authorization middleware based on user.roleId.

import { prisma } from "../database/prisma.js";
import { AppError } from "./errorHandler.js";

// Require roleId=1 system admin access.
export const requireSystemAdmin = async (req, res, next) => {
  try {
    // Read authenticated user ID from prior auth middleware.
    const userId = req.user?.userId;
    
    if (!userId) {
      return next(new AppError("Authentication required", 401));
    }

    // Load role and active state from database.
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

    // Permit only system admin users.
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
