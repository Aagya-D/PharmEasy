/**
 * Review Controller
 * POST   /api/reviews          - Submit a new review (patient only)
 * GET    /api/reviews/:pharmacyId - Get all reviews for a pharmacy (public)
 *
 * The POST handler saves the review and recalculates the pharmacy's
 * averageRating / totalReviews inside a Prisma transaction.
 */

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

/**
 * POST /api/reviews
 * Body: { pharmacyId, rating, comment? }
 */
export const submitReview = async (req, res, next) => {
  try {
    const patientId = req.user?.userId;
    if (!patientId) {
      return next(new AppError("Authentication required", 401));
    }

    const { pharmacyId, rating, comment } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!pharmacyId) {
      return next(new AppError("pharmacyId is required", 400));
    }
    if (rating === undefined || rating === null) {
      return next(new AppError("rating is required", 400));
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return next(new AppError("rating must be an integer between 1 and 5", 400));
    }

    // Verify pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, averageRating: true, totalReviews: true },
    });
    if (!pharmacy) {
      return next(new AppError("Pharmacy not found", 404));
    }

    // Prevent duplicate reviews (unique constraint will also catch this)
    const existing = await prisma.review.findUnique({
      where: { pharmacyId_patientId: { pharmacyId, patientId } },
    });
    if (existing) {
      return next(new AppError("You have already reviewed this pharmacy", 409));
    }

    // ── Transaction: create review + recalculate average ────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the review
      const review = await tx.review.create({
        data: {
          rating: numRating,
          comment: comment?.trim() || null,
          pharmacyId,
          patientId,
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });

      // 2. Recalculate average:  (OldAvg * OldCount + NewRating) / (OldCount + 1)
      const oldAvg = pharmacy.averageRating || 0;
      const oldCount = pharmacy.totalReviews || 0;
      const newCount = oldCount + 1;
      const newAvg = (oldAvg * oldCount + numRating) / newCount;

      // 3. Update pharmacy
      await tx.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          averageRating: Math.round(newAvg * 100) / 100, // 2 decimal places
          totalReviews: newCount,
        },
      });

      return { review, newAvg: Math.round(newAvg * 100) / 100, newCount };
    });

    return res.status(201).json({
      success: true,
      data: {
        review: {
          id: result.review.id,
          rating: result.review.rating,
          comment: result.review.comment,
          pharmacyId: result.review.pharmacyId,
          patientId: result.review.patientId,
          patientName: result.review.patient?.name || "Anonymous",
          createdAt: result.review.createdAt,
        },
        pharmacy: {
          averageRating: result.newAvg,
          totalReviews: result.newCount,
        },
      },
      message: "Review submitted successfully",
    });
  } catch (error) {
    // Prisma unique constraint violation
    if (error.code === "P2002") {
      return next(new AppError("You have already reviewed this pharmacy", 409));
    }
    next(error);
  }
};

/**
 * GET /api/reviews/:pharmacyId
 * Returns all reviews for a pharmacy, newest first.
 */
export const getPharmacyReviews = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;

    if (!pharmacyId) {
      return next(new AppError("pharmacyId is required", 400));
    }

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, averageRating: true, totalReviews: true, pharmacyName: true },
    });

    if (!pharmacy) {
      return next(new AppError("Pharmacy not found", 404));
    }

    const reviews = await prisma.review.findMany({
      where: { pharmacyId },
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      patientId: r.patientId,
      patientName: r.patient?.name || "Anonymous",
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.pharmacyName,
          averageRating: pharmacy.averageRating,
          totalReviews: pharmacy.totalReviews,
        },
        reviews: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};
