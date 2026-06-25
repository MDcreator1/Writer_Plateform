DROP TABLE IF EXISTS "StudioSyncAttempt";
DROP TABLE IF EXISTS "StudioDraft";

ALTER TABLE "StudioProjectLink"
  DROP COLUMN IF EXISTS "syncStatus",
  DROP COLUMN IF EXISTS "lastSyncedRevision",
  DROP COLUMN IF EXISTS "lastContentHash",
  DROP COLUMN IF EXISTS "lastContentSnapshot",
  DROP COLUMN IF EXISTS "namingData",
  DROP COLUMN IF EXISTS "factsData",
  DROP COLUMN IF EXISTS "importedChapterCount",
  DROP COLUMN IF EXISTS "pendingDraftCount",
  DROP COLUMN IF EXISTS "lastSyncedAt",
  DROP COLUMN IF EXISTS "lastSyncError",
  DROP COLUMN IF EXISTS "resyncRequestedAt";

ALTER TABLE "Chapter"
  DROP COLUMN IF EXISTS "sourceRevision";

ALTER TABLE "StudioProjectFile"
  DROP COLUMN IF EXISTS "sourceRevision";

DROP TYPE IF EXISTS "StudioSyncStatus";
DROP TYPE IF EXISTS "StudioDraftKind";
