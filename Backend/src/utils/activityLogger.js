import prisma from "../database/prisma.js";

/**
 * Activity Logger Utility
 * 
 * Creates audit logs for critical system events
 * Usage: await createLog(userId, action, message, category, metadata)
 * 
 * Categories:
 * - AUTH: Login, logout, registration
 * - PHARMACY: Approvals, rejections, onboarding
 * - SYSTEM: Profile updates, password changes
 * - USER: User management actions
 * - INVENTORY: Stock updates
 * - ORDER: Order processing
 */

/**
 * Create a new activity log entry
 * @param {string|null} userId - ID of the user performing the action (null for system events)
 * @param {string} action - Action identifier (e.g., 'PHARMACY_APPROVED', 'USER_LOGIN')
 * @param {string} message - Human-readable description of the action
 * @param {string} category - Log category (AUTH, PHARMACY, SYSTEM, USER, INVENTORY, ORDER)
 * @param {object} metadata - Optional additional data to store with the log
 * @returns {Promise<object>} Created log entry
 */
export const createLog = async (userId, action, message, category, metadata = null) => {
  try {
    const log = await prisma.log.create({
      data: {
        userId,
        action,
        message,
        category,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    console.log(`[ACTIVITY LOG] ${category}:${action} - ${message}`);
    return log;
  } catch (error) {
    // Logging should never break the application flow
    console.error("Failed to create activity log:", error);
    return null;
  }
};

/**
 * Retrieve logs with pagination and filtering
 * @param {object} filters - Filter options
 * @param {string} filters.category - Filter by category
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action
 * @param {number} filters.skip - Pagination skip
 * @param {number} filters.take - Pagination take
 * @returns {Promise<object>} Logs and count
 */
export const getLogs = async (filters = {}) => {
  try {
    const {
      category,
      userId,
      action,
      skip = 0,
      take = 50,
    } = filters;

    const where = {};
    
    if (category) where.category = category;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, totalCount] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(take),
      }),
      prisma.log.count({ where }),
    ]);

    return {
      logs: logs || [],
      totalCount: totalCount || 0,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil((totalCount || 0) / take),
    };
  } catch (error) {
    console.error("Failed to retrieve logs:", error);
    // Return empty result instead of throwing
    return {
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: parseInt(filters.take) || 50,
      totalPages: 0,
    };
  }
};

/**
 * Common log actions for consistency
 */
export const LOG_ACTIONS = {
  // Auth
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  PASSWORD_RESET: "PASSWORD_RESET",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  
  // Pharmacy
  PHARMACY_ONBOARDED: "PHARMACY_ONBOARDED",
  PHARMACY_APPROVED: "PHARMACY_APPROVED",
  PHARMACY_REJECTED: "PHARMACY_REJECTED",
  
  // System
  PROFILE_UPDATED: "PROFILE_UPDATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  
  // User Management
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  
  // Inventory
  INVENTORY_ADDED: "INVENTORY_ADDED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  INVENTORY_DELETED: "INVENTORY_DELETED",
  
  // Orders
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
};

export default {
  createLog,
  getLogs,
  LOG_ACTIONS,
};
