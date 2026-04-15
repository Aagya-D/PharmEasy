/**
 * Shared backend constants.
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Role IDs are fixed so the frontend and backend use the same values.
export const ROLE_IDS = {
  SYSTEM_ADMIN: 1,
  PHARMACY_ADMIN: 2,
  PATIENT: 3,
};

// Only pharmacy admins and patients can register themselves.
export const VALID_REGISTRATION_ROLES = [
  ROLE_IDS.PHARMACY_ADMIN,
  ROLE_IDS.PATIENT,
];

export const USER_ROLES = {
  ADMIN: "ADMIN",
  PHARMACY_OWNER: "PHARMACY_OWNER",
  PATIENT: "PATIENT",
};

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
};

export const SOS_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  RESOLVED: "RESOLVED",
  EXPIRED: "EXPIRED",
};

export const MESSAGES = {
  SUCCESS: "Operation successful",
  ERROR: "An error occurred",
  NOT_FOUND: "Resource not found",
  INVALID_INPUT: "Invalid input provided",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
};
