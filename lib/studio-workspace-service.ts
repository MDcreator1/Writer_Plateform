import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import {
  Prisma,
  StudioFileFormat,
  StudioFileKind,
  StudioFilePublicationState,
  StudioFolderKind,
  StudioProjectSource
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { studioContentToReviewText } from "@/lib/studio-content-renderer";

function workspaceEncryptionKey() {
  return createHash("sha256").update(process.env.AUTH_SECRET || "dev-key").digest();
}

function encryptProjectedChapterContent(plainText: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", workspaceEncryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return {
    encryptedContent: encrypted.toString("base64"),
    contentNonce: nonce.toString("base64"),
    contentAuthTag: cipher.getAuthTag().toString("base64")
  };
}

function encryptWorkspaceContent(plainText: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", workspaceEncryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return {
    encryptedContent: encrypted.toString("base64"),
    contentNonce: nonce.toString("base64"),
    contentAuthTag: cipher.getAuthTag().toString("base64")
  };
}

function decryptWorkspaceContent(encryptedContent: string, contentNonce: string, contentAuthTag: string) {
  const decipher = createDecipheriv("aes-256-gcm", workspaceEncryptionKey(), Buffer.from(contentNonce, "base64"));
  decipher.setAuthTag(Buffer.from(contentAuthTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedContent, "base64")),
    decipher.final()
  ]).toString("utf8");
}

function workspaceHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export const STUDIO_WORKSPACE_FORMAT_VERSION = 1;
export const STUDIO_MANIFEST_PATH = "Chapters_info.json";
export const STUDIO_NAMING_PATH = "Story_Naming.json";
export const STUDIO_DRAFTS_PATH = "Story_Drafts.json";
export const STUDIO_TRASH_DRAFTS_PATH = "Trash/Trash_Drafts.json";
export const STUDIO_CHAPTER_REVISIONS_PATH = "Temp_Chapter_Draft.json";

const REQUIRED_FOLDERS = [
  { path: "Chapters", name: "Chapters", kind: StudioFolderKind.CHAPTERS },
  { path: "Drafts", name: "Drafts", kind: StudioFolderKind.DRAFTS },
  { path: "Trash", name: "Trash", kind: StudioFolderKind.TRASH },
  { path: "Edited_Chapter", name: "Edited_Chapter", kind: StudioFolderKind.EDITED_CHAPTER }
] as const;

const DEFAULT_NAMING_DATA = {
  categories: [
    { id: "characters", title: "Character Names", color: "char", info: "", shortcut: "" },
    { id: "places", title: "Place Names", color: "place", info: "", shortcut: "" },
    { id: "objects", title: "Objects / Items", color: "thing", info: "", shortcut: "" },
    { id: "groups", title: "Groups / Families", color: "other", info: "", shortcut: "" }
  ],
  removedCategoryIds: [],
  hiddenByChapter: {},
  visibleByChapter: {},
  detectedByChapter: {},
  entries: []
};

type WorkspaceDb = typeof prisma | Prisma.TransactionClient;

type WorkspaceWriteOptions = {
  publicationState?: StudioFilePublicationState;
  refreshProjection?: boolean;
};

type StoredFile = {
  format: StudioFileFormat;
  jsonContent: Prisma.JsonValue | null;
  encryptedContent: string | null;
  contentNonce: string | null;
  contentAuthTag: string | null;
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function normalizeStudioWorkspacePath(input: string) {
  const path = String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid Studio workspace path");
  }
  if (path.length > 500) throw new Error("Studio workspace path is too long");
  return path;
}

function parentFolderPath(path: string) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function folderKind(path: string) {
  if (path === "Chapters") return StudioFolderKind.CHAPTERS;
  if (path === "Drafts") return StudioFolderKind.DRAFTS;
  if (path === "Trash") return StudioFolderKind.TRASH;
  if (path === "Edited_Chapter") return StudioFolderKind.EDITED_CHAPTER;
  return StudioFolderKind.CUSTOM;
}

function classifyFile(path: string) {
  if (path === STUDIO_MANIFEST_PATH) return { kind: StudioFileKind.MANIFEST, format: StudioFileFormat.JSON };
  if (path === STUDIO_NAMING_PATH) return { kind: StudioFileKind.NAMING_BOARD, format: StudioFileFormat.JSON };
  if (path === STUDIO_DRAFTS_PATH) return { kind: StudioFileKind.DRAFT_INDEX, format: StudioFileFormat.JSON };
  if (path === STUDIO_TRASH_DRAFTS_PATH) return { kind: StudioFileKind.TRASH_DRAFT_INDEX, format: StudioFileFormat.JSON };
  if (path === STUDIO_CHAPTER_REVISIONS_PATH) return { kind: StudioFileKind.CHAPTER_REVISION_INDEX, format: StudioFileFormat.JSON };
  if (path.startsWith("Chapters/")) return { kind: StudioFileKind.CHAPTER_CONTENT, format: StudioFileFormat.TEXT };
  if (path.startsWith("Drafts/")) return { kind: StudioFileKind.DRAFT_CONTENT, format: StudioFileFormat.TEXT };
  if (path.startsWith("Trash/")) return path.endsWith(".json")
    ? { kind: StudioFileKind.OTHER_JSON, format: StudioFileFormat.JSON }
    : { kind: StudioFileKind.TRASH_DRAFT_CONTENT, format: StudioFileFormat.TEXT };
  if (path.startsWith("Edited_Chapter/")) return { kind: StudioFileKind.CHAPTER_REVISION_CONTENT, format: StudioFileFormat.TEXT };
  return path.toLowerCase().endsWith(".json")
    ? { kind: StudioFileKind.OTHER_JSON, format: StudioFileFormat.JSON }
    : { kind: StudioFileKind.OTHER_TEXT, format: StudioFileFormat.TEXT };
}

async function ensureFolder(db: WorkspaceDb, studioProjectId: string, path: string) {
  if (!path) return null;
  const normalized = normalizeStudioWorkspacePath(path);
  const parts = normalized.split("/");
  let current = "";
  let folder = null;
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    folder = await db.studioProjectFolder.upsert({
      where: { studioProjectId_path: { studioProjectId, path: current } },
      create: { studioProjectId, path: current, name: part, kind: folderKind(current) },
      update: { name: part, kind: folderKind(current) }
    });
  }
  return folder;
}

async function managedManifest(projectId: string, incoming: unknown, db: WorkspaceDb) {
  const link = await db.studioProjectLink.findUnique({
    where: { projectId },
    include: { story: { select: { id: true, title: true, published: true, createdAt: true } } }
  });
  if (!link) throw new Error("Studio project is not linked to a platform story");

  const source = incoming && typeof incoming === "object" ? incoming as Record<string, unknown> : {};
  const oldIntegration = source.integration && typeof source.integration === "object"
    ? source.integration as Record<string, unknown>
    : {};
  const chapterStatuses = oldIntegration.chapterStatuses && typeof oldIntegration.chapterStatuses === "object"
    ? oldIntegration.chapterStatuses
    : {};

  return {
    ...source,
    title: link.story.title,
    type: typeof source.type === "string" && ["novel", "story"].includes(source.type) ? source.type : "novel",
    author: "",
    language: source.language === "hi" ? "hi" : "en",
    synopsis: "",
    createdAt: typeof source.createdAt === "string" ? source.createdAt : link.story.createdAt.toISOString(),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
    integration: {
      mode: "managed",
      projectId: link.projectId,
      storyId: link.storyId,
      source: link.source,
      linkedAt: oldIntegration.linkedAt || link.createdAt.toISOString(),
      chapterStatuses,
      published: link.story.published
    },
    facts: Array.isArray(source.facts) ? source.facts : [],
    chapters: Array.isArray(source.chapters) ? source.chapters : [],
    parts: Array.isArray(source.parts) ? source.parts : []
  };
}

async function storedContent(file: StoredFile | null) {
  if (!file) return null;
  if (file.format === StudioFileFormat.JSON) return JSON.stringify(file.jsonContent ?? null, null, 2);
  if (file.encryptedContent && file.contentNonce && file.contentAuthTag) {
    return decryptWorkspaceContent(file.encryptedContent, file.contentNonce, file.contentAuthTag);
  }
  return "";
}

async function findWorkspaceFile(projectId: string, path: string) {
  return prisma.studioProjectFile.findFirst({
    where: { path, studioProject: { projectId } },
    select: {
      format: true,
      jsonContent: true,
      encryptedContent: true,
      contentNonce: true,
      contentAuthTag: true
    }
  });
}

function flattenManifestChapters(manifest: Record<string, unknown>) {
  const result: Array<Record<string, unknown>> = [];
  const add = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) if (item && typeof item === "object") result.push(item as Record<string, unknown>);
  };
  add(manifest.chapters);
  if (Array.isArray(manifest.parts)) {
    for (const part of manifest.parts) {
      if (part && typeof part === "object") add((part as Record<string, unknown>).chapters);
    }
  }
  return result;
}

function studioDocumentId(document: Record<string, unknown>, index: number, prefix: string) {
  const contentPath = String(document.contentPath || document.content_path || "").trim();
  return String(document.id || document.no || contentPath || `${prefix}-${index + 1}`).trim();
}

function studioContentPath(document: Record<string, unknown>, index: number, folder: "Chapters" | "Drafts" | "Trash") {
  const stem = folder === "Chapters" ? "chapter" : "draft";
  return String(
    document.contentPath ||
    document.content_path ||
    `${folder}/${stem}_${String(index + 1).padStart(2, "0")}.txt`
  ).replace(/\\/g, "/");
}

function parseDocumentIndex(value: string | null) {
  if (!value) return [] as Array<Record<string, unknown>>;
  try {
    const parsed = JSON.parse(value) as unknown;
    const items: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).drafts)
        ? (parsed as Record<string, unknown>).drafts as unknown[]
        : [];
    return items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  } catch {
    return [] as Array<Record<string, unknown>>;
  }
}

type ProjectedStudioDocument = {
  document: Record<string, unknown>;
  studioDocumentId: string;
  path: string;
  status: "PUBLISHED" | "DRAFT" | "TRASH";
  number: number;
};

export async function refreshStoryProjectionFromStudioWorkspace(projectId: string) {
  const link = await prisma.studioProjectLink.findUnique({
    where: { projectId },
    include: { story: { select: { id: true, defaultChapterCoinPrice: true } } }
  });
  if (!link) return null;

  const [manifestText, draftsText, trashText] = await Promise.all([
    findWorkspaceFile(projectId, STUDIO_MANIFEST_PATH).then(storedContent),
    findWorkspaceFile(projectId, STUDIO_DRAFTS_PATH).then(storedContent),
    findWorkspaceFile(projectId, STUDIO_TRASH_DRAFTS_PATH).then(storedContent)
  ]);
  if (!manifestText) return null;

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestText) as Record<string, unknown>;
  } catch {
    return null;
  }

  const publishedDocuments: ProjectedStudioDocument[] = flattenManifestChapters(manifest).map((document, index) => ({
    document,
    studioDocumentId: studioDocumentId(document, index, "chapter"),
    path: studioContentPath(document, index, "Chapters"),
    status: "PUBLISHED",
    number: index + 1
  }));
  const draftDocuments: ProjectedStudioDocument[] = parseDocumentIndex(draftsText).map((document, index) => ({
    document,
    studioDocumentId: studioDocumentId(document, index, "draft"),
    path: studioContentPath(document, index, "Drafts"),
    status: "DRAFT",
    number: 10000 + index + 1
  }));
  const trashDocuments: ProjectedStudioDocument[] = parseDocumentIndex(trashText).map((document, index) => ({
    document,
    studioDocumentId: studioDocumentId(document, index, "trash"),
    path: studioContentPath(document, index, "Trash"),
    status: "TRASH",
    number: 20000 + index + 1
  }));
  const projectedDocuments = [...publishedDocuments, ...draftDocuments, ...trashDocuments];
  const documentIds = [...new Set(projectedDocuments.map((item) => item.studioDocumentId))];

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Chapter"
      SET "number" = -ABS("number") - 1000000
      WHERE "storyId" = ${link.storyId} AND "studioDocumentId" IS NOT NULL
    `;

    for (const item of projectedDocuments) {
      const textFile = await tx.studioProjectFile.findFirst({
        where: { path: item.path, studioProjectId: link.id },
        select: { format: true, jsonContent: true, encryptedContent: true, contentNonce: true, contentAuthTag: true }
      });
      const fileText = await storedContent(textFile);
      const content = fileText ?? String(item.document.contentHTML || item.document.content || "");
      const reviewContent = studioContentToReviewText(content);
      const encrypted = encryptProjectedChapterContent(reviewContent);
      const title = String(item.document.title || `${item.status === "PUBLISHED" ? "Chapter" : "Draft"} ${item.number}`).trim();
      const isFree = Boolean(item.document.isFree);
      const publishedAt = item.status === "PUBLISHED" ? new Date() : null;

      await tx.chapter.upsert({
        where: { storyId_studioDocumentId: { storyId: link.storyId, studioDocumentId: item.studioDocumentId } },
        create: {
          storyId: link.storyId,
          studioDocumentId: item.studioDocumentId,
          number: item.number,
          title,
          status: item.status,
          isFree,
          coinPrice: isFree ? 0 : Number(item.document.coinPrice) || link.story.defaultChapterCoinPrice,
          excerpt: reviewContent.slice(0, 300) || null,
          publishedAt,
          ...encrypted
        },
        update: {
          number: item.number,
          title,
          status: item.status,
          isFree,
          coinPrice: isFree ? 0 : Number(item.document.coinPrice) || link.story.defaultChapterCoinPrice,
          excerpt: reviewContent.slice(0, 300) || null,
          publishedAt,
          ...encrypted
        }
      });
    }

    const missingDocuments = await tx.chapter.findMany({
      where: {
        storyId: link.storyId,
        studioDocumentId: documentIds.length ? { not: null, notIn: documentIds } : { not: null }
      },
      select: {
        id: true,
        _count: {
          select: {
            bookmarks: true,
            comments: true,
            purchases: true,
            ratings: true,
            readingHistory: true,
            readingSessions: true,
            unlockEvents: true
          }
        }
      }
    });
    let retainedTrashIndex = trashDocuments.length;
    for (const missing of missingDocuments) {
      const hasReaderActivity = Object.values(missing._count).some((count) => count > 0);
      if (!hasReaderActivity) {
        await tx.chapter.delete({ where: { id: missing.id } });
        continue;
      }
      retainedTrashIndex += 1;
      await tx.chapter.update({
        where: { id: missing.id },
        data: { status: "TRASH", number: 20000 + retainedTrashIndex, publishedAt: null }
      });
    }
  }, { timeout: 30_000 });

  return {
    projectId,
    storyId: link.storyId,
    published: publishedDocuments.length,
    drafts: draftDocuments.length,
    trash: trashDocuments.length
  };
}

export async function writeStudioWorkspaceFile(
  projectId: string,
  rawPath: string,
  content: string,
  options: WorkspaceWriteOptions = {},
  db: WorkspaceDb = prisma
) {
  const path = normalizeStudioWorkspacePath(rawPath);
  const link = await db.studioProjectLink.findUnique({ where: { projectId }, select: { id: true } });
  if (!link) throw new Error("Studio project is not linked to a platform story");
  const { kind, format } = classifyFile(path);
  const folder = await ensureFolder(db, link.id, parentFolderPath(path));
  let jsonContent: Prisma.InputJsonValue | Prisma.NullTypes.DbNull = Prisma.DbNull;
  let encrypted: ReturnType<typeof encryptWorkspaceContent> | null = null;
  let normalizedContent = String(content ?? "");

  if (format === StudioFileFormat.JSON) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(normalizedContent || "null");
    } catch {
      throw new Error(`Invalid JSON in Studio file ${path}`);
    }
    if (path === STUDIO_MANIFEST_PATH) parsed = await managedManifest(projectId, parsed, db);
    jsonContent = jsonValue(parsed);
    normalizedContent = JSON.stringify(parsed, null, 2);
  } else {
    encrypted = encryptWorkspaceContent(normalizedContent);
  }

  const file = await db.studioProjectFile.upsert({
    where: { studioProjectId_path: { studioProjectId: link.id, path } },
    create: {
      studioProjectId: link.id,
      folderId: folder?.id || null,
      path,
      name: path.split("/").pop() || path,
      kind,
      format,
      publicationState: options.publicationState || StudioFilePublicationState.AUTHORING_ONLY,
      jsonContent,
      encryptedContent: encrypted?.encryptedContent || null,
      contentNonce: encrypted?.contentNonce || null,
      contentAuthTag: encrypted?.contentAuthTag || null,
      contentHash: workspaceHash(normalizedContent)
    },
    update: {
      folderId: folder?.id || null,
      name: path.split("/").pop() || path,
      kind,
      format,
      publicationState: options.publicationState || StudioFilePublicationState.AUTHORING_ONLY,
      jsonContent,
      encryptedContent: encrypted?.encryptedContent || null,
      contentNonce: encrypted?.contentNonce || null,
      contentAuthTag: encrypted?.contentAuthTag || null,
      contentHash: workspaceHash(normalizedContent)
    }
  });

  await db.studioProjectLink.update({
    where: { projectId },
    data: {
      workspaceFormatVersion: STUDIO_WORKSPACE_FORMAT_VERSION,
      workspaceMaterializedAt: new Date()
    }
  });

  if (db === prisma && options.refreshProjection !== false) {
    await refreshStoryProjectionFromStudioWorkspace(projectId);
  }

  return { path: file.path, hash: file.contentHash, updatedAt: file.updatedAt };
}

export async function readStudioWorkspaceFile(projectId: string, rawPath: string) {
  const path = normalizeStudioWorkspacePath(rawPath);
  const file = await prisma.studioProjectFile.findFirst({
    where: { path, studioProject: { projectId } }
  });
  if (!file) return null;
  const content = await storedContent(file);
  return {
    path: file.path,
    name: file.name,
    kind: file.kind,
    format: file.format,
    publicationState: file.publicationState,
    content: content ?? "",
    hash: file.contentHash,
    updatedAt: file.updatedAt
  };
}

export async function listStudioWorkspace(projectId: string) {
  return prisma.studioProjectLink.findUnique({
    where: { projectId },
    select: {
      storyId: true,
      projectId: true,
      workspaceFormatVersion: true,
      workspaceMaterializedAt: true,
      story: { select: { title: true, published: true, publicationStatus: true } },
      folders: { select: { path: true, name: true, kind: true }, orderBy: { path: "asc" } },
      files: {
        select: { path: true, name: true, kind: true, format: true, publicationState: true, contentHash: true, updatedAt: true },
        orderBy: { path: "asc" }
      }
    }
  });
}

export async function deleteStudioWorkspaceFile(
  projectId: string,
  rawPath: string,
  options: { refreshProjection?: boolean } = {}
) {
  const path = normalizeStudioWorkspacePath(rawPath);
  const result = await prisma.studioProjectFile.deleteMany({ where: { path, studioProject: { projectId } } });
  if (options.refreshProjection !== false) await refreshStoryProjectionFromStudioWorkspace(projectId);
  return result.count > 0;
}

function defaultDocumentStyle() {
  return {
    alignment: "justify",
    lineHeight: null,
    paragraphGap: null,
    paragraphMargin: null,
    fontFamily: "'Lora',serif",
    fontSize: 16,
    editorSettings: null
  };
}

function publicationState(status: string) {
  if (status === "PUBLISHED") return StudioFilePublicationState.PUBLISHED;
  if (status === "TRASH") return StudioFilePublicationState.ARCHIVED;
  return StudioFilePublicationState.UNPUBLISHED;
}

function defaultDraft(createdAt: Date) {
  return {
    id: `draft-${createdAt.getTime()}`,
    title: "Draft 1",
    content: "",
    contentHTML: "",
    notes: [],
    contentPath: "Drafts/draft_01.txt",
    draftNo: 1,
    createdAt: createdAt.toISOString(),
    ...defaultDocumentStyle(),
    _wordCount: null
  };
}

export async function materializeStudioWorkspace(projectId: string) {
  const link = await prisma.studioProjectLink.findUnique({
    where: { projectId },
    include: { story: { include: { chapters: { orderBy: { number: "asc" } } } } }
  });
  if (!link) throw new Error("Studio project is not linked to a platform story");

  const makeDocument = (chapter: typeof link.story.chapters[number], index: number, status: "PUBLISHED" | "DRAFT" | "TRASH") => {
    const content = decryptWorkspaceContent(chapter.encryptedContent, chapter.contentNonce, chapter.contentAuthTag);
    const folder = status === "PUBLISHED" ? "Chapters" : status === "DRAFT" ? "Drafts" : "Trash";
    const stem = status === "PUBLISHED" ? "chapter" : "draft";
    const contentPath = `${folder}/${stem}_${String(index + 1).padStart(2, "0")}.txt`;
    return {
      record: chapter,
      content,
      contentPath,
      document: {
        id: chapter.studioDocumentId || `platform-document-${chapter.id}`,
        title: chapter.title,
        contentHTML: content,
        contentPath,
        createdAt: chapter.createdAt.toISOString(),
        platformStatus: status,
        ...(status === "PUBLISHED" ? { chapterNo: index + 1 } : { draftNo: index + 1 }),
        ...(status === "TRASH" ? { deletedAt: chapter.updatedAt.toISOString() } : {}),
        ...defaultDocumentStyle()
      }
    };
  };

  const published = link.story.chapters.filter((chapter) => chapter.status === "PUBLISHED").map((chapter, index) => makeDocument(chapter, index, "PUBLISHED"));
  const databaseDrafts = link.story.chapters.filter((chapter) => chapter.status === "DRAFT").map((chapter, index) => makeDocument(chapter, index, "DRAFT"));
  const trash = link.story.chapters.filter((chapter) => chapter.status === "TRASH").map((chapter, index) => makeDocument(chapter, index, "TRASH"));
  const drafts = databaseDrafts.length || published.length || trash.length
    ? databaseDrafts
    : [{ content: "", contentPath: "Drafts/draft_01.txt", document: defaultDraft(link.story.createdAt), record: null }];

  const manifest = {
    title: link.story.title,
    type: "novel",
    author: "",
    language: "en",
    synopsis: "",
    createdAt: link.story.createdAt.toISOString(),
    updatedAt: link.story.updatedAt.toISOString(),
    integration: {
      mode: "managed",
      projectId: link.projectId,
      storyId: link.storyId,
      source: link.source,
      linkedAt: link.createdAt.toISOString(),
      chapterStatuses: Object.fromEntries(published.map(({ document }) => [String(document.id), "PUBLISHED"])),
      published: link.story.published
    },
    facts: [],
    chapters: published.map(({ document }) => document),
    parts: []
  };

  await prisma.$transaction(async (tx) => {
    for (const folder of REQUIRED_FOLDERS) {
      await tx.studioProjectFolder.upsert({
        where: { studioProjectId_path: { studioProjectId: link.id, path: folder.path } },
        create: { studioProjectId: link.id, ...folder },
        update: { name: folder.name, kind: folder.kind }
      });
    }

    await writeStudioWorkspaceFile(projectId, STUDIO_MANIFEST_PATH, JSON.stringify(manifest), {
      refreshProjection: false,
      publicationState: link.story.published ? StudioFilePublicationState.PUBLISHED : StudioFilePublicationState.UNPUBLISHED
    }, tx);
    await writeStudioWorkspaceFile(projectId, STUDIO_NAMING_PATH, JSON.stringify(DEFAULT_NAMING_DATA), { refreshProjection: false }, tx);
    await writeStudioWorkspaceFile(projectId, STUDIO_DRAFTS_PATH, JSON.stringify({ drafts: drafts.map(({ document }) => document) }), { refreshProjection: false }, tx);
    await writeStudioWorkspaceFile(projectId, STUDIO_TRASH_DRAFTS_PATH, JSON.stringify({ drafts: trash.map(({ document }) => document) }), { refreshProjection: false }, tx);
    await writeStudioWorkspaceFile(projectId, STUDIO_CHAPTER_REVISIONS_PATH, JSON.stringify({ drafts: [] }), { refreshProjection: false }, tx);

    for (const item of [...published, ...drafts, ...trash]) {
      await writeStudioWorkspaceFile(projectId, item.contentPath, item.content, {
        refreshProjection: false,
        publicationState: item.record ? publicationState(item.record.status) : StudioFilePublicationState.UNPUBLISHED
      }, tx);
    }

    await tx.studioProjectLink.update({
      where: { id: link.id },
      data: {
        projectTitle: link.story.title,
        workspaceFormatVersion: STUDIO_WORKSPACE_FORMAT_VERSION,
        workspaceMaterializedAt: new Date()
      }
    });
  }, { timeout: 30_000 });

  await refreshStoryProjectionFromStudioWorkspace(projectId);
  return { projectId, storyId: link.storyId, files: 5 + published.length + drafts.length + trash.length };
}

export async function refreshStudioWorkspaceMetadata(projectId: string) {
  const existingManifest = await readStudioWorkspaceFile(projectId, STUDIO_MANIFEST_PATH);
  if (!existingManifest) return materializeStudioWorkspace(projectId);
  await writeStudioWorkspaceFile(projectId, STUDIO_MANIFEST_PATH, existingManifest.content, { refreshProjection: false });
  await refreshStoryProjectionFromStudioWorkspace(projectId);
  const link = await prisma.studioProjectLink.findUnique({
    where: { projectId },
    select: { story: { select: { title: true } } }
  });
  if (link) {
    await prisma.studioProjectLink.update({
      where: { projectId },
      data: { projectTitle: link.story.title, workspaceMaterializedAt: new Date() }
    });
  }
  return { projectId, refreshed: true };
}

export async function removeStudioChapterFromWorkspace(storyId: string, studioDocumentId: string | null) {
  if (!studioDocumentId) return;
  const link = await prisma.studioProjectLink.findUnique({ where: { storyId }, select: { projectId: true } });
  if (!link) return;

  const removedPaths = new Set<string>();
  const documentMatches = (record: Record<string, unknown>) =>
    String(record.id || record.no || record.contentPath || record.content_path || "") === studioDocumentId;
  const filterDocuments = (value: unknown) => Array.isArray(value)
    ? value.filter((item) => {
        if (!item || typeof item !== "object") return true;
        const record = item as Record<string, unknown>;
        const matches = documentMatches(record);
        if (matches) {
          const path = String(record.contentPath || record.content_path || "").trim();
          if (path) removedPaths.add(path);
        }
        return !matches;
      })
    : [];

  const manifestFile = await readStudioWorkspaceFile(link.projectId, STUDIO_MANIFEST_PATH);
  if (manifestFile) {
    const manifest = JSON.parse(manifestFile.content) as Record<string, unknown>;
    manifest.chapters = filterDocuments(manifest.chapters);
    if (Array.isArray(manifest.parts)) {
      manifest.parts = manifest.parts.map((part) => {
        if (!part || typeof part !== "object") return part;
        const record = part as Record<string, unknown>;
        return { ...record, chapters: filterDocuments(record.chapters) };
      });
    }
    if (manifest.integration && typeof manifest.integration === "object") {
      const integration = manifest.integration as Record<string, unknown>;
      const statuses = integration.chapterStatuses && typeof integration.chapterStatuses === "object"
        ? { ...integration.chapterStatuses as Record<string, unknown> }
        : {};
      delete statuses[studioDocumentId];
      integration.chapterStatuses = statuses;
    }
    await writeStudioWorkspaceFile(link.projectId, STUDIO_MANIFEST_PATH, JSON.stringify(manifest), { refreshProjection: false });
  }

  for (const indexPath of [STUDIO_DRAFTS_PATH, STUDIO_TRASH_DRAFTS_PATH]) {
    const indexFile = await readStudioWorkspaceFile(link.projectId, indexPath);
    if (!indexFile) continue;
    const parsed = JSON.parse(indexFile.content) as unknown;
    const drafts = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>).drafts
        : [];
    const filtered = filterDocuments(drafts);
    await writeStudioWorkspaceFile(link.projectId, indexPath, JSON.stringify({ drafts: filtered }), { refreshProjection: false });
  }

  for (const contentPath of removedPaths) {
    await deleteStudioWorkspaceFile(link.projectId, contentPath, { refreshProjection: false });
  }
  await refreshStoryProjectionFromStudioWorkspace(link.projectId);
}

export async function ensureStudioWorkspaceForStory(storyId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const story = await tx.story.findUnique({ where: { id: storyId }, select: { id: true, title: true, origin: true } });
    if (!story) throw new Error("Story not found");

    let existing = await tx.studioProjectLink.findUnique({
      where: { storyId: story.id },
      include: { _count: { select: { files: true } } }
    });
    if (!existing) {
      existing = await tx.studioProjectLink.create({
        data: {
          projectId: `platform-${story.id}`,
          storyId: story.id,
          projectTitle: story.title,
          source: story.origin === "STUDIO" ? StudioProjectSource.STUDIO : StudioProjectSource.PLATFORM
        },
        include: { _count: { select: { files: true } } }
      });
    } else if (existing.projectTitle !== story.title) {
      existing = await tx.studioProjectLink.update({
        where: { id: existing.id },
        data: { projectTitle: story.title },
        include: { _count: { select: { files: true } } }
      });
    }

    const chaptersWithoutDocumentId = await tx.chapter.findMany({
      where: { storyId: story.id, studioDocumentId: null },
      select: { id: true }
    });
    for (const chapter of chaptersWithoutDocumentId) {
      await tx.chapter.update({ where: { id: chapter.id }, data: { studioDocumentId: `platform-chapter-${chapter.id}` } });
    }
    return { link: existing, hasWorkspaceFiles: existing._count.files > 0 };
  });

  if (result.hasWorkspaceFiles) await refreshStudioWorkspaceMetadata(result.link.projectId);
  else await materializeStudioWorkspace(result.link.projectId);
  return result.link;
}

export async function saveStudioWorkspaceFiles(projectId: string, files: Array<{ path: string; content: string }>) {
  await prisma.$transaction(async (tx) => {
    for (const file of files) {
      await writeStudioWorkspaceFile(projectId, file.path, file.content, { refreshProjection: false }, tx);
    }
    await tx.studioProjectLink.update({
      where: { projectId },
      data: { workspaceFormatVersion: STUDIO_WORKSPACE_FORMAT_VERSION, workspaceMaterializedAt: new Date() }
    });
  }, { timeout: 30_000 });
  await refreshStoryProjectionFromStudioWorkspace(projectId);
}
