import { createDepartment, deleteDepartment, updateDepartment } from "@/server/actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Abteilungen"
};

export default async function DepartmentsPage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    include: { users: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Organisation</p>
        <h1 className="mt-2 text-3xl font-semibold">Abteilungen</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4 md:grid-cols-2">
          {departments.map((department) => (
            <Card key={department.id}>
              <CardHeader>
                <CardTitle>{department.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Nutzer" value={department.users.length} />
                  <Stat label="Aktiv" value={department.users.filter((user) => user.active).length} />
                </div>
                <form action={updateDepartment.bind(null, department.id)} className="grid gap-3">
                  <Field name="name" label="Name" defaultValue={department.name} />
                  <Field name="managerName" label="Manager" defaultValue={department.managerName ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor={`description-${department.id}`}>Beschreibung</Label>
                    <Textarea id={`description-${department.id}`} name="description" defaultValue={department.description ?? ""} />
                  </div>
                  <Button size="sm">Speichern</Button>
                </form>
                <form action={deleteDepartment}>
                  <input type="hidden" name="departmentId" value={department.id} />
                  <ConfirmButton
                    type="submit"
                    size="sm"
                    variant="destructive"
                    message={`Abteilung "${department.name}" wirklich loeschen?`}
                  >
                    Loeschen
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Abteilung anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDepartment} className="grid gap-4">
              <Field name="name" label="Name" />
              <Field name="managerName" label="Manager" />
              <div className="grid gap-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button>Anlegen</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}
