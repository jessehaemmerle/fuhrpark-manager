import { DamageSeverity, DamageStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { FileUploader } from "@/components/app/file-uploader";
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

export default async function DamageReportsPage({
  searchParams
}: {
  searchParams: { status?: DamageStatus; severity?: DamageSeverity };
}) {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);
  const reportScopeWhere: Prisma.DamageReportWhereInput = {
    companyId: user.companyId,
    reporterUserId: manager ? undefined : user.id
  };
  const reportWhere: Prisma.DamageReportWhereInput = {
    ...reportScopeWhere,
    status: searchParams.status,
    severity: searchParams.severity
  };
  const [reports, vehicles, statusRows, severityRows, repairCostSum] = await Promise.all([
    prisma.damageReport.findMany({
      where: reportWhere,
      include: { vehicle: true, reporter: true, resolvedBy: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.damageReport.groupBy({
      by: ["status"],
      where: reportScopeWhere,
      _count: { _all: true }
    }),
    prisma.damageReport.groupBy({
      by: ["severity"],
      where: reportScopeWhere,
      _count: { _all: true }
    }),
    prisma.damageReport.aggregate({
      where: reportScopeWhere,
      _sum: { repairCost: true }
    })
  ]);
  const hasFilters = Boolean(searchParams.status || searchParams.severity);
  const statusCounts = new Map(statusRows.map((row) => [row.status, row._count._all]));
  const severityCounts = new Map(severityRows.map((row) => [row.severity, row._count._all]));
  const openDamageCount =
    (statusCounts.get(DamageStatus.OPEN) ?? 0) +
    (statusCounts.get(DamageStatus.IN_REVIEW) ?? 0) +
    (statusCounts.get(DamageStatus.SCHEDULED_FOR_REPAIR) ?? 0);
  const criticalDamageCount = (severityCounts.get(DamageSeverity.CRITICAL) ?? 0) + (severityCounts.get(DamageSeverity.HIGH) ?? 0);

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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/damage-reports" className="rounded-md border bg-white p-4 text-sm transition-colors hover:bg-zinc-50">
          <p className="text-muted-foreground">Alle Meldungen</p>
          <p className="mt-2 text-2xl font-semibold">{statusRows.reduce((sum, row) => sum + row._count._all, 0)}</p>
        </Link>
        <Link href="/damage-reports?status=OPEN" className="rounded-md border bg-white p-4 text-sm transition-colors hover:bg-zinc-50">
          <p className="text-muted-foreground">Offen / in Arbeit</p>
          <p className="mt-2 text-2xl font-semibold">{openDamageCount}</p>
        </Link>
        <div className="rounded-md border bg-white p-4 text-sm">
          <p className="text-muted-foreground">Hoch / kritisch</p>
          <p className="mt-2 text-2xl font-semibold">{criticalDamageCount}</p>
        </div>
        <div className="rounded-md border bg-white p-4 text-sm">
          <p className="text-muted-foreground">Reparaturkosten</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(repairCostSum._sum.repairCost ?? 0))}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Meldungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <form className="grid gap-3 md:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_auto_auto]">
                <SelectField name="status" defaultValue={searchParams.status ?? ""}>
                  <option value="">Alle Status</option>
                  {Object.values(DamageStatus).map((status) => (
                    <option key={status} value={status}>
                      {damageStatusLabels[status]}
                    </option>
                  ))}
                </SelectField>
                <SelectField name="severity" defaultValue={searchParams.severity ?? ""}>
                  <option value="">Alle Schweregrade</option>
                  {Object.values(DamageSeverity).map((severity) => (
                    <option key={severity} value={severity}>
                      {damageSeverityLabels[severity]}
                    </option>
                  ))}
                </SelectField>
                <Button type="submit" variant="outline">Anwenden</Button>
                {hasFilters ? (
                  <Button asChild variant="ghost">
                    <Link href="/damage-reports">Zurücksetzen</Link>
                  </Button>
                ) : null}
              </form>
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
                description={hasFilters ? "Für diese Filter gibt es aktuell keine Meldungen." : "Neue Meldungen erscheinen hier mit Status und Reparaturkosten."}
                action={
                  hasFilters ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/damage-reports">Filter zurücksetzen</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <a href="#new-damage">Schaden melden</a>
                    </Button>
                  )
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
                  <Label>Fotos</Label>
                  <FileUploader name="photoUrls" kind="photo" label="Fotos hochladen" />
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
