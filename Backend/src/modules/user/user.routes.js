import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { updateAvatar, uploadAvatar } from "./user.controller.js";

const router = express.Router();

router.patch("/avatar", authenticate(), (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Avatar upload failed",
      });
    }

    return next();
  });
}, updateAvatar);

export default router;
