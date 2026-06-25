CREATE TYPE "StoryVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "StoryOrigin" AS ENUM ('PLATFORM', 'STUDIO');
CREATE TYPE "StudioProjectSource" AS ENUM ('PLATFORM', 'STUDIO');
CREATE TYPE "StudioSyncStatus" AS ENUM ('NEVER_SYNCED', 'SYNCING', 'SYNCED', 'ERROR', 'RESYNC_REQUESTED');
CREATE TYPE "StudioDraftKind" AS ENUM ('DRAFT', 'CHAPTER_REVISION');

ALTER TABLE "Story"
ADD COLUMN "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "defaultChapterCoinPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "visibility" "StoryVisibility" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "metadataVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "origin" "StoryOrigin" NOT NULL DEFAULT 'PLATFORM';

UPDATE "Story"
SET
  "genres" = ARRAY["genre"],
  "visibility" = CASE WHEN "published" THEN 'PUBLIC'::"StoryVisibility" ELSE 'PRIVATE'::"StoryVisibility" END,
  "publicationStatus" = CASE WHEN "published" THEN 'PUBLISHED'::"PublicationStatus" ELSE 'DRAFT'::"PublicationStatus" END;

ALTER TABLE "Chapter"
ADD COLUMN "studioDocumentId" TEXT,
ADD COLUMN "sourceRevision" INTEGER;

CREATE TABLE "StudioProjectLink" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "projectTitle" TEXT NOT NULL,
  "source" "StudioProjectSource" NOT NULL,
  "syncStatus" "StudioSyncStatus" NOT NULL DEFAULT 'NEVER_SYNCED',
  "lastSyncedRevision" INTEGER NOT NULL DEFAULT 0,
  "lastContentHash" TEXT,
  "lastContentSnapshot" JSONB,
  "namingData" JSONB,
  "factsData" JSONB,
  "importedChapterCount" INTEGER NOT NULL DEFAULT 0,
  "pendingDraftCount" INTEGER NOT NULL DEFAULT 0,
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncError" TEXT,
  "resyncRequestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioProjectLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioDraft" (
  "id" TEXT NOT NULL,
  "studioProjectId" TEXT NOT NULL,
  "studioDraftId" TEXT NOT NULL,
  "kind" "StudioDraftKind" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "encryptedContent" TEXT NOT NULL,
  "contentNonce" TEXT NOT NULL,
  "contentAuthTag" TEXT NOT NULL,
  "sourceRevision" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioSyncAttempt" (
  "id" TEXT NOT NULL,
  "studioProjectId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" "StudioSyncStatus" NOT NULL,
  "contentHash" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioSyncAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioProjectLink_projectId_key" ON "StudioProjectLink"("projectId");
CREATE UNIQUE INDEX "StudioProjectLink_storyId_key" ON "StudioProjectLink"("storyId");
CREATE UNIQUE INDEX "Chapter_storyId_studioDocumentId_key" ON "Chapter"("storyId", "studioDocumentId");
CREATE UNIQUE INDEX "StudioDraft_studioProjectId_studioDraftId_key" ON "StudioDraft"("studioProjectId", "studioDraftId");
CREATE INDEX "StudioDraft_studioProjectId_kind_idx" ON "StudioDraft"("studioProjectId", "kind");
CREATE INDEX "StudioSyncAttempt_studioProjectId_createdAt_idx" ON "StudioSyncAttempt"("studioProjectId", "createdAt");

ALTER TABLE "StudioProjectLink"
ADD CONSTRAINT "StudioProjectLink_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioDraft"
ADD CONSTRAINT "StudioDraft_studioProjectId_fkey"
FOREIGN KEY ("studioProjectId") REFERENCES "StudioProjectLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioSyncAttempt"
ADD CONSTRAINT "StudioSyncAttempt_studioProjectId_fkey"
FOREIGN KEY ("studioProjectId") REFERENCES "StudioProjectLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;