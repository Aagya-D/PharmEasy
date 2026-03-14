-- Persist patient shipping address for reusable checkout autofill
ALTER TABLE "User"
ADD COLUMN "shippingAddress" JSONB;
