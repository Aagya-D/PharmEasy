// ================================================
// CLOUDINARY USAGE EXAMPLES
// ================================================

/**
 * POSTMAN TEST - Pharmacy Onboarding with File Upload
 * 
 * Endpoint: POST http://localhost:5000/api/pharmacy/onboard
 * Authorization: Bearer <JWT_TOKEN> (roleId=2 - PHARMACY_ADMIN)
 * Content-Type: multipart/form-data
 * 
 * Form Data Fields:
 * {
 *   "pharmacyName": "City Health Pharmacy",
 *   "address": "123 Main Street, Karachi",
 *   "latitude": "24.8607",
 *   "longitude": "67.0011",
 *   "licenseNumber": "PH-2025-1234",
 *   "contactNumber": "+923001234567",
 *   "licenseDocument": <file> (PDF/JPG/PNG, max 5MB)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Pharmacy onboarding submitted successfully...",
 *   "data": {
 *     "pharmacyId": "cm...",
 *     "pharmacyName": "City Health Pharmacy",
 *     "verificationStatus": "PENDING_VERIFICATION",
 *     "licenseDocument": "https://res.cloudinary.com/your-cloud/image/upload/..."
 *   }
 * }
 */

/**
 * ADMIN VERIFICATION - View Uploaded Documents
 * 
 * Endpoint: GET http://localhost:5000/api/admin/pharmacies/pending
 * Authorization: Bearer <JWT_TOKEN> (roleId=1 - SYSTEM_ADMIN)
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 1,
 *   "data": [
 *     {
 *       "id": "cm...",
 *       "pharmacyName": "City Health Pharmacy",
 *       "licenseNumber": "PH-2025-1234",
 *       "licenseDocument": "https://res.cloudinary.com/...",
 *       "licenseDocumentUrl": "https://res.cloudinary.com/...", // Direct link for viewing
 *       "verificationStatus": "PENDING_VERIFICATION",
 *       "user": { ... }
 *     }
 *   ]
 * }
 * 
 * Admin can:
 * 1. Click on licenseDocumentUrl to view/download the document
 * 2. Verify authenticity
 * 3. Approve: PATCH /api/admin/pharmacy/:id/approve
 * 4. Reject: PATCH /api/admin/pharmacy/:id/reject
 */

/**
 * FILE VALIDATION RULES
 * 
 * Allowed Types:
 * - application/pdf
 * - image/jpeg
 * - image/jpg
 * - image/png
 * 
 * Max Size: 5MB
 * 
 * Cloudinary Folder: pharmacies/licenses/
 * Filename Format: license_[userId]_[timestamp]
 * 
 * Error Responses:
 * - 400: Invalid file type / size exceeded
 * - 401: Unauthorized (missing JWT)
 * - 403: Forbidden (wrong role)
 * - 500: Upload failure
 */

/**
 * SECURITY FEATURES
 * 
 * 1. File Type Validation: Only PDF, JPG, PNG allowed
 * 2. Size Limit: 5MB maximum
 * 3. Authentication: JWT required
 * 4. Authorization: Only roleId=2 can upload
 * 5. No Local Storage: Files stored on Cloudinary, not server disk
 * 6. Database: Only URL stored, not binary data
 * 7. One Upload Per User: Cannot re-submit after admin decision
 * 8. Admin Access: Only roleId=1 can view documents
 * 9. Secure URLs: Cloudinary provides HTTPS URLs
 * 10. Environment Variables: No hardcoded secrets
 */

/**
 * CLOUDINARY INTEGRATION FLOW
 * 
 * 1. User uploads file via multipart/form-data
 * 2. Multer receives file stream
 * 3. multer-storage-cloudinary streams to Cloudinary
 * 4. Cloudinary returns secure URL + public_id
 * 5. URL saved in pharmacy.licenseDocument field
 * 6. Admin fetches URL from database
 * 7. Admin views document via Cloudinary URL
 * 8. No file stored on server disk
 * 9. No binary data in PostgreSQL
 */

/**
 * FRONTEND INTEGRATION (React/Next.js)
 * 
 * const handlePharmacyOnboarding = async (formData) => {
 *   const form = new FormData();
 *   form.append('pharmacyName', formData.pharmacyName);
 *   form.append('address', formData.address);
 *   form.append('licenseNumber', formData.licenseNumber);
 *   form.append('contactNumber', formData.contactNumber);
 *   form.append('licenseDocument', fileInput.files[0]); // File from input
 * 
 *   const response = await fetch('http://localhost:5000/api/pharmacy/onboard', {
 *     method: 'POST',
 *     headers: {
 *       'Authorization': `Bearer ${accessToken}`,
 *       // Do NOT set Content-Type - browser sets it with boundary
 *     },
 *     body: form
 *   });
 * 
 *   const result = await response.json();
 *   console.log('Uploaded document URL:', result.data.licenseDocument);
 * };
 */

/**
 * ENVIRONMENT SETUP INSTRUCTIONS
 * 
 * 1. Sign up at https://cloudinary.com (Free tier available)
 * 2. Get credentials from Dashboard
 * 3. Add to .env:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 * 4. Restart server
 * 5. Test with Postman or frontend
 */

/**
 * TESTING WITHOUT REAL CLOUDINARY
 * 
 * For local testing, you can:
 * 1. Use Cloudinary free tier (no credit card required)
 * 2. Mock upload in tests
 * 3. Use test environment variables
 * 
 * The implementation is production-ready when you add real Cloudinary credentials.
 */
