import { z } from "zod";
import {
  deleteStudioWorkspaceFile,
  listStudioWorkspace,
  readStudioWorkspaceFile,
  writeStudioWorkspaceFile
} from "@/lib/studio-workspace-service";
import {
  requireStudioAccess,
  StudioAccessError,
  studioJson,
  studioOptions
} from "@/lib/studio-integration";

const fileWriteSchema = z.object({
  path: z.string().trim().min(1).max(500),
  content: z.string().max(5_000_000)
});

export async function OPTIONS(request: Request) {
  return studioOptions(request);
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    await requireStudioAccess(request);
    const { projectId } = await context.params;
    const path = new URL(request.url).searchParams.get("path");
    if (!path) {
      const workspace = await listStudioWorkspace(projectId);
      if (!workspace) return studioJson(request, { code: "PROJECT_NOT_FOUND", message: "Studio project not found" }, 404);
      return studioJson(request, workspace);
    }
    const file = await readStudioWorkspaceFile(projectId, path);
    if (!file) return studioJson(request, { code: "FILE_NOT_FOUND", message: "Studio project file not found" }, 404);
    return studioJson(request, file);
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    return studioJson(request, { code: "FILE_READ_FAILED", message: error instanceof Error ? error.message : "Unable to read Studio file" }, 400);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    await requireStudioAccess(request);
    const { projectId } = await context.params;
    const body = fileWriteSchema.parse(await request.json());
    const file = await writeStudioWorkspaceFile(projectId, body.path, body.content);
    return studioJson(request, file);
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    if (error instanceof z.ZodError) {
      return studioJson(request, { code: "VALIDATION_ERROR", message: error.issues[0]?.message || "Invalid Studio file" }, 400);
    }
    return studioJson(request, { code: "FILE_WRITE_FAILED", message: error instanceof Error ? error.message : "Unable to write Studio file" }, 400);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    await requireStudioAccess(request);
    const { projectId } = await context.params;
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return studioJson(request, { code: "PATH_REQUIRED", message: "Studio file path is required" }, 400);
    const deleted = await deleteStudioWorkspaceFile(projectId, path);
    return studioJson(request, { path, deleted });
  } catch (error) {
    if (error instanceof StudioAccessError) {
      return studioJson(request, { code: "FORBIDDEN", message: error.message }, 403);
    }
    return studioJson(request, { code: "FILE_DELETE_FAILED", message: error instanceof Error ? error.message : "Unable to delete Studio file" }, 400);
  }
}