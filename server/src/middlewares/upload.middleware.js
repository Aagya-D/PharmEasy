/**
 * File Upload Middleware - Cloudinary Integration
 * Handles pharmacy license document uploads to Cloudinary
 * 
 * Features:
 * - Validates file type (PDF, JPG, PNG)
 * - Enforces 5MB file size limit
 * - Uploads to dedicated Cloudinary folder: pharmacies/licenses
 * - Returns secure Cloudinary URL
 * 
 * Usage:
 * - Import: uploadLicenseDocument middleware
 * - Apply to pharmacy onboarding route
 * - Access uploaded file: req.file.path (Cloudinary URL)
 */

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import { AppError } from "./errorHandler.js";

// Allowed file types for pharmacy license documents
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Cloudinary Storage Configuration
 * Stores files in: pharmacies/licenses/
 * Filename format: license_[userId]_[timestamp]
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(
        `Invalid file type. Allowed types: PDF, JPG, PNG`,
        400
      );
    }

    // Determine file format
    let format = "pdf";
    if (file.mimetype.includes("jpeg") || file.mimetype.includes("jpg")) {
      format = "jpg";
    } else if (file.mimetype.includes("png")) {
      format = "png";
    }

    return {
      folder: "pharmacies/licenses", // Cloudinary folder
      format: format,
      public_id: `license_${req.user?.userId || "unknown"}_${Date.now()}`,
      resource_type: "auto", // Automatically detect resource type
      allowed_formats: ["pdf", "jpg", "jpeg", "png"],
    };
  },
});

/**
 * File Filter - Validates file type before upload
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Only PDF, JPG, and PNG files are allowed.`,
        400
      ),
      false
    );
  }
};

/**
 * Multer Configuration
 * Handles multipart/form-data with Cloudinary storage
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5MB limit
  },
});

/**
 * Middleware: Upload single pharmacy license document
 * Field name: "licenseDocument"
 * 
 * After successful upload:
 * - req.file.path contains Cloudinary URL
 * - req.file.filename contains public_id
 */
export const uploadLicenseDocument = upload.single("licenseDocument");

/**
 * Error Handler for Multer Errors
 * Catches file upload errors and formats them properly
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 5MB limit",
        error: "FILE_TOO_LARGE",
      });
    }
    
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name. Use 'licenseDocument' field for file upload",
        error: "INVALID_FIELD_NAME",
      });
    }

    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: err.message,
    });
  }

  // Pass other errors to global error handler
  next(err);
};
