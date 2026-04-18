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

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/distance.js", () => ({
  calculateDistance: calculateDistanceMock,
  formatDistance: formatDistanceMock,
}));

const { default: searchService } = await import("../src/modules/search/search.service.js");

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
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
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

  it("falls back to category keywords when exact category lookup returns nothing", async () => {
    prismaMock.inventory.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        inventoryItem({
          id: "inv-keyword",
          name: "Paracetamol 500",
          category: "otc",
        }),
      ]);

    const results = await searchService.getTopMedicinesNearLocation({
      category: "fever",
      limit: 8,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("inv-keyword");
    expect(prismaMock.inventory.findMany).toHaveBeenCalledTimes(2);

    const firstCallArgs = prismaMock.inventory.findMany.mock.calls[0][0];
    expect(firstCallArgs.where.category).toEqual({
      equals: "fever",
      mode: "insensitive",
    });

    const secondCallArgs = prismaMock.inventory.findMany.mock.calls[1][0];
    const keywordContains = secondCallArgs.where.OR.map((entry) =>
      entry.name?.contains ?? entry.genericName?.contains
    );
    expect(keywordContains).toContain("paracetamol");
  });

  it("groups duplicate universal-search medicine entries and keeps cheapest when location is missing", async () => {
    prismaMock.inventory.findMany.mockResolvedValue([
      inventoryItem({
        id: "inv-expensive",
        price: 90,
        pharmacy: {
          id: "ph-1",
          pharmacyName: "High Price Pharmacy",
          address: "Addr 1",
          contactNumber: "111",
          latitude: 27.7,
          longitude: 85.3,
          averageRating: 4,
          totalReviews: 3,
        },
      }),
      inventoryItem({
        id: "inv-cheap",
        price: 50,
        pharmacy: {
          id: "ph-2",
          pharmacyName: "Low Price Pharmacy",
          address: "Addr 2",
          contactNumber: "222",
          latitude: 27.71,
          longitude: 85.31,
          averageRating: 4.7,
          totalReviews: 10,
        },
      }),
    ]);

    prismaMock.pharmacy.findMany.mockResolvedValue([
      {
        id: "ph-2",
        pharmacyName: "Low Price Pharmacy",
        address: "Addr 2",
        contactNumber: "222",
        latitude: 27.71,
        longitude: 85.31,
        averageRating: 4.7,
        totalReviews: 10,
        _count: {
          inventory: 4,
        },
      },
    ]);

    const results = await searchService.getUniversalSearchResults({
      query: "Paracetamol",
      medicineLimit: 8,
      pharmacyLimit: 8,
    });

    expect(results.medicines).toHaveLength(1);
    expect(results.medicines[0].id).toBe("inv-cheap");
    expect(results.medicines[0].price).toBe(50);
    expect(results.medicines[0].pharmacy.id).toBe("ph-2");
    expect(results.medicines[0].distance).toBeNull();
    expect(calculateDistanceMock).not.toHaveBeenCalled();
  });

  it("sorts top medicines by stock and price when location is not provided", async () => {
    prismaMock.inventory.findMany.mockResolvedValue([
      inventoryItem({ id: "inv-a", name: "Aspirin", genericName: "Aspirin", quantity: 10, price: 80 }),
      inventoryItem({ id: "inv-b", name: "Cetrizine", genericName: "Cet", quantity: 30, price: 45 }),
      inventoryItem({ id: "inv-c", name: "Vitamin C", genericName: "Ascorbic", quantity: 30, price: 40 }),
    ]);

    const results = await searchService.getTopMedicinesNearLocation({ limit: 3 });

    expect(results.map((item) => item.id)).toEqual(["inv-c", "inv-b", "inv-a"]);
    expect(results.every((item) => item.distance === null)).toBe(true);
  });

  it("returns nearby pharmacies inside radius sorted by distance and applies limit", async () => {
    prismaMock.pharmacy.findMany.mockResolvedValue([
      {
        id: "ph-1",
        pharmacyName: "First",
        address: "Addr 1",
        latitude: 27.71,
        longitude: 85.31,
        contactNumber: "111",
        averageRating: 4,
        totalReviews: 10,
        _count: { inventory: 20 },
      },
      {
        id: "ph-2",
        pharmacyName: "Second",
        address: "Addr 2",
        latitude: 27.72,
        longitude: 85.32,
        contactNumber: "222",
        averageRating: 4.2,
        totalReviews: 8,
        _count: { inventory: 15 },
      },
      {
        id: "ph-3",
        pharmacyName: "Outside Radius",
        address: "Addr 3",
        latitude: 27.8,
        longitude: 85.5,
        contactNumber: "333",
        averageRating: 4.6,
        totalReviews: 18,
        _count: { inventory: 25 },
      },
    ]);

    calculateDistanceMock.mockImplementation((_, __, ___, lng) => {
      if (lng === 85.31) return 2;
      if (lng === 85.32) return 4;
      return 12;
    });

    const results = await searchService.findNearbyPharmacies({
      latitude: 27.7,
      longitude: 85.3,
      radius: 10,
      limit: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ph-1");
    expect(results[0].distance).toBe(2);
  });

});
