import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/app/page-header";
import { createUser, deactivateUser, updateDriverPermissions, updateUser } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireOwner } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Nutzer"
};

function temporaryPassword() {
  return `Fb7-${randomBytes(10).toString("base64url")}`;
}

export default async function UsersPage({ searchParams }: { searchParams?: { userCreated?: string; userError?: string } }) {
  const actor = await requireAuth();
  requireOwner(actor);
  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: actor.companyId },
      include: { department: true },
      orderBy: { name: "asc" }
    }),
    prisma.department.findMany({
      where: { companyId: actor.companyId },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Nutzerverwaltung"
        title="Nutzer & Fahrerfreigaben"
        description="Rollen, Abteilungen und Führerscheindaten an einem Ort pflegen."
        actions={
          <Button asChild>
            <a href="#new-user">Nutzer anlegen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>{user.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>{roleLabels[user.role]}</Badge>
                    <Badge tone={user.active ? "success" : "neutral"}>{user.active ? "Aktiv" : "Inaktiv"}</Badge>
                    {user.driverBlocked ? <Badge tone="danger">Gesperrt</Badge> : null}
                    {user.driverApproved ? <Badge tone="success">Fahrer ok</Badge> : <Badge tone="warning">Freigabe fehlt</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-2">
                <form action={updateUser} className="grid gap-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="driverApproved" value={String(user.driverApproved)} />
                  <input type="hidden" name="driverBlocked" value={String(user.driverBlocked)} />
                  <input type="hidden" name="licenseClass" value={user.licenseClass ?? ""} />
                  <input type="hidden" name="licenseNumber" value={user.licenseNumber ?? ""} />
                  <input type="hidden" name="licenseValidUntil" value={user.licenseValidUntil?.toISOString().slice(0, 10) ?? ""} />
                  <input type="hidden" name="driverNotes" value={user.driverNotes ?? ""} />
                  <input type="hidden" name="active" value={String(user.active)} />
                  <Field name="name" label="Name" defaultValue={user.name} idSuffix={user.id} />
                  <Field name="email" label="E-Mail" type="email" defaultValue={user.email} idSuffix={user.id} />
                  <div className="grid gap-2">
                    <Label htmlFor={`role-${user.id}`}>Rolle</Label>
                    <SelectField id={`role-${user.id}`} name="role" defaultValue={user.role}>
                      {Object.values(UserRole)
                        .filter((role) => actor.role === "PLATFORM_ADMIN" || role !== "PLATFORM_ADMIN")
                        .map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                    </SelectField>
                  </div>
                  <DepartmentSelect value={user.departmentId ?? ""} departments={departments} idSuffix={user.id} />
                  <Button size="sm">Profil speichern</Button>
                </form>
                <div className="grid gap-3">
                  <form action={updateDriverPermissions} className="grid gap-3">
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="driverApproved" defaultChecked={user.driverApproved} />
                        Freigegeben
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="driverBlocked" defaultChecked={user.driverBlocked} />
                        Gesperrt
                      </label>
                    </div>
                    <Field name="licenseClass" label="Klasse" defaultValue={user.licenseClass ?? ""} idSuffix={`license-${user.id}`} />
                    <Field name="licenseNumber" label="Führerscheinnummer" defaultValue={user.licenseNumber ?? ""} idSuffix={`license-${user.id}`} />
                    <Field name="licenseValidUntil" label="Gültig bis" type="date" defaultValue={user.licenseValidUntil?.toISOString().slice(0, 10) ?? ""} idSuffix={`license-${user.id}`} />
                    <Field name="lastLicenseCheckDate" label="Letzte Prüfung" type="date" defaultValue={user.lastLicenseCheckDate?.toISOString().slice(0, 10) ?? ""} idSuffix={`license-${user.id}`} />
                    <div className="grid gap-2">
                      <Label htmlFor={`notes-${user.id}`}>Notizen</Label>
                      <Textarea id={`notes-${user.id}`} name="driverNotes" defaultValue={user.driverNotes ?? ""} />
                    </div>
                    <Button size="sm">Fahrerfreigabe speichern</Button>
                  </form>
                  {user.id !== actor.id ? (
                    <form action={deactivateUser}>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button size="sm" variant="destructive">Deaktivieren</Button>
                    </form>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Gültig bis: {formatDate(user.licenseValidUntil)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card id="new-user">
          <CardHeader>
            <CardTitle>Nutzer anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            {searchParams?.userError ? (
              <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{searchParams.userError}</p>
            ) : null}
            {searchParams?.userCreated ? (
              <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Nutzer wurde angelegt.</p>
            ) : null}
            <form action={createUser} className="grid gap-4">
              <Field name="name" label="Name" idSuffix="new" />
              <Field name="email" label="E-Mail" type="email" idSuffix="new" />
              <div className="grid gap-2">
                <Label htmlFor="password-new">Einmalpasswort</Label>
                <Input id="password-new" name="password" defaultValue={temporaryPassword()} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">Der Nutzer muss danach ein eigenes Passwort vergeben.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rolle</Label>
                <SelectField id="role" name="role" defaultValue={UserRole.USER}>
                  {Object.values(UserRole)
                    .filter((role) => actor.role === "PLATFORM_ADMIN" || role !== "PLATFORM_ADMIN")
                    .map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                </SelectField>
              </div>
              <DepartmentSelect value="" departments={departments} idSuffix="new" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="driverApproved" />
                  Fahrer freigeben
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="driverBlocked" />
                  Fahrer sperren
                </label>
              </div>
              <Field name="licenseClass" label="Klasse" idSuffix="new" />
              <Field name="licenseNumber" label="Führerscheinnummer" idSuffix="new" />
              <Field name="licenseValidUntil" label="Gültig bis" type="date" idSuffix="new" />
              <div className="grid gap-2">
                <Label htmlFor="driverNotes">Notizen</Label>
                <Textarea id="driverNotes" name="driverNotes" />
              </div>
              <Button>Anlegen</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DepartmentSelect({
  value,
  departments,
  idSuffix
}: {
  value: string;
  departments: Array<{ id: string; name: string }>;
  idSuffix: string;
}) {
  const id = `departmentId-${idSuffix}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Abteilung</Label>
      <SelectField id={id} name="departmentId" defaultValue={value}>
        <option value="">Keine Abteilung</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  idSuffix
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  idSuffix: string;
}) {
  const id = `${name}-${idSuffix}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
