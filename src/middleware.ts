import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Default-deny edge middleware.
 *
 * Allowed without a session:
 *   - /api/auth/*  (NextAuth handlers)
 *   - /sign-in     (the only unauthenticated page)
 *
 * Everything else (pages, server-action POSTs, API routes) requires an authenticated
 * session whose email is on AUTH_ALLOWED_EMAILS — enforced inside auth() via callbacks.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  const isAuthApi = pathname.startsWith("/api/auth");
  const isSignInPage = pathname === "/sign-in";
  if (isAuthApi || isSignInPage) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Run on every route except Next internals and static assets.
   * Server actions are POSTs to page URLs — they hit this middleware too.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff2?|ttf|webp|map)).*)"
  ]
};
