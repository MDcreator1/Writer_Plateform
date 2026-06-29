import { readFileSync } from "fs";
import { resolve } from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "WRITER")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const filePath = resolve(process.cwd(), "Writer_studio/project-details.html");
  let html = readFileSync(filePath, "utf8");
  html = html.replaceAll('href="assets/', 'href="/assets/');
  html = html.replaceAll('src="assets/', 'src="/assets/');

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString() ? "?" + searchParams.toString() : "";

  html = html.replaceAll('href="story-novel-project-editor.html"', `href="/writer/studio${queryString}"`);
  html = html.replaceAll(
    "'story-novel-project-editor.html'",
    "'/writer/studio' + window.location.search"
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate"
    }
  });
}
