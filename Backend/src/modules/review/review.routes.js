import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { submitReview, getPharmacyReviews } from "./review.controller.js";

const router = Router();

// POST /api/reviews  –  submit a review (patient only, auth required)
router.post("/", authenticate(), submitReview);

// GET /api/reviews/:pharmacyId  –  list reviews for a pharmacy (auth required)
router.get("/:pharmacyId", authenticate(), getPharmacyReviews);

export default router;
