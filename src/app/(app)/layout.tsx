import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth";
import { countUnreadNotifications } from "@/lib/notifications";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  if (user.role === "PLATFORM_ADMIN") redirect("/admin");
  const unreadNotifications = await countUnreadNotifications(user.id);
  return (
    <AppShell user={user} unreadNotifications={unreadNotifications}>
      {children}
    </AppShell>
  );
}
