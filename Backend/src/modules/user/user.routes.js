import express from "express";
import { authenticate } from "../../middlewares/auth.js";
import { updateAvatar, uploadAvatar, deleteAvatar } from "./user.controller.js";

const router = express.Router();

// Update authenticated user's avatar image.
router.patch("/avatar", authenticate(), (req, res, next) => {
  // Run multer uploader and convert upload errors into JSON responses.
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

// Delete authenticated user's avatar.
router.delete("/avatar", authenticate(), deleteAvatar);

export default router;
