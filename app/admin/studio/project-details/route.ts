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

  // Load the HTML file from Writer_studio directory
  const filePath = resolve(process.cwd(), "Writer_studio/project-details.html");
  let html = readFileSync(filePath, "utf8");

  // Adjust relative paths to absolute root paths for assets
  html = html.replaceAll('href="assets/', 'href="/assets/');
  html = html.replaceAll('src="assets/', 'src="/assets/');

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString() ? "?" + searchParams.toString() : "";

  // Adjust internal links to point back to the Next.js editor route & preserve query params
  html = html.replaceAll('href="story-novel-project-editor.html"', `href="/admin/studio${queryString}"`);
  html = html.replaceAll(
    "'story-novel-project-editor.html'",
    `'/admin/studio' + window.location.search`
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate"
    }
  });
}
