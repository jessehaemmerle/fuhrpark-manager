import { UserRole } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { createInvitation, revokeInvitation } from "@/server/invitation-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { requireAuth, requireOwner } from "@/lib/auth";
import { invitationStatusLabels, roleLabels, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Einladungen"
};

const tenantRoles = Object.values(UserRole).filter((role) => role !== UserRole.PLATFORM_ADMIN);

export default async function InvitationsPage({
  searchParams
}: {
  searchParams?: { invited?: string; inviteError?: string; link?: string };
}) {
  const actor = await requireAuth();
  requireOwner(actor);
  const [invitations, departments] = await Promise.all([
    prisma.invitation.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ where: { companyId: actor.companyId }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Nutzerverwaltung"
        title="Einladungen"
        description="Neue Nutzer per E-Mail einladen – sie aktivieren ihr Konto selbst und vergeben ihr eigenes Passwort."
        actions={
          <Button asChild>
            <a href="#new-invitation">Einladen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Offene & vergangene Einladungen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {invitations.length === 0 ? (
              <EmptyState title="Noch keine Einladungen" description="Laden Sie den ersten Nutzer über das Formular ein." />
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{invitation.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invitation.name ? `${invitation.name} · ` : ""}
                      {roleLabels[invitation.role]} · erstellt {formatDateTime(invitation.createdAt)} · gültig bis {formatDateTime(invitation.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(invitation.status)}>{invitationStatusLabels[invitation.status]}</Badge>
                    {invitation.status === "PENDING" ? (
                      <form action={revokeInvitation}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <Button size="sm" variant="outline">Zurückziehen</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card id="new-invitation">
          <CardHeader>
            <CardTitle>Nutzer einladen</CardTitle>
          </CardHeader>
          <CardContent>
            {searchParams?.inviteError ? (
              <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{searchParams.inviteError}</p>
            ) : null}
            {searchParams?.invited ? (
              <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                <p>Einladung wurde versendet.</p>
                {searchParams.link ? (
                  <p className="mt-2 break-all">
                    Aktivierungslink (nur in Entwicklung sichtbar):{" "}
                    <a className="font-semibold underline" href={searchParams.link}>
                      {searchParams.link}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
            <form action={createInvitation} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">E-Mail</Label>
                <Input id="invite-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-name">Name (optional)</Label>
                <Input id="invite-name" name="name" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Rolle</Label>
                <SelectField id="invite-role" name="role" defaultValue={UserRole.USER}>
                  {tenantRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-department">Abteilung</Label>
                <SelectField id="invite-department" name="departmentId" defaultValue="">
                  <option value="">Keine Abteilung</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Button>Einladung senden</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
