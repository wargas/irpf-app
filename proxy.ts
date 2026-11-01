import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Only checks that a session cookie exists, so unauthenticated visitors skip
// rendering. Pages and actions validate the session through getCurrentUser.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/lancamentos", "/despesas", "/vinculos"],
};
