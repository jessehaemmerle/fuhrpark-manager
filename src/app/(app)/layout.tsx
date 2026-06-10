import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  if (user.role === "PLATFORM_ADMIN") redirect("/admin");
  return <AppShell user={user}>{children}</AppShell>;
}
