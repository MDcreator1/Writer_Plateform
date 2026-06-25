import "server-only";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export class StudioAccessError extends Error {
  constructor() {
    super("Writing Studio integration access denied");
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function allowedStudioOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const configured = (process.env.STUDIO_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const developmentOrigins = process.env.NODE_ENV === "production"
    ? []
    : [
        "null",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
      ];

  return [...configured, ...developmentOrigins].includes(origin) ? origin : null;
}

export function studioCorsHeaders(request: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Vary: "Origin"
  });
  const origin = allowedStudioOrigin(request);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-Studio-Integration-Key");
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
  const configuredKey = process.env.STUDIO_INTEGRATION_KEY || "";
  const suppliedKey = request.headers.get("x-studio-integration-key") || "";
  if (configuredKey && suppliedKey && safeEqual(configuredKey, suppliedKey)) return;

  if (process.env.NODE_ENV !== "production" && allowedStudioOrigin(request)) return;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return;
  throw new StudioAccessError();
}