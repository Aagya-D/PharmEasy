import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import { prisma } from "../../database/prisma.js";

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const extension = file.mimetype?.split("/")?.[1] || "jpg";

    return {
      folder: "users/avatars",
      public_id: `avatar_${req.user?.userId || "unknown"}_${Date.now()}`,
      format: extension,
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
      ],
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Invalid avatar file type. Allowed: JPG, PNG, WEBP"), false);
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadAvatar = upload.single("avatar");

export const updateAvatar = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

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
