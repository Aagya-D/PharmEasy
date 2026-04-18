import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  pharmacy: {
    findUnique: jest.fn(),
  },
  orderItem: {
    count: jest.fn(),
  },
  sOSRequest: {
    count: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

const {
  addMedicine,
  getPharmacyInventory,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} = await import("../src/modules/inventory/inventory.service.js");

const getFutureDate = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

const baseMedicinePayload = () => ({
  name: " Paracetamol ",
  genericName: " Acetaminophen ",
  category: "Pain Relief",
  quantity: 25,
  price: 50,
  expiryDate: getFutureDate(),
  sideEffects: "Nausea",
  contraindications: "Liver disease",
  warnings: "Do not overdose",
  isPrescriptionRequired: false,
  dosageInstructions: "Take after food",
  route: "ORAL",
  timing: "AFTER_FOOD",
  strength: "500mg",
  form: "Tablet",
  manufacturer: "ABC Pharma",
  batchNumber: "B123",
  imageUrl: "https://cdn.example.com/para.jpg",
});

describe("inventory.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds medicine for a valid pharmacy", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.inventory.findFirst.mockResolvedValue(null);
    prismaMock.inventory.create.mockResolvedValue({ id: "inv-1", name: "Paracetamol" });

    const result = await addMedicine("ph-1", baseMedicinePayload());

    expect(result).toEqual({ id: "inv-1", name: "Paracetamol" });
    expect(prismaMock.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Paracetamol",
          genericName: "Acetaminophen",
          category: "pain_relief",
          quantity: 25,
          price: 50,
          pharmacyId: "ph-1",
        }),
      })
    );
  });

  it("throws conflict when duplicate medicine exists", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.inventory.findFirst.mockResolvedValue({ id: "inv-existing" });

    await expect(addMedicine("ph-1", baseMedicinePayload())).rejects.toThrow(
      "already exists in your inventory"
    );
  });

  it("returns paginated pharmacy inventory", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue({ id: "ph-1" });
    prismaMock.inventory.count.mockResolvedValue(25);
    prismaMock.inventory.findMany.mockResolvedValue([{ id: "inv-1" }]);

    const result = await getPharmacyInventory("ph-1", 2, 10);

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual(
      expect.objectContaining({
        currentPage: 2,
        totalPages: 3,
        totalItems: 25,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPreviousPage: true,
      })
    );
  });

  it("blocks updating inventory item owned by another pharmacy", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-other",
    });

    await expect(updateInventoryItem("inv-1", "ph-1", { quantity: 1 })).rejects.toThrow(
      "do not have permission"
    );
  });

  it("throws not found when requesting missing inventory item", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue(null);

    await expect(getInventoryItemById("inv-missing", "ph-1")).rejects.toThrow(
      "Inventory item not found"
    );
  });

  it("deletes inventory item when pharmacy owns it", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
    });
    prismaMock.orderItem.count.mockResolvedValue(0);
    prismaMock.sOSRequest.count.mockResolvedValue(0);
    prismaMock.inventory.delete.mockResolvedValue({ id: "inv-1" });

    const result = await deleteInventoryItem("inv-1", "ph-1");

    expect(result).toEqual({ id: "inv-1" });
    expect(prismaMock.orderItem.count).toHaveBeenCalledWith({ where: { inventoryId: "inv-1" } });
    expect(prismaMock.sOSRequest.count).toHaveBeenCalled();
    expect(prismaMock.inventory.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
  });

  it("rejects add medicine when pharmacy does not exist", async () => {
    prismaMock.pharmacy.findUnique.mockResolvedValue(null);

    await expect(addMedicine("ph-missing", baseMedicinePayload())).rejects.toThrow("Pharmacy not found");
  });

  it("rejects add medicine when route is invalid", async () => {
    await expect(
      addMedicine("ph-1", {
        ...baseMedicinePayload(),
        route: "INJECTION",
      })
    ).rejects.toThrow("route must be ORAL or TOPICAL");
  });

  it("updates inventory item when pharmacy owns it", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
      category: "pain_relief",
      quantity: 10,
      price: 40,
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      sideEffects: "Nausea",
      contraindications: "Liver disease",
      warnings: "Do not overdose",
      isPrescriptionRequired: false,
      dosageInstructions: "Take after food",
      route: "ORAL",
      timing: "AFTER_FOOD",
      strength: "500mg",
      form: "Tablet",
      manufacturer: "ABC Pharma",
      batchNumber: "B123",
      imageUrl: null,
    });
    prismaMock.inventory.update.mockResolvedValue({ id: "inv-1", quantity: 30, price: 55 });

    const result = await updateInventoryItem("inv-1", "ph-1", {
      quantity: 30,
      price: 55,
    });

    expect(result).toEqual({ id: "inv-1", quantity: 30, price: 55 });
    expect(prismaMock.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({ quantity: 30, price: 55 }),
      })
    );
  });

  it("blocks deleting inventory item linked to existing orders", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
    });
    prismaMock.orderItem.count.mockResolvedValue(1);

    await expect(deleteInventoryItem("inv-1", "ph-1")).rejects.toThrow(
      "linked to existing orders"
    );
    expect(prismaMock.inventory.delete).not.toHaveBeenCalled();
  });

  it("blocks deleting inventory item linked to SOS requests", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-1",
      name: "Paracetamol",
      genericName: "Acetaminophen",
    });
    prismaMock.orderItem.count.mockResolvedValue(0);
    prismaMock.sOSRequest.count.mockResolvedValue(2);

    await expect(deleteInventoryItem("inv-1", "ph-1")).rejects.toThrow(
      "linked to SOS requests"
    );
    expect(prismaMock.inventory.delete).not.toHaveBeenCalled();
  });

  it("blocks viewing inventory item owned by another pharmacy", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue({
      id: "inv-1",
      pharmacyId: "ph-other",
    });

    await expect(getInventoryItemById("inv-1", "ph-1")).rejects.toThrow(
      "do not have permission to view"
    );
  });
});
