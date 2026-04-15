import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { submitReview, getPharmacyReviews } from "./review.controller.js";

const router = Router();

// Submit a review (authenticated user).
router.post("/", authenticate(), submitReview);

// List reviews for one pharmacy.
router.get("/:pharmacyId", authenticate(), getPharmacyReviews);

export default router;
