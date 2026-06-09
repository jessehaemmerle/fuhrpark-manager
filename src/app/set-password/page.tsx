import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthForPasswordChange } from "@/lib/auth";

export const metadata = {
  title: "Passwort setzen"
};

export default async function SetPasswordPage() {
  const user = await requireAuthForPasswordChange();

  if (!user.mustChangePassword) {
    redirect(user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Passwort setzen</CardTitle>
          <CardDescription>Angemeldet als {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
