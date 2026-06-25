import Link from "next/link";
import { acceptInvitation } from "@/server/invitation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabels } from "@/lib/labels";
import { hashPasswordToken } from "@/lib/password-tokens";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Einladung annehmen"
};

export default async function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash: hashPasswordToken(params.token), status: "PENDING", expiresAt: { gt: new Date() } },
    include: { company: true }
  });

  if (!invitation || !invitation.company.active) {
    return (
      <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Einladung ungültig</CardTitle>
            <CardDescription>Dieser Einladungslink ist abgelaufen, wurde zurückgezogen oder bereits verwendet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">Zum Login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Konto aktivieren</CardTitle>
          <CardDescription>
            Einladung zu {invitation.company.name} als {roleLabels[invitation.role]} ({invitation.email}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvitation} className="grid gap-4">
            <input type="hidden" name="token" value={params.token} />
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" defaultValue={invitation.name ?? ""} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
              <p className="text-xs text-muted-foreground">
                Mindestens 10 Zeichen mit Groß-, Kleinbuchstaben und einer Zahl.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
            </div>
            <Button>Konto aktivieren</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
