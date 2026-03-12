-- Add SOS_ALERT value to NotificationType enum
-- This replaces SOS_UPDATE for pharmacy-targeted emergency broadcasts,
-- while SOS_UPDATE is retained for patient-facing SOS status changes.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOS_ALERT';
