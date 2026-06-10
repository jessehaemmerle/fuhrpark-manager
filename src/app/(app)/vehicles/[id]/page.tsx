import { Children } from "react";
import Link from "next/link";
import { FuelType, VehicleCategory, VehicleStatus } from "@prisma/client";
import { Archive, Download, QrCode, RotateCw } from "lucide-react";
import { archiveVehicle, disableVehicleQr, regenerateVehicleQr, updateVehicle } from "@/server/actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth } from "@/lib/auth";
import {
  bookingStatusLabels,
  damageSeverityLabels,
  damageStatusLabels,
  fuelTypeLabels,
  handoverTypeLabels,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
  statusTone,
  tripTypeLabels,
  vehicleCategoryLabels,
  vehicleStatusLabels
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, getAppUrl } from "@/lib/utils";

export const metadata = {
  title: "Fahrzeugdetails"
};

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { id: params.id, companyId: user.companyId },
    include: {
      bookings: { include: { user: true }, orderBy: { startAt: "desc" }, take: 8 },
      maintenanceRecords: { orderBy: { startAt: "desc" }, take: 8 },
      tripLogs: { include: { user: true }, orderBy: { startAt: "desc" }, take: 8 },
      damageReports: { include: { reporter: true }, orderBy: { createdAt: "desc" }, take: 8 },
      handovers: { include: { user: true }, orderBy: { handledAt: "desc" }, take: 8 }
    }
  });

  const maintenanceCost = vehicle.maintenanceRecords.reduce((sum, record) => sum + Number(record.cost), 0);
  const qrUrl = vehicle.qrCodeToken ? `${getAppUrl()}/v/${vehicle.qrCodeToken}` : null;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/vehicles" className="text-sm text-muted-foreground hover:text-foreground">← Alle Fahrzeuge</Link>
      </div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Fahrzeug</p>
          <h1 className="mt-2 text-3xl font-semibold">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {vehicle.licensePlate} · {vehicle.internalNumber} · {vehicle.mileage.toLocaleString("de-DE")} km
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(vehicle.status)}>{vehicleStatusLabels[vehicle.status]}</Badge>
          <Badge>{vehicleCategoryLabels[vehicle.category]}</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>QR-Code Workflow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-md border bg-white">
                {vehicle.qrCodeEnabled && vehicle.qrCodeToken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/vehicles/${vehicle.id}/qr?format=svg`} alt="Fahrzeug QR-Code" className="h-44 w-44" />
                ) : (
                  <QrCode className="h-16 w-16 text-zinc-300" />
                )}
              </div>
              <div className="grid content-start gap-3 text-sm">
                <p className="font-medium">Sicherer Fahrzeuglink</p>
                <p className="break-all text-muted-foreground">{qrUrl ?? "QR-Code deaktiviert oder Token fehlt."}</p>
                <div className="flex flex-wrap gap-2">
                  {vehicle.qrCodeEnabled && vehicle.qrCodeToken ? (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/v/${vehicle.qrCodeToken}`}>QR-Seite oeffnen</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/api/vehicles/${vehicle.id}/qr?format=svg`}>
                          <Download className="h-4 w-4" /> SVG
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/api/vehicles/${vehicle.id}/qr?format=png`}>
                          <Download className="h-4 w-4" /> PNG
                        </Link>
                      </Button>
                    </>
                  ) : null}
                  <form action={regenerateVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <Button size="sm" variant="outline">
                      <RotateCw className="h-4 w-4" /> {vehicle.qrCodeEnabled ? "Token erneuern" : "QR aktivieren"}
                    </Button>
                  </form>
                  {vehicle.qrCodeEnabled ? (
                    <form action={disableVehicleQr}>
                      <input type="hidden" name="vehicleId" value={vehicle.id} />
                      <ConfirmButton
                        type="submit"
                        size="sm"
                        variant="destructive"
                        message="QR-Code wirklich deaktivieren? Bestehende ausgedruckte Codes funktionieren dann nicht mehr."
                      >
                        QR deaktivieren
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  Der QR-Code enthaelt nur einen zufaelligen Token. Mandant und Berechtigung werden serverseitig geprueft.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historie und Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Summary label="Wartungskosten" value={formatCurrency(maintenanceCost)} />
              <Summary label="Fahrten" value={vehicle.tripLogs.length} />
              <Summary label="Schaeden" value={vehicle.damageReports.length} />
            </CardContent>
          </Card>

          <HistorySection title="Buchungen">
            {vehicle.bookings.map((booking) => (
              <HistoryRow key={booking.id} title={booking.purpose} meta={`${booking.user.name} · ${formatDateTime(booking.startAt)}`}>
                <Badge tone={statusTone(booking.status)}>{bookingStatusLabels[booking.status]}</Badge>
              </HistoryRow>
            ))}
          </HistorySection>

          <HistorySection title="Fahrtenbuch">
            {vehicle.tripLogs.map((trip) => (
              <HistoryRow key={trip.id} title={trip.purpose} meta={`${trip.user.name} · ${formatDateTime(trip.startAt)} · ${trip.distance ?? 0} km`}>
                <Badge>{tripTypeLabels[trip.tripType]}</Badge>
              </HistoryRow>
            ))}
          </HistorySection>

          <HistorySection title="Wartung">
            {vehicle.maintenanceRecords.map((record) => (
              <HistoryRow key={record.id} title={record.title} meta={`${maintenanceTypeLabels[record.type]} · ${formatDateTime(record.startAt)} · ${formatCurrency(Number(record.cost))}`}>
                <Badge tone={statusTone(record.status)}>{maintenanceStatusLabels[record.status]}</Badge>
              </HistoryRow>
            ))}
          </HistorySection>

          <HistorySection title="Schaeden">
            {vehicle.damageReports.map((damage) => (
              <HistoryRow key={damage.id} title={damage.title} meta={`${damage.reporter.name} · ${damageSeverityLabels[damage.severity]}`}>
                <Badge tone={statusTone(damage.status)}>{damageStatusLabels[damage.status]}</Badge>
              </HistoryRow>
            ))}
          </HistorySection>

          <HistorySection title="Uebergaben und Rueckgaben">
            {vehicle.handovers.map((handover) => (
              <HistoryRow key={handover.id} title={handoverTypeLabels[handover.type]} meta={`${handover.user.name} · ${formatDateTime(handover.handledAt)} · ${handover.mileage} km`}>
                <Badge>{handover.newDamageReported ? "Neuer Schaden" : "Ohne neuen Schaden"}</Badge>
              </HistoryRow>
            ))}
          </HistorySection>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fahrzeug bearbeiten</CardTitle>
            </CardHeader>
            <CardContent>
              <EditVehicleForm vehicle={vehicle} action={updateVehicle.bind(null, vehicle.id)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Archivieren</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p>Archivierte Fahrzeuge werden aus aktiven Listen ausgeblendet und der QR-Code wird deaktiviert.</p>
              <form action={archiveVehicle}>
                <input type="hidden" name="vehicleId" value={vehicle.id} />
                <ConfirmButton
                  type="submit"
                  variant="destructive"
                  message="Fahrzeug wirklich archivieren? Der QR-Code wird deaktiviert und das Fahrzeug aus allen aktiven Listen entfernt."
                >
                  <Archive className="h-4 w-4" /> Fahrzeug archivieren
                </ConfirmButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-zinc-50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = Children.count(children) === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {empty ? <p className="text-sm text-muted-foreground">Keine Eintraege.</p> : children}
      </CardContent>
    </Card>
  );
}

function HistoryRow({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground">{meta}</p>
      </div>
      {children}
    </div>
  );
}

function EditVehicleForm({
  action,
  vehicle
}: {
  action: (formData: FormData) => Promise<void>;
  vehicle: {
    internalNumber: string;
    licensePlate: string;
    brand: string;
    model: string;
    year: number | null;
    vin: string | null;
    category: VehicleCategory;
    status: VehicleStatus;
    fuelType: FuelType;
    mileage: number;
    location: string | null;
    notes: string | null;
    imageUrl: string | null;
    nextServiceMileage: number | null;
    qrCodeEnabled: boolean;
  };
}) {
  return (
    <form action={action} className="grid gap-4">
      <Field name="internalNumber" label="Interne Nummer" defaultValue={vehicle.internalNumber} />
      <Field name="licensePlate" label="Kennzeichen" defaultValue={vehicle.licensePlate} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="brand" label="Marke" defaultValue={vehicle.brand} />
        <Field name="model" label="Modell" defaultValue={vehicle.model} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="year" label="Baujahr" type="number" defaultValue={vehicle.year ?? ""} />
        <Field name="mileage" label="Kilometer" type="number" defaultValue={vehicle.mileage} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Kategorie</Label>
        <SelectField id="category" name="category" defaultValue={vehicle.category}>
          {Object.values(VehicleCategory).map((category) => (
            <option key={category} value={category}>
              {vehicleCategoryLabels[category]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <SelectField id="status" name="status" defaultValue={vehicle.status}>
          {Object.values(VehicleStatus).map((status) => (
            <option key={status} value={status}>
              {vehicleStatusLabels[status]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fuelType">Antrieb</Label>
        <SelectField id="fuelType" name="fuelType" defaultValue={vehicle.fuelType}>
          {Object.values(FuelType).map((fuelType) => (
            <option key={fuelType} value={fuelType}>
              {fuelTypeLabels[fuelType]}
            </option>
          ))}
        </SelectField>
      </div>
      <Field name="vin" label="VIN" defaultValue={vehicle.vin ?? ""} />
      <Field name="location" label="Standort" defaultValue={vehicle.location ?? ""} />
      <Field name="imageUrl" label="Bild-URL" defaultValue={vehicle.imageUrl ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={vehicle.notes ?? ""} />
      </div>
      <input type="hidden" name="qrCodeEnabled" value="false" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="qrCodeEnabled" defaultChecked={vehicle.qrCodeEnabled} />
        QR-Code aktiviert
      </label>
      <Button>Speichern</Button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text"
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
