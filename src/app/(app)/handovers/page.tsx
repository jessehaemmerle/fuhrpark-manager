import { HandoverType } from "@prisma/client";
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
  title: "Uebergaben"
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
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Vehicle Handover</p>
        <h1 className="mt-2 text-3xl font-semibold">Uebergaben & Rueckgaben</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Protokolle</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="mb-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/handovers">CSV exportieren</a>
              </Button>
            </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protokoll erfassen</CardTitle>
          </CardHeader>
          <CardContent>
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
              <Field name="energyLevel" label="Tank/Batterie %" type="number" />
              <TextBlock name="exteriorConditionNote" label="Aussen-Zustand" />
              <TextBlock name="interiorConditionNote" label="Innen-Zustand" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="existingDamageConfirmed" />
                Bestehende Schaeden bestaetigt
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="newDamageReported" />
                Neuer Schaden gemeldet
              </label>
              <Field name="createDamageTitle" label="Titel neuer Schaden" />
              <TextBlock name="createDamageDescription" label="Beschreibung neuer Schaden" />
              <Field name="signatureName" label="Signaturname" />
              <TextBlock name="photoUrls" label="Foto-URLs" />
              <Button>Speichern</Button>
            </form>
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
