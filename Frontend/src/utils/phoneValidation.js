/**
 * Nepali Phone Number Validation
 * Standard Nepal mobile format: exactly 10 digits, must start with 9.
 * Examples: 9801234567, 9861234567, 9741234567
 */

export const NEPALI_PHONE_REGEX = /^9\d{9}$/;

export const NEPALI_PHONE_ERROR =
  "Invalid Nepali phone number. Must be 10 digits starting with 9.";

/**
 * Returns true if the given value is a valid Nepali mobile number.
 * Accepts a string or number; trims whitespace before testing.
 */
export function isValidNepaliPhone(phone) {
  if (!phone && phone !== 0) return false;
  return NEPALI_PHONE_REGEX.test(String(phone).trim());
}

/**
 * onChange helper — strips non-digit characters and caps length at 10.
 * Use this on the input's onChange handler to apply live input masking.
 */
export function maskPhoneInput(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}
