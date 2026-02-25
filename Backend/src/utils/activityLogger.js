import prisma from "../database/prisma.js";

/**
 * ============================================================
 *  Enterprise Audit-Log Utility
 * ============================================================
 *
 * Two APIs coexist:
 *
 * 1. Legacy  – createLog / logActivity
 *    Kept for backward-compat with every call-site that already exists.
 *    Internally now delegates to createAuditLog so ALL writes gain the
 *    new columns (they'll just be null when callers don't supply them).
 *
 * 2. New     – createAuditLog
 *    Full-fidelity audit entry with: data-delta (oldValue/newValue),
 *    client metadata (IP + User-Agent), and resource targeting
 *    (resourceType + resourceId).
 *
 * RULE: Logging must NEVER crash the main request.
 *       Every public function wraps its body in try/catch.
 * ============================================================
 */

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Safely serialise any value to plain JSON (strips Prisma objects,
 * Dates, Buffers, etc.).  Returns null for falsy input.
 */
const safeJson = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

/**
 * Extract the real client IP from a request, respecting proxies.
 */
const extractIp = (req) => {
  if (!req) return null;
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    // "x-forwarded-for" can be a comma-separated list; take the first
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

/**
 * Extract the User-Agent string from a request.
 */
const extractUserAgent = (req) => {
  if (!req) return null;
  return req.headers?.["user-agent"] || null;
};

// ─── Core writer ─────────────────────────────────────────────

/**
 * Create a full-fidelity audit log entry.
 *
 * @param {Object}  opts
 * @param {string}  opts.actorId       – userId of whoever triggered the action (null = system)
 * @param {string}  opts.action        – action constant e.g. "PHARMACY_APPROVED"
 * @param {string}  opts.message       – human-readable description
 * @param {string}  opts.category      – LogCategory enum value
 * @param {string}  [opts.resourceType]– entity type  e.g. "Pharmacy"
 * @param {string}  [opts.resourceId]  – entity primary key
 * @param {Object}  [opts.oldValue]    – snapshot BEFORE mutation
 * @param {Object}  [opts.newValue]    – snapshot AFTER mutation
 * @param {Object}  [opts.metadata]    – any extra context
 * @param {import('express').Request} [opts.req] – Express request (extracts IP + UA)
 * @returns {Promise<Object|null>}     – the created Log row, or null on failure
 */
export const createAuditLog = async ({
  actorId = null,
  action,
  message,
  category,
  resourceType = null,
  resourceId = null,
  oldValue = null,
  newValue = null,
  metadata = null,
  req = null,
} = {}) => {
  try {
    const log = await prisma.log.create({
      data: {
        userId: actorId,
        action,
        message,
        category,
        resourceType,
        resourceId,
        oldValue: safeJson(oldValue),
        newValue: safeJson(newValue),
        metadata: safeJson(metadata),
        ipAddress: extractIp(req),
        userAgent: extractUserAgent(req),
      },
    });

    console.log(
      `[AUDIT] ${category}:${action} | actor=${actorId || "SYSTEM"} ` +
      `| resource=${resourceType || "-"}/${resourceId || "-"} ` +
      `| delta=${oldValue ? "yes" : "no"}`
    );
    return log;
  } catch (error) {
    // NEVER let logging break the app
    console.error("[AUDIT] Failed to write audit log:", error.message);
    return null;
  }
};

// ─── Legacy API (backward-compatible) ────────────────────────

/**
 * Create a new activity log entry (legacy signature).
 * Delegates to createAuditLog internally.
 */
export const createLog = async (userId, action, message, category, metadata = null) => {
  return createAuditLog({
    actorId: userId,
    action,
    message,
    category,
    metadata,
  });
};

/**
 * Create activity log using object parameters (legacy signature).
 */
export const logActivity = async ({ userId, action, message, category, metadata = null }) => {
  return createAuditLog({
    actorId: userId,
    action,
    message,
    category,
    metadata,
  });
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
  
  // Content Management
  CONTENT_CREATED: "CONTENT_CREATED",
  CONTENT_UPDATED: "CONTENT_UPDATED",
  CONTENT_DELETED: "CONTENT_DELETED",
};

export default {
  createAuditLog,
  createLog,
  logActivity,
  getLogs,
  LOG_ACTIONS,
};
