import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Login"
};

function redirectPathForUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, next?: string) {
  if (user.mustChangePassword) return "/set-password";
  if (user.role === "PLATFORM_ADMIN") return "/admin";
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect(redirectPathForUser(user, searchParams?.next));

  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Einloggen</CardTitle>
          <CardDescription>Greifen Sie auf Ihr Fuhrpark-Dashboard zu.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-semibold text-primary">
              Passwort vergessen?
            </Link>
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link href="/contact" className="font-semibold text-primary">
              Vertrieb kontaktieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
