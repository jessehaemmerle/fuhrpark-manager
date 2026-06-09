import Link from "next/link";
import { Car } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { AppNavigation } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { QuickActions } from "@/components/app/quick-actions";
import { Badge } from "@/components/ui/badge";
import { type AuthenticatedUser, isFleetAdmin } from "@/lib/auth";
import { roleLabels, tierLabels } from "@/lib/labels";

export function AppShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
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
