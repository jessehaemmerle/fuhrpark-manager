import { addDays, differenceInCalendarDays } from "date-fns";
import { DeadlineType } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { completeDeadline, createDeadline, deleteDeadline } from "@/server/deadline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { deadlineTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Termine & Fristen"
};

type DeadlineState = { label: string; tone: "success" | "warning" | "danger" | "neutral" };

function deadlineState(dueDate: Date, reminderLeadDays: number, now: Date): DeadlineState {
  const daysLeft = differenceInCalendarDays(dueDate, now);
  if (daysLeft < 0) {
    return { label: `${Math.abs(daysLeft)} Tage überfällig`, tone: "danger" };
  }
  if (daysLeft <= reminderLeadDays) {
    return { label: daysLeft === 0 ? "Heute fällig" : `In ${daysLeft} Tagen`, tone: "warning" };
  }
  return { label: `In ${daysLeft} Tagen`, tone: "neutral" };
}

export default async function DeadlinesPage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const now = new Date();
  const [openDeadlines, completedDeadlines, vehicles] = await Promise.all([
    prisma.vehicleDeadline.findMany({
      where: { companyId: user.companyId, completed: false },
      include: { vehicle: true },
      orderBy: { dueDate: "asc" }
    }),
    prisma.vehicleDeadline.findMany({
      where: { companyId: user.companyId, completed: true },
      include: { vehicle: true },
      orderBy: { completedAt: "desc" },
      take: 10
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Fristen"
        title="Termine & Fristen"
        description="HU/TÜV, Inspektion, Versicherung, Leasing-Ende, Reifenwechsel und Steuer im Blick behalten."
        actions={
          <Button asChild>
            <a href="#new-deadline">Frist anlegen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Offene Fristen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:hidden">
                {openDeadlines.map((deadline) => {
                  const state = deadlineState(deadline.dueDate, deadline.reminderLeadDays, now);
                  return (
                    <div key={deadline.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{deadline.title || deadlineTypeLabels[deadline.type]}</p>
                          <p className="mt-1 text-muted-foreground">{deadline.vehicle.licensePlate}</p>
                        </div>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </div>
                      <p className="mt-3 text-muted-foreground">
                        {deadlineTypeLabels[deadline.type]} · fällig {formatDate(deadline.dueDate)}
                        {deadline.dueMileage ? ` · ${deadline.dueMileage.toLocaleString("de-DE")} km` : ""}
                      </p>
                      {deadline.notes ? <p className="mt-2">{deadline.notes}</p> : null}
                      <div className="mt-3 flex gap-2">
                        <form action={completeDeadline}>
                          <input type="hidden" name="deadlineId" value={deadline.id} />
                          <Button size="sm" variant="outline">
                            Erledigt
                          </Button>
                        </form>
                        <form action={deleteDeadline}>
                          <input type="hidden" name="deadlineId" value={deadline.id} />
                          <Button size="sm" variant="ghost">
                            Löschen
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 pr-4">Bezeichnung</th>
                      <th className="py-3 pr-4">Fahrzeug</th>
                      <th className="py-3 pr-4">Typ</th>
                      <th className="py-3 pr-4">Fällig</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openDeadlines.map((deadline) => {
                      const state = deadlineState(deadline.dueDate, deadline.reminderLeadDays, now);
                      return (
                        <tr key={deadline.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{deadline.title || deadlineTypeLabels[deadline.type]}</td>
                          <td className="py-3 pr-4">{deadline.vehicle.licensePlate}</td>
                          <td className="py-3 pr-4">{deadlineTypeLabels[deadline.type]}</td>
                          <td className="py-3 pr-4">
                            {formatDate(deadline.dueDate)}
                            {deadline.dueMileage ? (
                              <span className="block text-xs text-muted-foreground">
                                {deadline.dueMileage.toLocaleString("de-DE")} km
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge tone={state.tone}>{state.label}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex gap-2">
                              <form action={completeDeadline}>
                                <input type="hidden" name="deadlineId" value={deadline.id} />
                                <Button size="sm" variant="outline">
                                  Erledigt
                                </Button>
                              </form>
                              <form action={deleteDeadline}>
                                <input type="hidden" name="deadlineId" value={deadline.id} />
                                <Button size="sm" variant="ghost">
                                  Löschen
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {openDeadlines.length === 0 ? (
                <EmptyState
                  title="Keine offenen Fristen"
                  description="Legen Sie HU/TÜV-, Inspektions- oder Versicherungstermine an, um rechtzeitig erinnert zu werden."
                  action={
                    <Button asChild size="sm">
                      <a href="#new-deadline">Frist anlegen</a>
                    </Button>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          {completedDeadlines.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Erledigt</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {completedDeadlines.map((deadline) => (
                    <li key={deadline.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium">{deadline.title || deadlineTypeLabels[deadline.type]}</p>
                        <p className="text-muted-foreground">
                          {deadline.vehicle.licensePlate} · {deadlineTypeLabels[deadline.type]}
                        </p>
                      </div>
                      <span className="shrink-0 text-muted-foreground">{formatDate(deadline.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card id="new-deadline">
          <CardHeader>
            <CardTitle>Frist anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState
                title="Keine Fahrzeuge verfügbar"
                description="Legen Sie zuerst ein Fahrzeug an, bevor Fristen geplant werden können."
              />
            ) : (
              <form action={createDeadline} className="grid gap-4">
                <SelectBlock name="vehicleId" label="Fahrzeug">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="type" label="Typ" defaultValue={DeadlineType.HU}>
                  {Object.values(DeadlineType).map((type) => (
                    <option key={type} value={type}>
                      {deadlineTypeLabels[type]}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="title" label="Bezeichnung (optional)" />
                <Field name="dueDate" label="Fällig am" type="date" />
                <Field name="dueMileage" label="Fällig bei km-Stand (optional)" type="number" />
                <Field name="intervalDays" label="Intervall in Tagen (optional)" type="number" />
                <Field name="intervalMileage" label="Intervall in km (optional)" type="number" />
                <Field name="reminderLeadDays" label="Vorlauf Erinnerung (Tage)" type="number" defaultValue={30} />
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <Button>Frist anlegen</Button>
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
  defaultValue
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
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
