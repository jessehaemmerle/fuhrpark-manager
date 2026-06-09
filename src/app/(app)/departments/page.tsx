import { createDepartment, deleteDepartment, updateDepartment } from "@/server/actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Abteilungen"
};

export default async function DepartmentsPage() {
  const user = await requireAuth();
  requireOwner(user);
  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    include: { users: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Organisation"
        title="Abteilungen"
        description="Teams strukturieren und Nutzer einfacher zuordnen."
        actions={
          <Button asChild>
            <a href="#new-department">Abteilung anlegen</a>
          </Button>
        }
      />
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
                  <Field name="name" label="Name" defaultValue={department.name} idSuffix={department.id} />
                  <Field name="managerName" label="Manager" defaultValue={department.managerName ?? ""} idSuffix={department.id} />
                  <div className="grid gap-2">
                    <Label htmlFor={`description-${department.id}`}>Beschreibung</Label>
                    <Textarea id={`description-${department.id}`} name="description" defaultValue={department.description ?? ""} />
                  </div>
                  <Button size="sm">Speichern</Button>
                </form>
                <form action={deleteDepartment}>
                  <input type="hidden" name="departmentId" value={department.id} />
                  <Button size="sm" variant="destructive">Löschen</Button>
                </form>
              </CardContent>
            </Card>
          ))}
          {departments.length === 0 ? (
            <EmptyState
              title="Keine Abteilungen angelegt"
              description="Abteilungen helfen bei Auswertungen und Nutzerzuordnung."
              action={
                <Button asChild size="sm">
                  <a href="#new-department">Abteilung anlegen</a>
                </Button>
              }
              className="md:col-span-2"
            />
          ) : null}
        </div>
        <Card id="new-department">
          <CardHeader>
            <CardTitle>Abteilung anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDepartment} className="grid gap-4">
              <Field name="name" label="Name" idSuffix="new" />
              <Field name="managerName" label="Manager" idSuffix="new" />
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
  defaultValue,
  idSuffix
}: {
  name: string;
  label: string;
  defaultValue?: string;
  idSuffix: string;
}) {
  const id = `${name}-${idSuffix}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} defaultValue={defaultValue} />
    </div>
  );
}
