import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  pharmacy: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../../database/prisma.js", () => ({
  prisma: prismaMock,
}));

const {
  submitPharmacyOnboarding,
  getPharmacyById,
  verifyPharmacy,
  rejectPharmacy,
  resetPharmacyOnboarding,
} = await import("./pharmacy.service.js");

const onboardingPayload = () => ({
  pharmacyName: "City Pharmacy",
  address: "Kathmandu",
  latitude: "27.7172",
  longitude: "85.3240",
  licenseNumber: "LIC-1001",
  licenseDocument: "https://cloudinary.example.com/license.pdf",
  contactNumber: "9800000000",
});

describe("pharmacy.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects onboarding when required fields are missing", async () => {
    await expect(
      submitPharmacyOnboarding("u-1", {
        pharmacyName: "",
        address: "",
      })
    ).rejects.toThrow("Missing required pharmacy details");
  });

  it("submits onboarding and updates user status in a transaction", async () => {
    const tx = {
      user: { update: jest.fn().mockResolvedValue({}) },
      pharmacy: {
        create: jest.fn().mockResolvedValue({
          id: "ph-1",
          pharmacyName: "City Pharmacy",
          user: { id: "u-1", status: "PENDING" },
        }),
      },
    };

    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", roleId: 2 });
    prismaMock.pharmacy.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await submitPharmacyOnboarding("u-1", onboardingPayload());

    expect(result.id).toBe("ph-1");
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { status: "PENDING" },
    });
    expect(tx.pharmacy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-1",
          latitude: 27.7172,
          longitude: 85.324,
          verificationStatus: "PENDING_VERIFICATION",
        }),
      })
    );
  });

  it("throws not found when pharmacy id does not exist", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue(null);

    await expect(getPharmacyById("ph-missing")).rejects.toThrow("Pharmacy not found");
  });

  it("prevents verifying an already verified pharmacy", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      verificationStatus: "VERIFIED",
    });

    await expect(verifyPharmacy("ph-1", "admin-1")).rejects.toThrow("already verified");
  });

  it("requires a rejection reason", async () => {
    await expect(rejectPharmacy("ph-1", "admin-1", "")).rejects.toThrow(
      "Rejection reason is required"
    );
  });

  it("resets rejected onboarding and returns updated user snapshot", async () => {
    const tx = {
      pharmacy: {
        delete: jest.fn().mockResolvedValue({ id: "ph-1" }),
      },
      user: {
        update: jest.fn().mockResolvedValue({
          id: "u-1",
          email: "owner@example.com",
          name: "Owner",
          status: "ONBOARDING_REQUIRED",
          roleId: 2,
        }),
      },
    };

    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      roleId: 2,
      pharmacy: {
        id: "ph-1",
        verificationStatus: "REJECTED",
      },
    });
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await resetPharmacyOnboarding("u-1");

    expect(result).toEqual({
      user: {
        id: "u-1",
        email: "owner@example.com",
        name: "Owner",
        status: "ONBOARDING_REQUIRED",
        roleId: 2,
      },
    });
    expect(tx.pharmacy.delete).toHaveBeenCalledWith({ where: { id: "ph-1" } });
  });
});
