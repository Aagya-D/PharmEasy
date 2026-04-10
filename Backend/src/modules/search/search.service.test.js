import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  inventory: {
    findMany: jest.fn(),
  },
  pharmacy: {
    findMany: jest.fn(),
  },
};

const calculateDistanceMock = jest.fn();
const formatDistanceMock = jest.fn();

jest.unstable_mockModule("../../database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../../utils/distance.js", () => ({
  calculateDistance: calculateDistanceMock,
  formatDistance: formatDistanceMock,
}));

const { default: searchService } = await import("./search.service.js");

const inventoryItem = (overrides = {}) => ({
  id: "inv-1",
  name: "Paracetamol",
  genericName: "Acetaminophen",
  category: "fever",
  imageUrl: null,
  price: 40,
  quantity: 20,
  expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  sideEffects: "Nausea",
  contraindications: "Liver disease",
  warnings: "Do not overdose",
  isPrescriptionRequired: false,
  dosageInstructions: "After meal",
  route: "ORAL",
  timing: "AFTER_FOOD",
  strength: "500mg",
  form: "Tablet",
  manufacturer: "ABC Pharma",
  batchNumber: "B100",
  pharmacy: {
    id: "ph-1",
    pharmacyName: "City Pharmacy",
    address: "Kathmandu",
    contactNumber: "9800000000",
    latitude: 27.71,
    longitude: 85.32,
    averageRating: 4.5,
    totalReviews: 10,
  },
  ...overrides,
});

describe("search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formatDistanceMock.mockImplementation((distance) => `${distance} km`);
  });

  it("groups duplicate medicine offerings and keeps nearest option", async () => {
    prismaMock.inventory.findMany.mockResolvedValue([
      inventoryItem({
        id: "inv-1",
        pharmacy: {
          id: "ph-1",
          pharmacyName: "Far Pharmacy",
          address: "Addr 1",
          contactNumber: "111",
          latitude: 27.7,
          longitude: 85.3,
          averageRating: 4,
          totalReviews: 3,
        },
      }),
      inventoryItem({
        id: "inv-2",
        pharmacy: {
          id: "ph-2",
          pharmacyName: "Near Pharmacy",
          address: "Addr 2",
          contactNumber: "222",
          latitude: 27.71,
          longitude: 85.31,
          averageRating: 4.8,
          totalReviews: 9,
        },
      }),
    ]);

    calculateDistanceMock.mockImplementation((_, __, ___, lng) => (lng === 85.31 ? 2 : 8));

    const results = await searchService.getTopMedicinesNearLocation({
      latitude: 27.7,
      longitude: 85.3,
      limit: 8,
    });

    expect(results).toHaveLength(1);
    expect(results[0].pharmacy.id).toBe("ph-2");
    expect(results[0].distance).toBe(2);
  });

  it("rejects universal search when query is empty", async () => {
    await expect(
      searchService.getUniversalSearchResults({
        query: "   ",
      })
    ).rejects.toThrow("Search query is required");
  });

  it("applies nearest-result failsafe when max distance filtering removes all matches", async () => {
    prismaMock.pharmacy.findMany.mockResolvedValue([
      {
        id: "ph-audit",
        pharmacyName: "Audit Pharmacy",
        verificationStatus: "VERIFIED",
        latitude: 27.7,
        longitude: 85.3,
      },
    ]);
    prismaMock.inventory.findMany.mockResolvedValue([
      inventoryItem({
        pharmacy: {
          id: "ph-9",
          pharmacyName: "Distant Pharmacy",
          address: "Pokhara",
          contactNumber: "9800000001",
          latitude: 28.2,
          longitude: 84,
          averageRating: 4,
          totalReviews: 2,
        },
      }),
    ]);

    calculateDistanceMock.mockReturnValue(100);

    const results = await searchService.searchMedicines({
      query: "para",
      latitude: 27.7,
      longitude: 85.3,
      maxDistance: 10,
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("failsafeNote");
    expect(results[0].failsafeNote).toContain("No pharmacies found within 10km");
  });

  it("rejects nearby pharmacy lookup for invalid coordinates", async () => {
    await expect(
      searchService.findNearbyPharmacies({
        latitude: 100,
        longitude: 85,
      })
    ).rejects.toThrow("Invalid coordinates provided");
  });

  it("calculates aggregate search statistics", async () => {
    const spy = jest.spyOn(searchService, "searchMedicines").mockResolvedValue([
      { inStock: true, pharmacy: { id: "ph-1" }, price: 10 },
      { inStock: false, pharmacy: { id: "ph-2" }, price: 30 },
      { inStock: true, pharmacy: { id: "ph-1" }, price: 20 },
    ]);

    const stats = await searchService.getSearchStats("paracetamol");

    expect(stats).toEqual({
      totalResults: 3,
      inStock: 2,
      outOfStock: 1,
      uniquePharmacies: 2,
      priceRange: {
        min: 10,
        max: 30,
        avg: 20,
      },
    });

    expect(spy).toHaveBeenCalledWith({
      query: "paracetamol",
      includeOutOfStock: true,
      limit: 1000,
    });
  });
});
