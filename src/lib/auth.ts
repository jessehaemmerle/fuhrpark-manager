import "server-only";

import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type SubscriptionTier, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

const SESSION_DAYS = 14;

export type AuthenticatedUser = {
  id: string;
  companyId: string;
  departmentId: string | null;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  driverApproved: boolean;
  driverBlocked: boolean;
  licenseValidUntil: Date | null;
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryBrandColor: string;
    subscriptionTier: SubscriptionTier;
    trialEndDate: Date;
    active: boolean;
  };
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET muss in Produktion gesetzt sein.");
  }
  return new TextEncoder().encode(secret ?? "development-only-secret-change-me-please");
}

function secureSessionCookie() {
  const configured = process.env.SESSION_COOKIE_SECURE?.toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      return new URL(appUrl).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }

  return process.env.NODE_ENV === "production";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(user: { id: string; companyId: string; role: UserRole }) {
  return new SignJWT({ companyId: user.companyId, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  const result = await jwtVerify(token, getJwtSecret());
  return {
    userId: result.payload.sub,
    companyId: result.payload.companyId as string | undefined,
    role: result.payload.role as UserRole | undefined
  };
}

export async function setSessionCookie(user: { id: string; companyId: string; role: UserRole }) {
  const token = await signSession(user);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureSessionCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureSessionCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await verifySessionToken(token);
    if (!session.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        driverApproved: true,
        driverBlocked: true,
        licenseValidUntil: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryBrandColor: true,
            subscriptionTier: true,
            trialEndDate: true,
            active: true
          }
        }
      }
    });

    if (!user?.active) return null;
    if (!user.company.active && user.role !== "PLATFORM_ADMIN") return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/set-password");
  return user;
}

export async function requireAuthForPasswordChange() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentCompanyId() {
  const user = await requireAuth();
  return user.companyId;
}

export function hasRole(user: AuthenticatedUser, roles: UserRole[]) {
  return roles.includes(user.role);
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!hasRole(user, roles)) {
    redirect("/dashboard");
  }
  return user;
}

export function requireCompanyScope(user: AuthenticatedUser, companyId: string) {
  if (user.role === "PLATFORM_ADMIN") return;
  if (user.companyId !== companyId) {
    throw new Error("Kein Zugriff auf Daten eines anderen Mandanten.");
  }
}

export function assertTenantAccess(user: AuthenticatedUser, entityCompanyId: string) {
  requireCompanyScope(user, entityCompanyId);
}

export function isFleetAdmin(role: UserRole) {
  return role === "OWNER" || role === "FLEET_MANAGER" || role === "PLATFORM_ADMIN";
}

export function requireFleetAdmin(user: AuthenticatedUser) {
  if (!isFleetAdmin(user.role)) {
    throw new Error("Diese Aktion ist Fuhrparkverantwortlichen vorbehalten.");
  }
}

export function requireOwner(user: AuthenticatedUser) {
  if (user.role !== "OWNER" && user.role !== "PLATFORM_ADMIN") {
    throw new Error("Diese Aktion ist Inhabern vorbehalten.");
  }
}

export function ensureDriverAllowed(user: Pick<AuthenticatedUser, "driverBlocked" | "driverApproved" | "licenseValidUntil">) {
  if (user.driverBlocked) {
    throw new Error("Der Fahrer ist gesperrt und kann keine Buchungen oder Fahrten starten.");
  }
  if (!user.driverApproved) {
    throw new Error("Die Fahrerfreigabe fehlt. Bitte Fuhrparkmanagement kontaktieren.");
  }
  if (user.licenseValidUntil && user.licenseValidUntil < new Date()) {
    throw new Error("Die Fahrerlaubnis ist abgelaufen.");
  }
}

export function getTrialEndDate() {
  return addDays(new Date(), 14);
}
