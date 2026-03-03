import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/clear-cookies
 * Clears all Supabase auth cookies and redirects to /login.
 * Use this when hitting a 494 REQUEST_HEADER_TOO_LARGE error.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  // Delete all cookies whose name starts with "sb-" (Supabase auth cookies)
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase")) {
      response.cookies.delete(cookie.name);
    }
  });

  return response;
}
