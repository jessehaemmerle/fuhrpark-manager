import { MaintenanceStatus, MaintenanceType } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { createMaintenance, updateMaintenanceStatus } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { maintenanceStatusLabels, maintenanceTypeLabels, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Wartung"
};

export default async function MaintenancePage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const [records, vehicles, damages] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where: { companyId: user.companyId },
      include: { vehicle: true, damageReport: true, createdBy: true },
      orderBy: { startAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.damageReport.findMany({
      where: { companyId: user.companyId, status: { not: "RESOLVED" } },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Wartung"
        title="Wartung"
        description="Wartungsfenster planen, Status aktualisieren und Ausfälle früh sichtbar machen."
        actions={
          <Button asChild>
            <a href="#new-maintenance">Wartung anlegen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Wartungsplan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/maintenance">CSV exportieren</a>
              </Button>
            </div>
            <div className="grid gap-3 md:hidden">
              {records.map((record) => (
                <div key={record.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{record.title}</p>
                      <p className="mt-1 text-muted-foreground">{record.vehicle.licensePlate}</p>
                    </div>
                    <Badge tone={statusTone(record.status)}>{maintenanceStatusLabels[record.status]}</Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground">
                    {formatDateTime(record.startAt)} bis {formatDateTime(record.endAt)}
                  </p>
                  <p className="mt-2">
                    {maintenanceTypeLabels[record.type]} · {formatCurrency(Number(record.cost))}
                  </p>
                  <form action={updateMaintenanceStatus} className="mt-3 flex gap-2">
                    <input type="hidden" name="maintenanceId" value={record.id} />
                    <SelectField name="status" defaultValue={record.status} className="min-w-0 flex-1">
                      {Object.values(MaintenanceStatus).map((status) => (
                        <option key={status} value={status}>
                          {maintenanceStatusLabels[status]}
                        </option>
                      ))}
                    </SelectField>
                    <Button size="sm">Speichern</Button>
                  </form>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Titel</th>
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Zeitraum</th>
                    <th className="py-3 pr-4">Typ</th>
                    <th className="py-3 pr-4">Kosten</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{record.title}</td>
                      <td className="py-3 pr-4">{record.vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">
                        {formatDateTime(record.startAt)} bis {formatDateTime(record.endAt)}
                      </td>
                      <td className="py-3 pr-4">{maintenanceTypeLabels[record.type]}</td>
                      <td className="py-3 pr-4">{formatCurrency(Number(record.cost))}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(record.status)}>{maintenanceStatusLabels[record.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <form action={updateMaintenanceStatus} className="flex gap-2">
                          <input type="hidden" name="maintenanceId" value={record.id} />
                          <SelectField name="status" defaultValue={record.status} className="w-44">
                            {Object.values(MaintenanceStatus).map((status) => (
                              <option key={status} value={status}>
                                {maintenanceStatusLabels[status]}
                              </option>
                            ))}
                          </SelectField>
                          <Button size="sm">Speichern</Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length === 0 ? (
              <EmptyState
                title="Keine Wartungen geplant"
                description="Neue Wartungen blockieren die Verfügbarkeit des Fahrzeugs im gewünschten Zeitraum."
                action={
                  <Button asChild size="sm">
                    <a href="#new-maintenance">Wartung anlegen</a>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-maintenance">
          <CardHeader>
            <CardTitle>Wartung anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState title="Keine Fahrzeuge verfügbar" description="Legen Sie zuerst ein Fahrzeug an, bevor Wartungen geplant werden können." />
            ) : (
              <form action={createMaintenance} className="grid gap-4">
                <SelectBlock name="vehicleId" label="Fahrzeug">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="title" label="Titel" />
                <div className="grid gap-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea id="description" name="description" />
                </div>
                <SelectBlock name="type" label="Typ" defaultValue={MaintenanceType.SERVICE}>
                  {Object.values(MaintenanceType).map((type) => (
                    <option key={type} value={type}>
                      {maintenanceTypeLabels[type]}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="startAt" label="Start" type="datetime-local" />
                <Field name="endAt" label="Ende" type="datetime-local" />
                <Field name="cost" label="Kosten" type="number" />
                <Field name="vendor" label="Werkstatt" />
                <SelectBlock name="status" label="Status" defaultValue={MaintenanceStatus.PLANNED}>
                  {Object.values(MaintenanceStatus).map((status) => (
                    <option key={status} value={status}>
                      {maintenanceStatusLabels[status]}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="damageReportId" label="Schaden verknüpfen">
                  <option value="">Kein Schaden</option>
                  {damages.map((damage) => (
                    <option key={damage.id} value={damage.id}>
                      {damage.title}
                    </option>
                  ))}
                </SelectBlock>
                <Button>Wartung anlegen</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}

function SelectBlock({
  name,
  label,
  defaultValue,
  children
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <SelectField id={name} name={name} defaultValue={defaultValue}>
        {children}
      </SelectField>
    </div>
  );
}
