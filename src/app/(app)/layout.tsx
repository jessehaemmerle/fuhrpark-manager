import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  return <AppShell user={user}>{children}</AppShell>;
}
