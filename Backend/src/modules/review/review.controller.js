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

    const { pharmacyId, rating, comment, sosRequestId } = req.body;

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

    // ── Transaction: upsert review + recalculate average + complete SOS ──
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { pharmacyId_patientId: { pharmacyId, patientId } },
      });

      // 1. Create new review or update an existing one for this patient+pharmacy
      const review = existing
        ? await tx.review.update({
            where: { pharmacyId_patientId: { pharmacyId, patientId } },
            data: {
              rating: numRating,
              comment: comment?.trim() || null,
            },
            include: {
              patient: { select: { id: true, name: true } },
            },
          })
        : await tx.review.create({
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

      // 2. Recalculate aggregate rating from source-of-truth reviews
      const aggregate = await tx.review.aggregate({
        where: { pharmacyId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const newAvg = Math.round(((aggregate._avg.rating || 0) * 100)) / 100;
      const newCount = aggregate._count._all || 0;

      // 3. Update pharmacy rating snapshot
      await tx.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          averageRating: newAvg,
          totalReviews: newCount,
        },
      });

      // 4. Auto-complete the SOS request if provided and belongs to this patient
      if (sosRequestId) {
        await tx.sOSRequest.updateMany({
          where: { id: sosRequestId, patientId, status: "accepted" },
          data: { status: "completed" },
        });
      }

      return { review, newAvg, newCount, wasUpdate: Boolean(existing) };
    });

    return res.status(result.wasUpdate ? 200 : 201).json({
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
      message: result.wasUpdate
        ? "Review updated successfully"
        : "Review submitted successfully",
    });
  } catch (error) {
    // Handle race condition on first write, then treat as update.
    if (error.code === "P2002") {
      const existingReview = await prisma.review.findUnique({
        where: {
          pharmacyId_patientId: {
            pharmacyId: req.body?.pharmacyId,
            patientId: req.user?.userId,
          },
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });

      if (existingReview) {
        return res.status(200).json({
          success: true,
          data: {
            review: {
              id: existingReview.id,
              rating: existingReview.rating,
              comment: existingReview.comment,
              pharmacyId: existingReview.pharmacyId,
              patientId: existingReview.patientId,
              patientName: existingReview.patient?.name || "Anonymous",
              createdAt: existingReview.createdAt,
            },
          },
          message: "Review already exists",
        });
      }

      return next(new AppError("Could not submit review right now. Please retry.", 409));
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
