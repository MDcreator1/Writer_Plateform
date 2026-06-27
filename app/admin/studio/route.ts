import { readFileSync } from "fs";
import { resolve } from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  // Check authorization
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || searchParams.get("platformProjectId");

  if (!projectId) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Load the HTML file from Writer_studio directory
  const filePath = resolve(process.cwd(), "Writer_studio/story-novel-project-editor.html");
  let html = readFileSync(filePath, "utf8");

  // Adjust relative paths to absolute root paths for assets
  html = html.replaceAll('href="assets/', 'href="/assets/');
  html = html.replaceAll('src="assets/', 'src="/assets/');

  // Adjust internal links to point to the new native Next.js paths
  html = html.replaceAll('href="story-novel-project-editor.html"', 'href="/admin/studio"');
  
  // Update Project Details button navigation to remain on Next.js route & preserve query params
  html = html.replaceAll(
    "'project-details.html'",
    "'/admin/studio/project-details' + window.location.search"
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate"
    }
  });
}
