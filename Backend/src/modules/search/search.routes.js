// Search routes for medicines and pharmacies.
// Authentication is optional to support anonymous search with optional analytics user context.

import express from "express";
import searchController from "./search.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = express.Router();

// Search endpoints with optional authentication.

// Universal search endpoint for medicines and pharmacies.
router.get(
  "/search/universal",
  authenticate({ optional: true }),
  searchController.getUniversalSearchResults
);

router.get(
  "/search/top-medicines",
  authenticate({ optional: true }),
  searchController.getTopMedicinesNearUser
);

router.get(
  "/search",
  authenticate({ optional: true }),
  searchController.searchMedicines
);

// Nearby pharmacy search endpoint.
router.get(
  "/search/nearby",
  authenticate({ optional: true }),
  searchController.findNearbyPharmacies
);

// Search statistics endpoint.
router.get(
  "/search/stats",
  authenticate({ optional: true }),
  searchController.getSearchStats
);

export default router;
