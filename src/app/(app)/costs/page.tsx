import { CostCategory } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { createCostEntry, deleteCostEntry } from "@/server/cost-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { costCategoryLabels } from "@/lib/labels";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, monthRange } from "@/lib/utils";

export const metadata = {
  title: "Kosten & Tank-/Ladevorgänge"
};

const todayInput = () => new Date().toISOString().slice(0, 10);

export default async function CostsPage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "costTrackingAccess");

  const { start, end } = monthRange();
  const [overallTotal, monthTotal, byCategory, byVehicle, vehicles, entries] = await Promise.all([
    prisma.costEntry.aggregate({
      where: { companyId: user.companyId },
      _sum: { amount: true }
    }),
    prisma.costEntry.aggregate({
      where: { companyId: user.companyId, incurredAt: { gte: start, lt: end } },
      _sum: { amount: true }
    }),
    prisma.costEntry.groupBy({
      by: ["category"],
      where: { companyId: user.companyId },
      _sum: { amount: true }
    }),
    prisma.costEntry.groupBy({
      by: ["vehicleId"],
      where: { companyId: user.companyId },
      _sum: { amount: true },
      _count: true
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.costEntry.findMany({
      where: { companyId: user.companyId },
      include: { vehicle: true },
      orderBy: { incurredAt: "desc" },
      take: 30
    })
  ]);

  const overallSum = Number(overallTotal._sum.amount ?? 0);
  const monthSum = Number(monthTotal._sum.amount ?? 0);

  const categoryRows = byCategory
    .map((row) => ({ category: row.category, sum: Number(row._sum.amount ?? 0) }))
    .sort((a, b) => b.sum - a.sum);

  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const vehicleRows = byVehicle
    .map((row) => ({
      vehicleId: row.vehicleId,
      sum: Number(row._sum.amount ?? 0),
      count: row._count,
      vehicle: vehicleMap.get(row.vehicleId)
    }))
    .sort((a, b) => b.sum - a.sum);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kosten"
        title="Kosten & Tank-/Ladevorgänge"
        description="Tank- und Ladevorgänge sowie alle Fahrzeugkosten erfassen und die Gesamtkosten (TCO) je Fahrzeug auswerten."
        actions={
          <Button asChild>
            <a href="#new-cost">Kosten erfassen</a>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kosten diesen Monat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(monthSum)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kosten gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(overallSum)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kosten nach Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryRows.length === 0 ? (
                <EmptyState title="Keine Kosten erfasst" description="Sobald Kosten erfasst werden, erscheint hier die Aufschlüsselung." />
              ) : (
                <div className="grid gap-2">
                  {categoryRows.map((row) => (
                    <div key={row.category} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span className="font-medium">{costCategoryLabels[row.category]}</span>
                      <span>{formatCurrency(row.sum)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gesamtkosten je Fahrzeug (TCO)</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicleRows.length === 0 ? (
                <EmptyState title="Keine Kosten erfasst" description="Erfassen Sie Kosten, um die Gesamtkosten je Fahrzeug zu sehen." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4">Fahrzeug</th>
                        <th className="py-3 pr-4">Einträge</th>
                        <th className="py-3 pr-4">Gesamtkosten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleRows.map((row) => (
                        <tr key={row.vehicleId} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">
                            {row.vehicle
                              ? `${row.vehicle.licensePlate} · ${row.vehicle.brand} ${row.vehicle.model}`
                              : "Archiviertes Fahrzeug"}
                          </td>
                          <td className="py-3 pr-4">{row.count}</td>
                          <td className="py-3 pr-4">{formatCurrency(row.sum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Letzte Einträge</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <EmptyState
                  title="Noch keine Kosten erfasst"
                  description="Erfassen Sie Tankvorgänge, Ladevorgänge und sonstige Fahrzeugkosten."
                  action={
                    <Button asChild size="sm">
                      <a href="#new-cost">Kosten erfassen</a>
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4">Datum</th>
                        <th className="py-3 pr-4">Fahrzeug</th>
                        <th className="py-3 pr-4">Kategorie</th>
                        <th className="py-3 pr-4">Betrag</th>
                        <th className="py-3 pr-4">Menge</th>
                        <th className="py-3 pr-4">Anbieter</th>
                        <th className="py-3 pr-4">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">{formatDate(entry.incurredAt)}</td>
                          <td className="py-3 pr-4 font-medium">{entry.vehicle.licensePlate}</td>
                          <td className="py-3 pr-4">
                            <Badge tone="neutral">{costCategoryLabels[entry.category]}</Badge>
                          </td>
                          <td className="py-3 pr-4">{formatCurrency(Number(entry.amount))}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {entry.liters != null ? `${Number(entry.liters)} l` : null}
                            {entry.energyKwh != null ? `${Number(entry.energyKwh)} kWh` : null}
                            {entry.liters == null && entry.energyKwh == null ? "-" : null}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{entry.vendor ?? "-"}</td>
                          <td className="py-3 pr-4">
                            <form action={deleteCostEntry}>
                              <input type="hidden" name="costEntryId" value={entry.id} />
                              <Button size="sm" variant="destructive">
                                Löschen
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card id="new-cost">
          <CardHeader>
            <CardTitle>Kosten erfassen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState
                title="Keine Fahrzeuge verfügbar"
                description="Legen Sie zuerst ein Fahrzeug an, bevor Kosten erfasst werden können."
              />
            ) : (
              <form action={createCostEntry} className="grid gap-4">
                <SelectBlock name="vehicleId" label="Fahrzeug">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="category" label="Kategorie" defaultValue={CostCategory.FUEL}>
                  {Object.values(CostCategory).map((category) => (
                    <option key={category} value={category}>
                      {costCategoryLabels[category]}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="amount" label="Betrag (EUR)" type="number" step="0.01" />
                <Field name="incurredAt" label="Datum" type="date" defaultValue={todayInput()} />
                <Field name="liters" label="Liter (Tankvorgang)" type="number" step="0.01" />
                <Field name="energyKwh" label="Energie kWh (Ladevorgang)" type="number" step="0.01" />
                <Field name="pricePerUnit" label="Preis pro Einheit" type="number" step="0.001" />
                <Field name="mileage" label="Kilometerstand" type="number" />
                <Field name="vendor" label="Anbieter / Tankstelle" />
                <div className="grid gap-2">
                  <Label htmlFor="note">Notiz</Label>
                  <Textarea id="note" name="note" />
                </div>
                <Button>Kosten erfassen</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  step,
  defaultValue
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} />
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
