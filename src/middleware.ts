import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const protectedPrefixes = [
  "/dashboard",
  "/vehicles",
  "/bookings",
  "/calendar",
  "/trip-log",
  "/qr-workflows",
  "/maintenance",
  "/deadlines",
  "/costs",
  "/documents",
  "/compliance",
  "/damage-reports",
  "/handovers",
  "/notifications",
  "/users",
  "/invitations",
  "/departments",
  "/reports",
  "/subscription",
  "/settings",
  "/admin",
  "/set-password"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/bookings/:path*",
    "/calendar/:path*",
    "/trip-log/:path*",
    "/qr-workflows/:path*",
    "/maintenance/:path*",
    "/deadlines/:path*",
    "/costs/:path*",
    "/documents/:path*",
    "/compliance/:path*",
    "/damage-reports/:path*",
    "/handovers/:path*",
    "/notifications/:path*",
    "/users/:path*",
    "/invitations/:path*",
    "/departments/:path*",
    "/reports/:path*",
    "/subscription/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/set-password"
  ]
};
