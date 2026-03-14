-- Add an idempotency marker to avoid double-decrementing stock on status updates.
ALTER TABLE "Order"
ADD COLUMN "inventoryDeducted" BOOLEAN NOT NULL DEFAULT false;

-- Existing orders were already deducted at checkout in current flow.
-- Backfill as true to keep status updates from re-deducting stock.
UPDATE "Order"
SET "inventoryDeducted" = true;
