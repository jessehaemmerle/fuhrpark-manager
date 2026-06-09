import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Passwort zuruecksetzen"
};

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const token = Array.isArray(searchParams.token) ? searchParams.token[0] ?? "" : searchParams.token ?? "";

  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Passwort zuruecksetzen</CardTitle>
          <CardDescription>Vergeben Sie ein neues Passwort fuer Ihr Konto.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
          <p className="mt-5 text-sm text-muted-foreground">
            Zurueck zum{" "}
            <Link href="/login" className="font-semibold text-primary">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
