import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  pharmacy: {
    findUnique: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  sOSRequest: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const reviewController = await import("../src/modules/review/review.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("review.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new review and updates aggregate ratings", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      averageRating: 4,
      totalReviews: 10,
    });

    const tx = {
      review: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "rev-1",
          rating: 5,
          comment: "Great",
          pharmacyId: "ph-1",
          patientId: "p-1",
          patient: { id: "p-1", name: "Patient" },
          createdAt: new Date("2026-04-15T00:00:00.000Z"),
        }),
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 2 },
        }),
      },
      pharmacy: {
        update: jest.fn().mockResolvedValue({ id: "ph-1" }),
      },
      sOSRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const req = {
      user: { userId: "p-1" },
      body: { pharmacyId: "ph-1", rating: 5, comment: "Great" },
    };
    const res = createRes();
    const next = jest.fn();

    await reviewController.submitReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Review submitted successfully",
        data: expect.objectContaining({
          pharmacy: { averageRating: 4.5, totalReviews: 2 },
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns pharmacy reviews with summary data", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      averageRating: 4.4,
      totalReviews: 3,
      pharmacyName: "City Pharmacy",
    });
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: "rev-1",
        rating: 5,
        comment: "Good",
        patientId: "p-1",
        patient: { id: "p-1", name: "Patient" },
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
      },
    ]);

    const req = { params: { pharmacyId: "ph-1" } };
    const res = createRes();
    const next = jest.fn();

    await reviewController.getPharmacyReviews(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          pharmacy: expect.objectContaining({ id: "ph-1", averageRating: 4.4 }),
          reviews: [expect.objectContaining({ id: "rev-1", rating: 5 })],
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects reviews with invalid rating values", async () => {
    const req = {
      user: { userId: "p-1" },
      body: { pharmacyId: "ph-1", rating: 6, comment: "Too high" },
    };
    const res = createRes();
    const next = jest.fn();

    await reviewController.submitReview(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "rating must be an integer between 1 and 5" })
    );
    expect(prismaMock.pharmacy.findUnique).not.toHaveBeenCalled();
  });
});
