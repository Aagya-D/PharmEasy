-- Create cart table (one cart per patient)
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- Create cart item table (medicine rows in a cart)
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" TIMESTAMP(3),
    "pharmacyName" TEXT,
    "pharmacyAddress" TEXT,
    "pharmacyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- Uniqueness and index strategy
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE UNIQUE INDEX "CartItem_cartId_medicineId_pharmacyId_key" ON "CartItem"("cartId", "medicineId", "pharmacyId");

CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX "CartItem_medicineName_idx" ON "CartItem"("medicineName");
CREATE INDEX "CartItem_pharmacyName_idx" ON "CartItem"("pharmacyName");

-- Foreign keys
ALTER TABLE "Cart"
    ADD CONSTRAINT "Cart_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
