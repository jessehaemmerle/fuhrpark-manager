import { UserRole } from "@prisma/client";
import { createUser, deactivateUser, updateDriverPermissions, updateUser } from "@/server/actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Nutzer"
};

export default async function UsersPage() {
  const actor = await requireAuth();
  requireFleetAdmin(actor);
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
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Nutzerverwaltung</p>
        <h1 className="mt-2 text-3xl font-semibold">Nutzer & Fahrerfreigaben</h1>
      </div>
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
                  <Field name="name" label="Name" defaultValue={user.name} />
                  <Field name="email" label="E-Mail" type="email" defaultValue={user.email} />
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
                  <DepartmentSelect value={user.departmentId ?? ""} departments={departments} />
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
                    <Field name="licenseClass" label="Klasse" defaultValue={user.licenseClass ?? ""} />
                    <Field name="licenseNumber" label="Fuehrerscheinnummer" defaultValue={user.licenseNumber ?? ""} />
                    <Field name="licenseValidUntil" label="Gueltig bis" type="date" defaultValue={user.licenseValidUntil?.toISOString().slice(0, 10) ?? ""} />
                    <Field name="lastLicenseCheckDate" label="Letzte Pruefung" type="date" defaultValue={user.lastLicenseCheckDate?.toISOString().slice(0, 10) ?? ""} />
                    <div className="grid gap-2">
                      <Label htmlFor={`notes-${user.id}`}>Notizen</Label>
                      <Textarea id={`notes-${user.id}`} name="driverNotes" defaultValue={user.driverNotes ?? ""} />
                    </div>
                    <Button size="sm">Fahrerfreigabe speichern</Button>
                  </form>
                  {user.id !== actor.id ? (
                    <form action={deactivateUser}>
                      <input type="hidden" name="userId" value={user.id} />
                      <ConfirmButton
                        type="submit"
                        size="sm"
                        variant="destructive"
                        message={`${user.name} wirklich deaktivieren? Der Nutzer kann sich danach nicht mehr einloggen.`}
                      >
                        Deaktivieren
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nutzer anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createUser} className="grid gap-4">
              <Field name="name" label="Name" />
              <Field name="email" label="E-Mail" type="email" />
              <Field name="password" label="Initialpasswort" type="password" />
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
              <DepartmentSelect value="" departments={departments} />
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
              <Field name="licenseClass" label="Klasse" />
              <Field name="licenseNumber" label="Fuehrerscheinnummer" />
              <Field name="licenseValidUntil" label="Gueltig bis" type="date" />
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
  departments
}: {
  value: string;
  departments: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="departmentId">Abteilung</Label>
      <SelectField id="departmentId" name="departmentId" defaultValue={value}>
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
  defaultValue
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
