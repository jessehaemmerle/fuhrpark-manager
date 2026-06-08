import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  Car,
  ClipboardList,
  Gauge,
  Home,
  QrCode,
  Settings,
  Shield,
  Users,
  Wrench
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { LogoutButton } from "@/components/app/logout-button";
import { Badge } from "@/components/ui/badge";
import { type AuthenticatedUser, isFleetAdmin } from "@/lib/auth";
import { roleLabels, tierLabels } from "@/lib/labels";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/vehicles", label: "Fahrzeuge", icon: Car, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/bookings", label: "Buchungen", icon: CalendarCheck, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/trip-log", label: "Fahrtenbuch", icon: Gauge, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/qr-workflows", label: "QR Workflows", icon: QrCode, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/maintenance", label: "Wartung", icon: Wrench, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/damage-reports", label: "Schaeden", icon: AlertTriangle, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/handovers", label: "Uebergaben", icon: ClipboardList, roles: ["USER", "FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/users", label: "Nutzer", icon: Users, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/departments", label: "Abteilungen", icon: Building2, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["FLEET_MANAGER", "OWNER", "PLATFORM_ADMIN"] },
  { href: "/subscription", label: "Abo & Nutzung", icon: Shield, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/settings", label: "Einstellungen", icon: Settings, roles: ["OWNER", "PLATFORM_ADMIN"] },
  { href: "/admin", label: "Platform Admin", icon: Shield, roles: ["PLATFORM_ADMIN"] }
] as const;

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
  const trialDaysLeft = differenceInCalendarDays(user.company.trialEndDate, new Date());
  const visibleNav = navItems.filter((item) => (item.roles as readonly string[]).includes(user.role));

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white p-4 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: user.company.primaryBrandColor }}
          >
            <Car className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">{user.company.name}</p>
            <p className="text-xs text-muted-foreground">{tierLabels[user.company.subscriptionTier]}</p>
          </div>
        </Link>
        <nav className="grid gap-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-md border bg-zinc-50 p-3 text-sm">
          <p className="font-medium">Trial Status</p>
          <p className="mt-1 text-muted-foreground">
            {trialDaysLeft >= 0 ? `${trialDaysLeft} Tage verbleibend` : "Trial abgelaufen"}
          </p>
        </div>
      </aside>
      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.company.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabels[user.role]} · {user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFleetAdmin(user.role) ? <Badge tone="success">Managerzugriff</Badge> : <Badge>Nutzer</Badge>}
              <LogoutButton />
            </div>
            <nav className="flex w-full gap-2 overflow-x-auto md:hidden">
              {visibleNav.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md bg-zinc-100 px-3 py-2 text-xs">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
