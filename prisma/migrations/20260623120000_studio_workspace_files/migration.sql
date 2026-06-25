ALTER TABLE "StudioProjectLink"
ADD COLUMN "workspaceFormatVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "workspaceMaterializedAt" TIMESTAMP(3);

CREATE TYPE "StudioFolderKind" AS ENUM ('CHAPTERS', 'DRAFTS', 'TRASH', 'EDITED_CHAPTER', 'CUSTOM');
CREATE TYPE "StudioFileKind" AS ENUM ('MANIFEST', 'NAMING_BOARD', 'DRAFT_INDEX', 'TRASH_DRAFT_INDEX', 'CHAPTER_REVISION_INDEX', 'CHAPTER_CONTENT', 'DRAFT_CONTENT', 'TRASH_DRAFT_CONTENT', 'CHAPTER_REVISION_CONTENT', 'OTHER_JSON', 'OTHER_TEXT');
CREATE TYPE "StudioFileFormat" AS ENUM ('JSON', 'TEXT');
CREATE TYPE "StudioFilePublicationState" AS ENUM ('PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'AUTHORING_ONLY');

CREATE TABLE "StudioProjectFolder" (
  "id" TEXT NOT NULL,
  "studioProjectId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "StudioFolderKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioProjectFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioProjectFile" (
  "id" TEXT NOT NULL,
  "studioProjectId" TEXT NOT NULL,
  "folderId" TEXT,
  "path" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "StudioFileKind" NOT NULL,
  "format" "StudioFileFormat" NOT NULL,
  "publicationState" "StudioFilePublicationState" NOT NULL DEFAULT 'AUTHORING_ONLY',
  "jsonContent" JSONB,
  "encryptedContent" TEXT,
  "contentNonce" TEXT,
  "contentAuthTag" TEXT,
  "contentHash" TEXT NOT NULL,
  "sourceRevision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioProjectFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioProjectFolder_studioProjectId_path_key" ON "StudioProjectFolder"("studioProjectId", "path");
CREATE INDEX "StudioProjectFolder_studioProjectId_kind_idx" ON "StudioProjectFolder"("studioProjectId", "kind");
CREATE UNIQUE INDEX "StudioProjectFile_studioProjectId_path_key" ON "StudioProjectFile"("studioProjectId", "path");
CREATE INDEX "StudioProjectFile_studioProjectId_kind_idx" ON "StudioProjectFile"("studioProjectId", "kind");
CREATE INDEX "StudioProjectFile_studioProjectId_publicationState_idx" ON "StudioProjectFile"("studioProjectId", "publicationState");

ALTER TABLE "StudioProjectFolder"
ADD CONSTRAINT "StudioProjectFolder_studioProjectId_fkey"
FOREIGN KEY ("studioProjectId") REFERENCES "StudioProjectLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioProjectFile"
ADD CONSTRAINT "StudioProjectFile_studioProjectId_fkey"
FOREIGN KEY ("studioProjectId") REFERENCES "StudioProjectLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioProjectFile"
ADD CONSTRAINT "StudioProjectFile_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "StudioProjectFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every database story receives one canonical Studio project package. Existing
-- Studio-linked projects keep their original project IDs, preventing duplicates.
INSERT INTO "StudioProjectLink" (
  "id", "projectId", "storyId", "projectTitle", "source", "syncStatus",
  "lastSyncedRevision", "importedChapterCount", "pendingDraftCount",
  "workspaceFormatVersion", "createdAt", "updatedAt"
)
SELECT
  'workspace-' || story."id",
  'platform-' || story."id",
  story."id",
  story."title",
  CASE WHEN story."origin" = 'STUDIO'::"StoryOrigin" THEN 'STUDIO'::"StudioProjectSource" ELSE 'PLATFORM'::"StudioProjectSource" END,
  'NEVER_SYNCED'::"StudioSyncStatus",
  0,
  0,
  0,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Story" story
WHERE NOT EXISTS (
  SELECT 1 FROM "StudioProjectLink" link WHERE link."storyId" = story."id"
);

-- Platform-created chapters need stable Studio document IDs so they can be
-- opened and edited through the same authoring model as Studio-created chapters.
UPDATE "Chapter"
SET "studioDocumentId" = 'platform-chapter-' || "id"
WHERE "studioDocumentId" IS NULL;

INSERT INTO "StudioProjectFolder" ("id", "studioProjectId", "path", "name", "kind", "createdAt", "updatedAt")
SELECT 'folder-chapters-' || link."id", link."id", 'Chapters', 'Chapters', 'CHAPTERS'::"StudioFolderKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudioProjectLink" link
ON CONFLICT ("studioProjectId", "path") DO NOTHING;

INSERT INTO "StudioProjectFolder" ("id", "studioProjectId", "path", "name", "kind", "createdAt", "updatedAt")
SELECT 'folder-drafts-' || link."id", link."id", 'Drafts', 'Drafts', 'DRAFTS'::"StudioFolderKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudioProjectLink" link
ON CONFLICT ("studioProjectId", "path") DO NOTHING;

INSERT INTO "StudioProjectFolder" ("id", "studioProjectId", "path", "name", "kind", "createdAt", "updatedAt")
SELECT 'folder-trash-' || link."id", link."id", 'Trash', 'Trash', 'TRASH'::"StudioFolderKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudioProjectLink" link
ON CONFLICT ("studioProjectId", "path") DO NOTHING;

INSERT INTO "StudioProjectFolder" ("id", "studioProjectId", "path", "name", "kind", "createdAt", "updatedAt")
SELECT 'folder-edited-' || link."id", link."id", 'Edited_Chapter', 'Edited_Chapter', 'EDITED_CHAPTER'::"StudioFolderKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "StudioProjectLink" link
ON CONFLICT ("studioProjectId", "path") DO NOTHING;