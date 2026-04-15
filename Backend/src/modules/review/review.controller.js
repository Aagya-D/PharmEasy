// Review controller for creating patient reviews and listing pharmacy reviews.

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../middlewares/errorHandler.js";

// Submit or update a patient review for one pharmacy.
export const submitReview = async (req, res, next) => {
  try {
    // Resolve authenticated patient ID.
    const patientId = req.user?.userId;
    if (!patientId) {
      return next(new AppError("Authentication required", 401));
    }

    // Read incoming review payload.
    const { pharmacyId, rating, comment, sosRequestId } = req.body;

    // Validate required fields.
    if (!pharmacyId) {
      return next(new AppError("pharmacyId is required", 400));
    }
    if (rating === undefined || rating === null) {
      return next(new AppError("rating is required", 400));
    }

    // Parse and validate rating range.
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return next(new AppError("rating must be an integer between 1 and 5", 400));
    }

    // Ensure pharmacy exists before writing review.
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, averageRating: true, totalReviews: true },
    });
    if (!pharmacy) {
      return next(new AppError("Pharmacy not found", 404));
    }

    // Transaction: upsert review, recalculate aggregate, optionally complete SOS.
    const result = await prisma.$transaction(async (tx) => {
      // Check whether patient already reviewed this pharmacy.
      const existing = await tx.review.findUnique({
        where: { pharmacyId_patientId: { pharmacyId, patientId } },
      });

      // Create new review or update existing patient+pharmacy review.
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

      // Recalculate average and count from source reviews.
      const aggregate = await tx.review.aggregate({
        where: { pharmacyId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const newAvg = Math.round(((aggregate._avg.rating || 0) * 100)) / 100;
      const newCount = aggregate._count._all || 0;

      // Persist aggregate snapshot on pharmacy record.
      await tx.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          averageRating: newAvg,
          totalReviews: newCount,
        },
      });

      // Auto-complete accepted SOS request if linked and owned by patient.
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
    // Handle unique-race case by returning existing review.
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

// Get all reviews for one pharmacy, newest first.
export const getPharmacyReviews = async (req, res, next) => {
  try {
    // Read pharmacy ID from route params.
    const { pharmacyId } = req.params;

    if (!pharmacyId) {
      return next(new AppError("pharmacyId is required", 400));
    }

    // Load pharmacy rating summary snapshot.
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, averageRating: true, totalReviews: true, pharmacyName: true },
    });

    if (!pharmacy) {
      return next(new AppError("Pharmacy not found", 404));
    }

    // Fetch all review rows with patient names.
    const reviews = await prisma.review.findMany({
      where: { pharmacyId },
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });

    // Normalize API response shape.
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
