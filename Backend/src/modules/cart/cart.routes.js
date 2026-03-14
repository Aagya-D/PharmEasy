import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { requirePatient } from "../../middlewares/roleCheck.js";
import {
  addToCart,
  getCart,
  removeItem,
  updateQuantity,
} from "./cart.controller.js";

const router = express.Router();

router.use(authenticate());
router.use(requirePatient);

router.get("/", getCart);
router.post("/items", addToCart);
router.patch("/items/:itemId", updateQuantity);
router.delete("/items/:itemId", removeItem);

export default router;
