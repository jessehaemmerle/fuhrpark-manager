import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Passwort vergessen"
};

export default function ForgotPasswordPage() {
  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Passwort vergessen</CardTitle>
          <CardDescription>Fordern Sie einen Link zum Zuruecksetzen an.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
          <p className="mt-5 text-sm text-muted-foreground">
            Passwort wieder da?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Einloggen
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
