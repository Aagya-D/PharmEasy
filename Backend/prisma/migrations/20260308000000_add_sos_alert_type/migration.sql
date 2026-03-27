-- Add SOS_ALERT value to NotificationType enum when the enum exists.
-- In some shadow-db replay orders this migration runs before NotificationType
-- is created, so this must be a safe no-op in that scenario.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'NotificationType'
	) THEN
		EXECUTE 'ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS ''SOS_ALERT''';
	END IF;
END $$;
