/**
 * Cloudinary setup for pharmacy file uploads.
 */

import { v2 as cloudinary } from "cloudinary";

// Check that the upload service is configured.
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
  // Keep the server running in development even if uploads are not configured.
}

// Configure the SDK with the active environment values.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("✓ Cloudinary configured successfully");

export default cloudinary;
