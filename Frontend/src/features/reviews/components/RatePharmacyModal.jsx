import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Loader, CheckCircle } from "lucide-react";
import reviewService from "../services/review.service";

/**
 * RatePharmacyModal
 *
 * Renders a modal overlay that lets the patient rate a pharmacy 1–5 stars
 * with an optional text comment.  On successful submission the parent
 * callback `onSuccess` is invoked so it can update local state.
 *
 * Props:
 *   - isOpen        : boolean
 *   - onClose       : () => void
 *   - pharmacyId    : string
 *   - pharmacyName  : string  (for display purposes)
 *   - onSuccess     : (data) => void  (optional callback after successful review)
 */
export default function RatePharmacyModal({
  isOpen,
  onClose,
  pharmacyId,
  pharmacyName = "Pharmacy",
  onSuccess,
}) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await reviewService.submitReview({
        pharmacyId,
        rating,
        comment: comment.trim() || undefined,
      });

      setSuccess(true);

      // Notify parent
      if (onSuccess) {
        onSuccess(result.data);
      }

      // Auto-close after showing success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to submit review. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Rate Pharmacy</h2>
                <p className="text-sm text-gray-500 mt-0.5">{pharmacyName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {success ? (
                /* ── Success state ─── */
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                  <p className="text-lg font-semibold text-gray-900">Thank you!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your review has been submitted.
                  </p>
                </motion.div>
              ) : (
                /* ── Review form ─── */
                <>
                  {/* Star selector */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 mb-3">
                      How was your experience?
                    </p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          onClick={() => {
                            setRating(star);
                            setError("");
                          }}
                          className="transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            size={36}
                            className={`transition-colors ${
                              star <= (hoveredStar || rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {(hoveredStar || rating) > 0 && (
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        {ratingLabels[hoveredStar || rating]}
                      </p>
                    )}
                  </div>

                  {/* Comment textarea */}
                  <div className="mb-4">
                    <label
                      htmlFor="review-comment"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Comment{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      maxLength={500}
                      placeholder="Tell us about your experience..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none transition"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {comment.length}/500
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-4">
                      {error}
                    </p>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className={`w-full py-3 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                      submitting || rating === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader className="animate-spin" size={18} />
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
