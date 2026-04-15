import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import { prisma } from "../../database/prisma.js";

// Cloudinary-backed storage for profile avatar uploads.
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Derive output extension from uploaded MIME type.
    const extension = file.mimetype?.split("/")?.[1] || "jpg";

    return {
      // Store avatars in dedicated folder with user-scoped public ID.
      folder: "users/avatars",
      public_id: `avatar_${req.user?.userId || "unknown"}_${Date.now()}`,
      format: extension,
      resource_type: "image",
      // Apply face-centered square crop for consistent avatar display.
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
      ],
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});

// File filter that allows only image MIME types.
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Invalid avatar file type. Allowed: JPG, PNG, WEBP"), false);
    return;
  }

  cb(null, true);
};

// Multer uploader for single avatar field.
const upload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadAvatar = upload.single("avatar");

// Update authenticated user's avatar URL.
export const updateAvatar = async (req, res, next) => {
  try {
    // Resolve authenticated user ID.
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Uploaded avatar file is required.
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

    // Persist avatar URL on user profile.
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: req.file.path },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        roleId: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};
