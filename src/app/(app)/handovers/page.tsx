import { HandoverType } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { FileUploader } from "@/components/app/file-uploader";
import { PageHeader } from "@/components/app/page-header";
import { createHandover } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { isFleetAdmin, requireAuth } from "@/lib/auth";
import { handoverTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Übergaben"
};

export default async function HandoversPage() {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);
  const nowInput = new Date().toISOString().slice(0, 16);
  const [handovers, vehicles, bookings] = await Promise.all([
    prisma.vehicleHandover.findMany({
      where: { companyId: user.companyId, userId: manager ? undefined : user.id },
      include: { vehicle: true, user: true, booking: true },
      orderBy: { handledAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.booking.findMany({
      where: { companyId: user.companyId, userId: manager ? undefined : user.id, status: "APPROVED" },
      include: { vehicle: true },
      orderBy: { startAt: "desc" },
      take: 30
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Übergaben"
        title="Übergaben & Rückgaben"
        description="Fahrzeugzustand, Kilometerstand und Schäden bei Übergabe oder Rückgabe dokumentieren."
        actions={
          <Button asChild>
            <a href="#new-handover">Protokoll erfassen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Protokolle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/handovers">CSV exportieren</a>
              </Button>
            </div>
            <div className="grid gap-3 md:hidden">
              {handovers.map((handover) => (
                <div key={handover.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{handover.vehicle.licensePlate}</p>
                      <p className="mt-1 text-muted-foreground">{handover.user.name}</p>
                    </div>
                    <Badge>{handoverTypeLabels[handover.type]}</Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground">{formatDateTime(handover.handledAt)}</p>
                  <p className="mt-2">{handover.mileage.toLocaleString("de-DE")} km</p>
                  <div className="mt-3">
                    {handover.newDamageReported ? <Badge tone="danger">Neuer Schaden</Badge> : <Badge tone="success">OK</Badge>}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Typ</th>
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Nutzer</th>
                    <th className="py-3 pr-4">Zeitpunkt</th>
                    <th className="py-3 pr-4">Kilometer</th>
                    <th className="py-3 pr-4">Zustand</th>
                  </tr>
                </thead>
                <tbody>
                  {handovers.map((handover) => (
                    <tr key={handover.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Badge>{handoverTypeLabels[handover.type]}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{handover.vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">{handover.user.name}</td>
                      <td className="py-3 pr-4">{formatDateTime(handover.handledAt)}</td>
                      <td className="py-3 pr-4">{handover.mileage.toLocaleString("de-DE")}</td>
                      <td className="py-3 pr-4">
                        {handover.newDamageReported ? <Badge tone="danger">Neuer Schaden</Badge> : <Badge tone="success">OK</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {handovers.length === 0 ? (
              <EmptyState
                title="Keine Protokolle erfasst"
                description="Übergaben und Rückgaben werden hier chronologisch gesammelt."
                action={
                  <Button asChild size="sm">
                    <a href="#new-handover">Protokoll erfassen</a>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-handover">
          <CardHeader>
            <CardTitle>Protokoll erfassen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState title="Keine Fahrzeuge verfügbar" description="Legen Sie zuerst ein Fahrzeug an, bevor Protokolle erfasst werden können." />
            ) : (
              <form action={createHandover} className="grid gap-4">
                <SelectBlock name="vehicleId" label="Fahrzeug">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="bookingId" label="Buchung">
                  <option value="">Ohne Buchung</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.vehicle.licensePlate} · {formatDateTime(booking.startAt)}
                    </option>
                  ))}
                </SelectBlock>
                <SelectBlock name="type" label="Typ" defaultValue={HandoverType.HANDOVER}>
                  {Object.values(HandoverType).map((type) => (
                    <option key={type} value={type}>
                      {handoverTypeLabels[type]}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="handledAt" label="Zeitpunkt" type="datetime-local" defaultValue={nowInput} />
                <Field name="mileage" label="Kilometerstand" type="number" />
                <Field name="energyLevel" label="Tank/Batterie (%)" type="number" />
                <TextBlock name="exteriorConditionNote" label="Außenzustand" />
                <TextBlock name="interiorConditionNote" label="Innenzustand" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="existingDamageConfirmed" />
                  Bestehende Schäden bestätigt
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="newDamageReported" />
                  Neuer Schaden gemeldet
                </label>
                <Field name="createDamageTitle" label="Titel neuer Schaden" />
                <TextBlock name="createDamageDescription" label="Beschreibung neuer Schaden" />
                <Field name="signatureName" label="Unterschrift Name" />
                <div className="grid gap-2">
                  <Label>Fotos</Label>
                  <FileUploader name="photoUrls" kind="photo" label="Fotos hochladen" />
                </div>
                <Button>Protokoll speichern</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function TextBlock({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} />
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
