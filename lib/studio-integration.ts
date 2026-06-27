import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export class StudioAccessError extends Error {
  constructor() {
    super("Writing Studio integration access denied");
  }
}

export function studioCorsHeaders(request: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Vary: "Origin"
  });
  const origin = request.headers.get("origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return headers;
}

export function studioJson<T>(request: Request, data: T, status = 200) {
  return NextResponse.json({ ok: status < 400, ...(status < 400 ? { data } : { error: data }) }, {
    status,
    headers: studioCorsHeaders(request)
  });
}

export function studioOptions(request: Request) {
  return new NextResponse(null, { status: 204, headers: studioCorsHeaders(request) });
}

export async function requireStudioAccess(request: Request) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return;
  throw new StudioAccessError();
}