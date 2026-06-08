import Link from "next/link";
import { HandoverType, TripType } from "@prisma/client";
import { Car, LockKeyhole, QrCode } from "lucide-react";
import { createDamageReport, createHandover, finishTrip, startTrip } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { writeAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { damageSeverityLabels, handoverTypeLabels, tripTypeLabels, vehicleStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Fahrzeug QR Workflow"
};

export default async function VehicleQrPage({ params }: { params: { token: string } }) {
  const [user, vehicle] = await Promise.all([
    getCurrentUser(),
    prisma.vehicle.findFirst({
      where: { qrCodeToken: params.token, qrCodeEnabled: true },
      include: { company: true }
    })
  ]);

  if (!vehicle) {
    return <QrShell title="QR-Code ungueltig" copy="Dieser Fahrzeugcode ist deaktiviert oder existiert nicht." />;
  }

  if (!user) {
    return (
      <QrShell title={`${vehicle.brand} ${vehicle.model}`} copy={`${vehicle.licensePlate} · Bitte einloggen, um Aktionen auszufuehren.`}>
        <Button asChild>
          <Link href={`/login?next=/v/${params.token}`}>
            <LockKeyhole className="h-4 w-4" /> Einloggen
          </Link>
        </Button>
      </QrShell>
    );
  }

  if (user.companyId !== vehicle.companyId && user.role !== "PLATFORM_ADMIN") {
    return <QrShell title="Kein Zugriff" copy="Dieses Fahrzeug gehoert zu einem anderen Mandanten." />;
  }

  await writeAuditLog({
    companyId: vehicle.companyId,
    actorUserId: user.id,
    action: "vehicle.qr_opened",
    entityType: "Vehicle",
    entityId: vehicle.id
  });

  const [activeTrip, approvedBookings] = await Promise.all([
    prisma.tripLog.findFirst({
      where: { companyId: vehicle.companyId, vehicleId: vehicle.id, userId: user.id, endAt: null }
    }),
    prisma.booking.findMany({
      where: { companyId: vehicle.companyId, vehicleId: vehicle.id, userId: user.id, status: "APPROVED" },
      orderBy: { startAt: "asc" },
      take: 10
    })
  ]);
  const nowInput = new Date().toISOString().slice(0, 16);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-5">
      <div className="mx-auto grid max-w-md gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Car className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">
                {vehicle.brand} {vehicle.model}
              </h1>
              <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{vehicleStatusLabels[vehicle.status]}</Badge>
            <Badge>{vehicle.mileage.toLocaleString("de-DE")} km</Badge>
            {vehicle.location ? <Badge>{vehicle.location}</Badge> : null}
          </div>
          {vehicle.notes ? <p className="mt-4 text-sm text-muted-foreground">{vehicle.notes}</p> : null}
        </div>

        {activeTrip ? (
          <Card>
            <CardHeader>
              <CardTitle>Aktive Fahrt beenden</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={finishTrip} className="grid gap-4">
                <input type="hidden" name="tripLogId" value={activeTrip.id} />
                <p className="text-sm text-muted-foreground">Gestartet {formatDateTime(activeTrip.startAt)}</p>
                <Field name="endMileage" label="Endkilometer" type="number" />
                <Field name="destination" label="Ziel" />
                <TextBlock name="notes" label="Notizen" />
                <Button>Fahrt beenden</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Fahrt starten</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={startTrip} className="grid gap-4">
                <input type="hidden" name="vehicleId" value={vehicle.id} />
                <SelectBlock name="bookingId" label="Buchung">
                  <option value="">Ohne Buchung</option>
                  {approvedBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {formatDateTime(booking.startAt)}
                    </option>
                  ))}
                </SelectBlock>
                <Field name="startMileage" label="Startkilometer" type="number" />
                <Field name="startLocation" label="Startort" />
                <Field name="destination" label="Ziel" />
                <TextBlock name="purpose" label="Zweck" />
                <SelectBlock name="tripType" label="Fahrtart" defaultValue={TripType.BUSINESS}>
                  {Object.values(TripType).map((type) => (
                    <option key={type} value={type}>
                      {tripTypeLabels[type]}
                    </option>
                  ))}
                </SelectBlock>
                <Button>Fahrt starten</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Schaden melden</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDamageReport} className="grid gap-4">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <Field name="title" label="Titel" />
              <TextBlock name="description" label="Beschreibung" />
              <Field name="damageLocation" label="Schadenort" />
              <SelectBlock name="severity" label="Schweregrad" defaultValue="LOW">
                {Object.entries(damageSeverityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectBlock>
              <TextBlock name="photoUrls" label="Foto-URLs" />
              <Button>Melden</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uebergabe / Rueckgabe</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createHandover} className="grid gap-4">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
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
                Neuer Schaden
              </label>
              <Button>Protokoll speichern</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function QrShell({ title, copy, children }: { title: string; copy: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <QrCode className="h-8 w-8 text-primary" />
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">{copy}</p>
          {children}
        </CardContent>
      </Card>
    </main>
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
