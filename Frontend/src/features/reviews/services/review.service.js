import { httpClient } from "../../../core/services/httpClient";

const reviewService = {
  /**
   * Submit a review for a pharmacy
   * POST /reviews
   */
  submitReview: async ({ pharmacyId, rating, comment, sosRequestId }) => {
    const response = await httpClient.post("/reviews", {
      pharmacyId,
      rating: Number(rating),
      comment,
      sosRequestId,
    });
    return response.data;
  },

  /**
   * Get all reviews for a pharmacy
   * GET /reviews/:pharmacyId
   */
  getPharmacyReviews: async (pharmacyId) => {
    const response = await httpClient.get(`/reviews/${pharmacyId}`);
    return response.data;
  },
};

export default reviewService;
