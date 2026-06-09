import Link from "next/link";
import { KeyRound, Shield } from "lucide-react";
import { LogoutButton } from "@/components/app/logout-button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["PLATFORM_ADMIN"]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white p-4 md:flex md:flex-col">
        <Link href="/admin" className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-950 text-white">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">Fleetbase Admin</p>
            <p className="text-xs text-muted-foreground">Plattformverwaltung</p>
          </div>
        </Link>
        <nav className="grid gap-1">
          <Link href="/admin" className="flex items-center gap-3 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" aria-hidden />
            Mandanten, Lizenzen & Zugänge
          </Link>
        </nav>
        <div className="mt-auto rounded-md border bg-zinc-50 p-3 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
      </aside>
      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Fleetbase Admin</p>
              <p className="truncate text-xs text-muted-foreground">Abgetrennter Super-Admin-Bereich</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="success">Super Admin</Badge>
              <LogoutButton />
            </div>
            <nav className="flex w-full gap-2 overflow-x-auto md:hidden">
              <Link href="/admin" className="whitespace-nowrap rounded-md bg-zinc-900 px-3 py-2 text-xs text-white">
                Plattformverwaltung
              </Link>
            </nav>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
