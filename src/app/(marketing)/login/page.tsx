import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Login"
};

export default function LoginPage() {
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
            <Link href="/register" className="font-semibold text-primary">
              Trial starten
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
