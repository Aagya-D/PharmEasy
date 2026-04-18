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

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const {
  submitPharmacyOnboarding,
  getPharmacyById,
  verifyPharmacy,
  rejectPharmacy,
  updatePharmacyStatus,
  resetPharmacyOnboarding,
} = await import("../src/modules/pharmacy/pharmacy.service.js");

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

  it("rejects onboarding when the license document is missing or invalid", async () => {
    await expect(
      submitPharmacyOnboarding("u-1", {
        ...onboardingPayload(),
        licenseDocument: {},
      })
    ).rejects.toThrow("Missing required license documentation");

    await expect(
      submitPharmacyOnboarding("u-1", {
        ...onboardingPayload(),
        licenseDocument: "   ",
      })
    ).rejects.toThrow("Missing required license documentation");
  });

  it("rejects onboarding when coordinates are invalid", async () => {
    await expect(
      submitPharmacyOnboarding("u-1", {
        ...onboardingPayload(),
        latitude: "not-a-number",
      })
    ).rejects.toThrow("Invalid latitude value");

    await expect(
      submitPharmacyOnboarding("u-1", {
        ...onboardingPayload(),
        longitude: "999",
      })
    ).rejects.toThrow("Longitude must be between -180 and 180");
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

  it("throws not found when onboarding user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(submitPharmacyOnboarding("u-missing", onboardingPayload())).rejects.toThrow(
      "User not found"
    );
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

  it("rejects onboarding for non-pharmacy-admin users", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", roleId: 3 });

    await expect(submitPharmacyOnboarding("u-1", onboardingPayload())).rejects.toThrow(
      "Only Pharmacy Admin users can register a pharmacy"
    );
  });

  it("rejects onboarding when license number is already used", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", roleId: 2 });
    prismaMock.pharmacy.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ph-existing" });

    await expect(submitPharmacyOnboarding("u-1", onboardingPayload())).rejects.toThrow(
      "License number already registered"
    );
  });

  it("verifies a pending pharmacy and updates user status", async () => {
    const tx = {
      user: { update: jest.fn().mockResolvedValue({}) },
      pharmacy: {
        update: jest.fn().mockResolvedValue({
          id: "ph-1",
          verificationStatus: "VERIFIED",
          user: { id: "u-1", status: "APPROVED" },
        }),
      },
    };

    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      userId: "u-1",
      verificationStatus: "PENDING_VERIFICATION",
    });
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await verifyPharmacy("ph-1", "admin-1");

    expect(result.verificationStatus).toBe("VERIFIED");
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { status: "APPROVED" },
    });
  });

  it("prevents verifying a rejected pharmacy directly", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({
      id: "ph-1",
      verificationStatus: "REJECTED",
    });

    await expect(verifyPharmacy("ph-1", "admin-1")).rejects.toThrow(
      "Cannot verify a rejected pharmacy"
    );
  });

  it("rejects invalid pharmacy status updates", async () => {
    await expect(updatePharmacyStatus("ph-1", "admin-1", "ARCHIVED")).rejects.toThrow(
      "Invalid status"
    );
  });

  it("requires a reason when updating pharmacy status to rejected", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });

    await expect(updatePharmacyStatus("ph-1", "admin-1", "REJECTED")).rejects.toThrow(
      "Rejection reason is required when rejecting"
    );
  });

  it("updates pharmacy status to rejected with reason", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.pharmacy.update.mockResolvedValue({
      id: "ph-1",
      verificationStatus: "REJECTED",
      rejectionReason: "Invalid document",
    });

    const result = await updatePharmacyStatus(
      "ph-1",
      "admin-1",
      "REJECTED",
      "Invalid document"
    );

    expect(result.verificationStatus).toBe("REJECTED");
    expect(prismaMock.pharmacy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ph-1" },
        data: expect.objectContaining({ rejectionReason: "Invalid document" }),
      })
    );
  });
});
