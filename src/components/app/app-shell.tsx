import Link from "next/link";
import { Bell, Car } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { AppNavigation } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { QuickActions } from "@/components/app/quick-actions";
import { Badge } from "@/components/ui/badge";
import { type AuthenticatedUser, isFleetAdmin } from "@/lib/auth";
import { roleLabels, tierLabels } from "@/lib/labels";

export function AppShell({
  user,
  unreadNotifications = 0,
  children
}: {
  user: AuthenticatedUser;
  unreadNotifications?: number;
  children: React.ReactNode;
}) {
  const trialDaysLeft = differenceInCalendarDays(user.company.trialEndDate, new Date());

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
        <AppNavigation role={user.role} variant="desktop" />
        <div className="mt-auto rounded-md border bg-zinc-50 p-3 text-sm">
          <p className="font-medium">Abo-Status</p>
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
              <Link
                href="/notifications"
                aria-label={`Benachrichtigungen${unreadNotifications > 0 ? ` (${unreadNotifications} ungelesen)` : ""}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-md border bg-white text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Bell className="h-4 w-4" aria-hidden />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <LogoutButton />
            </div>
            <QuickActions role={user.role} />
            <AppNavigation role={user.role} variant="mobile" />
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
