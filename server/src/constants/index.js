/**
 * API Constants and Fixed Role System
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

/**
 * FIXED ROLE ID SYSTEM (Immutable)
 *
 * All role IDs are hardcoded and never change:
 * - 1: System Admin (backend-only, never exposed to users)
 * - 2: Pharmacy Admin (selectable during registration)
 * - 3: Patient (selectable during registration)
 *
 * Import and use these constants throughout the backend:
 *
 * import { ROLE_IDS, VALID_REGISTRATION_ROLES } from './constants/index.js'
 *
 * if (roleId === ROLE_IDS.PATIENT) { ... }
 * if (VALID_REGISTRATION_ROLES.includes(roleId)) { ... }
 *
 * Why Fixed IDs:
 * 1. Deterministic: Never changes across environments or database resets
 * 2. Fast: Direct integer comparison, no name-based lookups
 * 3. Simple: Frontend sends ID, backend uses ID directly
 * 4. Secure: System Admin not exposed in registration UI
 * 5. Scalable: Works with any number of users
 *
 * Seeding:
 * - Roles are seeded once during database initialization
 * - Never created dynamically at runtime
 * - Migration handles schema, seed handles fixed data
 */
export const ROLE_IDS = {
  SYSTEM_ADMIN: 1,
  PHARMACY_ADMIN: 2,
  PATIENT: 3,
};

/**
 * Valid roles for user registration
 * Only 2 (Pharmacy Admin) and 3 (Patient) can be selected by users
 * System Admin (1) is assigned only by backend logic
 */
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
