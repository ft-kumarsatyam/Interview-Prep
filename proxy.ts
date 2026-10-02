import { NextResponse, type NextRequest } from "next/server";
import { shouldRenew } from "@/lib/domain/session-policy";
import { renewSessionOn, SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Optimistic gate: bounce signed-out visitors to /login and signed-in ones away
 * from it. Real checks happen in requireSession() next to the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const response = NextResponse.next();
  if (shouldRenew(session, new Date())) await renewSessionOn(response);
  return response;
}

export const config = {
  // API routes authenticate themselves (session or CRON_SECRET); skip static assets, the service worker and the offline page.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline|splash/|.*\\.(?:png|svg|jpg|ico)$).*)",
  ],
};
