import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Registrieren"
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/set-password" : user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");

  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>14 Tage kostenlos testen</CardTitle>
          <CardDescription>Erstellen Sie Ihre Firma und starten Sie direkt mit dem OWNER-Konto.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-5 text-sm text-muted-foreground">
            Bereits registriert?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Einloggen
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
