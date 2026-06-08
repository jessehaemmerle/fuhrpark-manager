import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Registrieren"
};

export default function RegisterPage() {
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
