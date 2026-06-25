"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Car,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  QrCode,
  Receipt,
  Settings,
  Shield,
  UserPlus,
  Users,
  Wrench
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/vehicles", label: "Fahrzeuge", icon: Car, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/bookings", label: "Buchungen", icon: CalendarCheck, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/calendar", label: "Kalender", icon: CalendarDays, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/trip-log", label: "Fahrtenbuch", icon: Gauge, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/qr-workflows", label: "QR-Workflows", icon: QrCode, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/maintenance", label: "Wartung", icon: Wrench, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/deadlines", label: "Termine & Fristen", icon: CalendarClock, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/costs", label: "Kosten", icon: Receipt, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/documents", label: "Dokumente", icon: FileText, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/compliance", label: "Führerscheinkontrolle", icon: BadgeCheck, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/damage-reports", label: "Schäden", icon: AlertTriangle, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/handovers", label: "Übergaben", icon: ClipboardList, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/notifications", label: "Benachrichtigungen", icon: Bell, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/users", label: "Nutzer", icon: Users, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/invitations", label: "Einladungen", icon: UserPlus, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/departments", label: "Abteilungen", icon: Building2, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/subscription", label: "Abo & Nutzung", icon: Shield, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/settings", label: "Einstellungen", icon: Settings, roles: ["OWNER", "PLATFORM_ADMIN"] }
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ role, variant }: { role: string; variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const visibleNav = navItems.filter((item) => (item.roles as readonly string[]).includes(role));

  if (variant === "mobile") {
    return (
      <nav className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Bereichsnavigation">
        {visibleNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-zinc-100 text-zinc-700"
              )}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="grid gap-1" aria-label="Hauptnavigation">
      {visibleNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-zinc-700 hover:bg-zinc-100"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
