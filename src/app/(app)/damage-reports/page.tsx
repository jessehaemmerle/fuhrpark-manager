import { DamageSeverity, DamageStatus } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { createDamageReport, updateDamageStatus } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, isFleetAdmin } from "@/lib/auth";
import { damageSeverityLabels, damageStatusLabels, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Schäden"
};

export default async function DamageReportsPage() {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);
  const [reports, vehicles] = await Promise.all([
    prisma.damageReport.findMany({
      where: { companyId: user.companyId, reporterUserId: manager ? undefined : user.id },
      include: { vehicle: true, reporter: true, resolvedBy: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Schadenmanagement"
        title="Schadenberichte"
        description="Schäden melden, Status verfolgen und Reparaturkosten transparent halten."
        actions={
          <Button asChild>
            <a href="#new-damage">Schaden melden</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Meldungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/damage-reports">CSV exportieren</a>
              </Button>
            </div>
            <div className="grid gap-3 md:hidden">
              {reports.map((report) => (
                <div key={report.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{report.title}</p>
                      <p className="mt-1 text-muted-foreground">{formatDateTime(report.createdAt)}</p>
                    </div>
                    <Badge tone={statusTone(report.status)}>{damageStatusLabels[report.status]}</Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground">
                    {report.vehicle.licensePlate} · {report.reporter.name} · {damageSeverityLabels[report.severity]}
                  </p>
                  <p className="mt-2">{formatCurrency(Number(report.repairCost ?? 0))}</p>
                  {manager ? (
                    <form action={updateDamageStatus} className="mt-3 grid gap-2">
                      <input type="hidden" name="damageReportId" value={report.id} />
                      <SelectField name="status" defaultValue={report.status}>
                        {Object.values(DamageStatus).map((status) => (
                          <option key={status} value={status}>
                            {damageStatusLabels[status]}
                          </option>
                        ))}
                      </SelectField>
                      <div className="flex gap-2">
                        <Input name="repairCost" type="number" className="min-w-0 flex-1" placeholder="Kosten" />
                        <Button size="sm">Speichern</Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Titel</th>
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Reporter</th>
                    <th className="py-3 pr-4">Schwere</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Kosten</th>
                    <th className="py-3 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(report.createdAt)}</p>
                      </td>
                      <td className="py-3 pr-4">{report.vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">{report.reporter.name}</td>
                      <td className="py-3 pr-4">{damageSeverityLabels[report.severity]}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(report.status)}>{damageStatusLabels[report.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">{formatCurrency(Number(report.repairCost ?? 0))}</td>
                      <td className="py-3 pr-4">
                        {manager ? (
                          <form action={updateDamageStatus} className="flex flex-wrap gap-2">
                            <input type="hidden" name="damageReportId" value={report.id} />
                            <SelectField name="status" defaultValue={report.status} className="w-48">
                              {Object.values(DamageStatus).map((status) => (
                                <option key={status} value={status}>
                                  {damageStatusLabels[status]}
                                </option>
                              ))}
                            </SelectField>
                            <Input name="repairCost" type="number" className="w-28" placeholder="Kosten" />
                            <Button size="sm">Speichern</Button>
                          </form>
                        ) : (
                          <span className="text-muted-foreground">Eingereicht</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reports.length === 0 ? (
              <EmptyState
                title="Keine Schadenmeldungen"
                description="Neue Meldungen erscheinen hier mit Status und Reparaturkosten."
                action={
                  <Button asChild size="sm">
                    <a href="#new-damage">Schaden melden</a>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-damage">
          <CardHeader>
            <CardTitle>Schaden melden</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState title="Keine Fahrzeuge verfügbar" description="Legen Sie zuerst ein Fahrzeug an, bevor Schäden gemeldet werden können." />
            ) : (
              <form action={createDamageReport} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="vehicleId">Fahrzeug</Label>
                  <SelectField id="vehicleId" name="vehicleId">
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Field name="title" label="Titel" />
                <div className="grid gap-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea id="description" name="description" required />
                </div>
                <Field name="damageLocation" label="Schadenort" />
                <div className="grid gap-2">
                  <Label htmlFor="severity">Schweregrad</Label>
                  <SelectField id="severity" name="severity" defaultValue={DamageSeverity.LOW}>
                    {Object.values(DamageSeverity).map((severity) => (
                      <option key={severity} value={severity}>
                        {damageSeverityLabels[severity]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="photoUrls">Foto-URLs</Label>
                  <Textarea id="photoUrls" name="photoUrls" placeholder="/uploads/schaden-1.webp oder https://..." />
                </div>
                <Button>Schaden melden</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} />
    </div>
  );
}
