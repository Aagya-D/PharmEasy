import prisma from "../database/prisma.js";

/**
 * Audit log helpers used across the app.
 */

// Convert Prisma and request values into plain JSON before saving them.
const safeJson = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

// Read the client IP, including the forwarded address when present.
const extractIp = (req) => {
  if (!req) return null;
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can list multiple addresses; use the first one.
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

// Read the User-Agent header when it exists.
const extractUserAgent = (req) => {
  if (!req) return null;
  return req.headers?.["user-agent"] || null;
};

// Create a full audit entry with before and after values.
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
    // Logging should never block the request path.
    console.error("[AUDIT] Failed to write audit log:", error.message);
    return null;
  }
};

// Keep the older logging signature working for existing call sites.
export const createLog = async (userId, action, message, category, metadata = null) => {
  return createAuditLog({
    actorId: userId,
    action,
    message,
    category,
    metadata,
  });
};

// Keep the object-based legacy API working too.
export const logActivity = async ({ userId, action, message, category, metadata = null }) => {
  return createAuditLog({
    actorId: userId,
    action,
    message,
    category,
    metadata,
  });
};

// Return logs with optional filters and pagination.
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
    // Return an empty result instead of breaking the request.
    return {
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: parseInt(filters.take) || 50,
      totalPages: 0,
    };
  }
};

// Shared action names used by the audit trail.
export const LOG_ACTIONS = {
  // Auth events
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  PASSWORD_RESET: "PASSWORD_RESET",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  
  // Pharmacy events
  PHARMACY_ONBOARDED: "PHARMACY_ONBOARDED",
  PHARMACY_APPROVED: "PHARMACY_APPROVED",
  PHARMACY_REJECTED: "PHARMACY_REJECTED",
  
  // System events
  PROFILE_UPDATED: "PROFILE_UPDATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  
  // User management events
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  
  // Inventory events
  INVENTORY_ADDED: "INVENTORY_ADDED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  INVENTORY_DELETED: "INVENTORY_DELETED",
  
  // Order events
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  
  // Content management events
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
