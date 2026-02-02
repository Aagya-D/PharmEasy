/**
 * Cloudinary Configuration
 * Secure cloud storage for pharmacy license documents
 * 
 * Environment Variables Required:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 * 
 * Usage:
 * - Pharmacy license uploads
 * - Document verification storage
 * - Secure URL generation for admin access
 */

import { v2 as cloudinary } from "cloudinary";

// Validate required environment variables
const requiredEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  Missing Cloudinary environment variables: ${missingVars.join(", ")}\n` +
    `File uploads will fail until configured.`
  );
  // Don't throw - allow server to start without Cloudinary in development
  // Upload middleware will fail gracefully with proper error messages
}

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS
});

console.log("✓ Cloudinary configured successfully");

export default cloudinary;
