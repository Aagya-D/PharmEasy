-- ============================================================
-- Migration: add_missing_models_and_sos_fields
-- Date: 20260312
--
-- Adds columns that exist in schema.prisma but were never migrated
-- to the SOSRequest table, and creates tables for models that have
-- no previous migration: PharmacyResponse, FavoriteMedicine, Review,
-- Log, Notification, HealthTip, Announcement, TwoFactorAuth.
-- All statements use IF NOT EXISTS / DO-EXCEPTION so the migration
-- is idempotent and safe to re-apply against any DB state.
-- ============================================================

-- ─── 1. SOSRequest — add missing columns ─────────────────────
ALTER TABLE "SOSRequest" ADD COLUMN IF NOT EXISTS "prescriptionUrl" TEXT;
ALTER TABLE "SOSRequest" ADD COLUMN IF NOT EXISTS "acceptedBy"      TEXT;
ALTER TABLE "SOSRequest" ADD COLUMN IF NOT EXISTS "acceptedAt"      TIMESTAMP(3);
ALTER TABLE "SOSRequest" ADD COLUMN IF NOT EXISTS "rejectionNote"   TEXT;

-- ─── 2. Enums ────────────────────────────────────────────────
-- NotificationType may already exist (SOS_ALERT migration references it).
-- Use DO-EXCEPTION to be safe.
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'CMS_ALERT',
    'SOS_ALERT',
    'SOS_UPDATE',
    'MEDICINE_ALERT',
    'SYSTEM_MESSAGE',
    'LOW_STOCK_WARNING',
    'EXPIRY_WARNING'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add any enum values that may be missing from an older definition
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOS_ALERT';        EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOW_STOCK_WARNING'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPIRY_WARNING';     EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LogCategory" AS ENUM (
    'AUTH', 'PHARMACY', 'SYSTEM', 'USER', 'INVENTORY', 'ORDER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. PharmacyResponse ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PharmacyResponse" (
    "id"          TEXT        NOT NULL,
    "sosId"       TEXT        NOT NULL,
    "pharmacyId"  TEXT        NOT NULL,
    "response"    TEXT        NOT NULL DEFAULT 'rejected',
    "note"        TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyResponse_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PharmacyResponse"
    ADD CONSTRAINT "PharmacyResponse_sosId_fkey"
    FOREIGN KEY ("sosId") REFERENCES "SOSRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PharmacyResponse_sosId_pharmacyId_key"
  ON "PharmacyResponse"("sosId", "pharmacyId");
CREATE INDEX IF NOT EXISTS "PharmacyResponse_sosId_idx"      ON "PharmacyResponse"("sosId");
CREATE INDEX IF NOT EXISTS "PharmacyResponse_pharmacyId_idx" ON "PharmacyResponse"("pharmacyId");
CREATE INDEX IF NOT EXISTS "PharmacyResponse_response_idx"   ON "PharmacyResponse"("response");

-- ─── 4. FavoriteMedicine ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FavoriteMedicine" (
    "id"           TEXT        NOT NULL,
    "userId"       TEXT        NOT NULL,
    "medicineName" TEXT        NOT NULL,
    "genericName"  TEXT,
    "imageUrl"     TEXT,
    "lastPrice"    DOUBLE PRECISION,
    "lastPharmacy" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteMedicine_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "FavoriteMedicine"
    ADD CONSTRAINT "FavoriteMedicine_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "FavoriteMedicine_userId_medicineName_key"
  ON "FavoriteMedicine"("userId", "medicineName");
CREATE INDEX IF NOT EXISTS "FavoriteMedicine_userId_idx" ON "FavoriteMedicine"("userId");

-- ─── 5. Review ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Review" (
    "id"         TEXT        NOT NULL,
    "rating"     INTEGER     NOT NULL,
    "comment"    TEXT,
    "pharmacyId" TEXT        NOT NULL,
    "patientId"  TEXT        NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Review"
    ADD CONSTRAINT "Review_pharmacyId_fkey"
    FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Review"
    ADD CONSTRAINT "Review_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_pharmacyId_patientId_key"
  ON "Review"("pharmacyId", "patientId");
CREATE INDEX IF NOT EXISTS "Review_pharmacyId_idx" ON "Review"("pharmacyId");
CREATE INDEX IF NOT EXISTS "Review_patientId_idx"  ON "Review"("patientId");
CREATE INDEX IF NOT EXISTS "Review_rating_idx"     ON "Review"("rating");

-- ─── 6. Log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Log" (
    "id"           TEXT           NOT NULL,
    "action"       TEXT           NOT NULL,
    "message"      TEXT           NOT NULL,
    "userId"       TEXT,
    "category"     "LogCategory"  NOT NULL,
    "metadata"     JSONB,
    "resourceType" TEXT,
    "resourceId"   TEXT,
    "oldValue"     JSONB,
    "newValue"     JSONB,
    "ipAddress"    TEXT,
    "userAgent"    TEXT,
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Log_category_idx"              ON "Log"("category");
CREATE INDEX IF NOT EXISTS "Log_userId_idx"                ON "Log"("userId");
CREATE INDEX IF NOT EXISTS "Log_createdAt_idx"             ON "Log"("createdAt");
CREATE INDEX IF NOT EXISTS "Log_action_idx"                ON "Log"("action");
CREATE INDEX IF NOT EXISTS "Log_resourceType_resourceId_idx" ON "Log"("resourceType", "resourceId");

-- ─── 7. Notification ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
    "id"         TEXT              NOT NULL,
    "userId"     TEXT              NOT NULL,
    "title"      TEXT              NOT NULL,
    "message"    TEXT              NOT NULL,
    "type"       "NotificationType" NOT NULL,
    "isRead"     BOOLEAN           NOT NULL DEFAULT false,
    "metadata"   JSONB,
    "targetRole" TEXT,
    "priority"   TEXT              NOT NULL DEFAULT 'normal',
    "createdAt"  TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_idx"     ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx"     ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"  ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_type_idx"       ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_targetRole_idx" ON "Notification"("targetRole");

-- ─── 8. HealthTip ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HealthTip" (
    "id"          TEXT        NOT NULL,
    "title"       TEXT        NOT NULL,
    "content"     TEXT        NOT NULL,
    "category"    TEXT,
    "isActive"    BOOLEAN     NOT NULL DEFAULT true,
    "publishDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate"  TIMESTAMP(3),
    "imageUrl"    TEXT,
    "createdBy"   TEXT        NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthTip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HealthTip_isActive_idx"     ON "HealthTip"("isActive");
CREATE INDEX IF NOT EXISTS "HealthTip_publishDate_idx"  ON "HealthTip"("publishDate");
CREATE INDEX IF NOT EXISTS "HealthTip_category_idx"     ON "HealthTip"("category");

-- ─── 9. Announcement ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id"          TEXT        NOT NULL,
    "title"       TEXT        NOT NULL,
    "message"     TEXT        NOT NULL,
    "type"        TEXT        NOT NULL DEFAULT 'info',
    "priority"    TEXT        NOT NULL DEFAULT 'normal',
    "targetRole"  TEXT,
    "isActive"    BOOLEAN     NOT NULL DEFAULT true,
    "publishDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate"  TIMESTAMP(3),
    "createdBy"   TEXT        NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx"     ON "Announcement"("isActive");
CREATE INDEX IF NOT EXISTS "Announcement_publishDate_idx"  ON "Announcement"("publishDate");
CREATE INDEX IF NOT EXISTS "Announcement_priority_idx"     ON "Announcement"("priority");
CREATE INDEX IF NOT EXISTS "Announcement_targetRole_idx"   ON "Announcement"("targetRole");

-- ─── 10. TwoFactorAuth ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TwoFactorAuth" (
    "id"          TEXT        NOT NULL,
    "userId"      TEXT        NOT NULL,
    "secret"      TEXT        NOT NULL,
    "isEnabled"   BOOLEAN     NOT NULL DEFAULT false,
    "backupCodes" TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "enabledAt"   TIMESTAMP(3),
    "lastUsedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "TwoFactorAuth"
    ADD CONSTRAINT "TwoFactorAuth_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TwoFactorAuth_userId_key"    ON "TwoFactorAuth"("userId");
CREATE INDEX        IF NOT EXISTS "TwoFactorAuth_userId_idx"    ON "TwoFactorAuth"("userId");
CREATE INDEX        IF NOT EXISTS "TwoFactorAuth_isEnabled_idx" ON "TwoFactorAuth"("isEnabled");
