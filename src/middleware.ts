import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const protectedPrefixes = [
  "/dashboard",
  "/vehicles",
  "/bookings",
  "/trip-log",
  "/qr-workflows",
  "/maintenance",
  "/damage-reports",
  "/handovers",
  "/users",
  "/departments",
  "/reports",
  "/subscription",
  "/settings",
  "/admin"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/bookings/:path*",
    "/trip-log/:path*",
    "/qr-workflows/:path*",
    "/maintenance/:path*",
    "/damage-reports/:path*",
    "/handovers/:path*",
    "/users/:path*",
    "/departments/:path*",
    "/reports/:path*",
    "/subscription/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register"
  ]
};
