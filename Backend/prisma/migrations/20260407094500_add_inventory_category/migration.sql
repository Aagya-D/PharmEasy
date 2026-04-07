-- Add medicine category to inventory for explicit medication type grouping.
ALTER TABLE "Inventory"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';

-- Speeds up category-based filtering on patient dashboard.
CREATE INDEX "Inventory_category_idx" ON "Inventory"("category");
