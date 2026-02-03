/**
 * Role Constants
 * Defines available roles for user registration
 */

export const REGISTRATION_ROLES = [
  {
    id: 3,
    name: "PATIENT",
    displayName: "Patient",
    description: "Search and purchase medicines",
    icon: "👤",
  },
  {
    id: 2,
    name: "PHARMACY_ADMIN",
    displayName: "Pharmacy Admin",
    description: "Manage pharmacy inventory",
    icon: "💊",
  },
];

export const ROLE_IDS = {
  ADMIN: 1,
  PHARMACY: 2,
  PATIENT: 3,
};

export const ROLE_NAMES = {
  1: "ADMIN",
  2: "PHARMACY",
  3: "PATIENT",
};
