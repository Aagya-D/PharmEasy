import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePatient, requirePharmacyAdmin } from "../../middlewares/roleCheck.js";
import {
	placeOrderFromCart,
	updateOrderStatus,
	verifyKhaltiPaymentFromCallback,
} from "./order.controller.js";

const router = express.Router();

router.post("/payment/khalti/callback/verify", verifyKhaltiPaymentFromCallback);
router.post("/patient/checkout", authenticate(), requirePatient, placeOrderFromCart);
router.patch("/pharmacy/:orderId/status", authenticate(), requirePharmacyAdmin, updateOrderStatus);

export default router;
