import Link from "next/link";
import { Prisma, FuelType, VehicleCategory, VehicleStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { createVehicle } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth } from "@/lib/auth";
import { bookingStatusLabels, fuelTypeLabels, statusTone, vehicleCategoryLabels, vehicleStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Fahrzeuge"
};

export default async function VehiclesPage({
  searchParams
}: {
  searchParams: { q?: string; status?: string; category?: string; sort?: string };
}) {
  const user = await requireAuth();
  const where: Prisma.VehicleWhereInput = {
    companyId: user.companyId,
    status: searchParams.status ? (searchParams.status as VehicleStatus) : { not: VehicleStatus.RETIRED },
    category: searchParams.category ? (searchParams.category as VehicleCategory) : undefined,
    OR: searchParams.q
      ? [
          { licensePlate: { contains: searchParams.q, mode: "insensitive" } },
          { brand: { contains: searchParams.q, mode: "insensitive" } },
          { model: { contains: searchParams.q, mode: "insensitive" } },
          { internalNumber: { contains: searchParams.q, mode: "insensitive" } }
        ]
      : undefined
  };

  const orderBy: Prisma.VehicleOrderByWithRelationInput =
    searchParams.sort === "mileage" ? { mileage: "desc" } : searchParams.sort === "plate" ? { licensePlate: "asc" } : { updatedAt: "desc" };

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      bookings: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { startAt: "asc" },
        take: 1
      },
      maintenanceRecords: {
        where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
        orderBy: { startAt: "asc" },
        take: 1
      }
    },
    orderBy
  });
  const hasFilters = Boolean(searchParams.q || searchParams.status || searchParams.category || searchParams.sort);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Fuhrpark"
        title="Fahrzeuge"
        description="Fahrzeuge suchen, Verfügbarkeit prüfen und Stammdaten direkt pflegen."
        actions={
          <Button asChild>
            <a href="#new-vehicle">
              <Plus className="h-4 w-4" /> Fahrzeug anlegen
            </a>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_repeat(3,minmax(150px,1fr))_auto_auto]">
            <Input name="q" placeholder="Suche nach Kennzeichen, Marke..." defaultValue={searchParams.q} />
            <SelectField name="status" defaultValue={searchParams.status ?? ""}>
              <option value="">Alle aktiven Status</option>
              {Object.values(VehicleStatus).map((status) => (
                <option key={status} value={status}>
                  {vehicleStatusLabels[status]}
                </option>
              ))}
            </SelectField>
            <SelectField name="category" defaultValue={searchParams.category ?? ""}>
              <option value="">Alle Kategorien</option>
              {Object.values(VehicleCategory).map((category) => (
                <option key={category} value={category}>
                  {vehicleCategoryLabels[category]}
                </option>
              ))}
            </SelectField>
            <SelectField name="sort" defaultValue={searchParams.sort ?? ""}>
              <option value="">Zuletzt aktualisiert</option>
              <option value="plate">Kennzeichen</option>
              <option value="mileage">Kilometerstand</option>
            </SelectField>
            <Button type="submit" variant="outline">Anwenden</Button>
            {hasFilters ? (
              <Button asChild variant="ghost">
                <Link href="/vehicles">Zurücksetzen</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Fahrzeugliste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{vehicle.licensePlate}</p>
                      <p className="mt-1 text-muted-foreground">
                        {vehicle.brand} {vehicle.model} · {vehicle.internalNumber}
                      </p>
                    </div>
                    <Badge tone={statusTone(vehicle.status)}>{vehicleStatusLabels[vehicle.status]}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{vehicleCategoryLabels[vehicle.category]}</span>
                    <span>{vehicle.mileage.toLocaleString("de-DE")} km</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {vehicle.bookings[0]
                      ? `${bookingStatusLabels[vehicle.bookings[0].status]} ab ${formatDateTime(vehicle.bookings[0].startAt)}`
                      : vehicle.maintenanceRecords[0]
                        ? `Wartung ab ${formatDateTime(vehicle.maintenanceRecords[0].startAt)}`
                        : "Frei"}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                    <Link href={`/vehicles/${vehicle.id}`}>Details öffnen</Link>
                  </Button>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Kennzeichen</th>
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Kategorie</th>
                    <th className="py-3 pr-4">km</th>
                    <th className="py-3 pr-4">Nächste Belegung</th>
                    <th className="py-3 pr-4">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">
                        {vehicle.brand} {vehicle.model}
                        <div className="text-xs text-muted-foreground">{vehicle.internalNumber}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(vehicle.status)}>{vehicleStatusLabels[vehicle.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">{vehicleCategoryLabels[vehicle.category]}</td>
                      <td className="py-3 pr-4">{vehicle.mileage.toLocaleString("de-DE")}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {vehicle.bookings[0]
                          ? `${bookingStatusLabels[vehicle.bookings[0].status]} ab ${formatDateTime(vehicle.bookings[0].startAt)}`
                          : vehicle.maintenanceRecords[0]
                            ? `Wartung ab ${formatDateTime(vehicle.maintenanceRecords[0].startAt)}`
                            : "Frei"}
                      </td>
                      <td className="py-3 pr-4">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vehicles/${vehicle.id}`}>Details</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {vehicles.length === 0 ? (
              <EmptyState
                title="Keine Fahrzeuge gefunden"
                description={hasFilters ? "Passen Sie die Filter an oder setzen Sie die Suche zurück." : "Legen Sie das erste Fahrzeug an, um Buchungen und QR-Workflows zu nutzen."}
                action={
                  hasFilters ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/vehicles">Filter zurücksetzen</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <a href="#new-vehicle">Fahrzeug anlegen</a>
                    </Button>
                  )
                }
                className="mt-4"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-vehicle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Fahrzeug anlegen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleForm action={createVehicle} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VehicleForm({
  action,
  vehicle
}: {
  action: (formData: FormData) => Promise<void>;
  vehicle?: {
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
    qrCodeEnabled: boolean;
  };
}) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="internalNumber">Interne Nummer</Label>
        <Input id="internalNumber" name="internalNumber" required defaultValue={vehicle?.internalNumber} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="licensePlate">Kennzeichen</Label>
        <Input id="licensePlate" name="licensePlate" required defaultValue={vehicle?.licensePlate} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="brand">Marke</Label>
          <Input id="brand" name="brand" required defaultValue={vehicle?.brand} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="model">Modell</Label>
          <Input id="model" name="model" required defaultValue={vehicle?.model} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="year">Baujahr</Label>
          <Input id="year" name="year" type="number" defaultValue={vehicle?.year ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mileage">Kilometer</Label>
          <Input id="mileage" name="mileage" type="number" required defaultValue={vehicle?.mileage ?? 0} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="category">Kategorie</Label>
          <SelectField id="category" name="category" defaultValue={vehicle?.category ?? VehicleCategory.SEDAN}>
            {Object.values(VehicleCategory).map((category) => (
              <option key={category} value={category}>
                {vehicleCategoryLabels[category]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <SelectField id="status" name="status" defaultValue={vehicle?.status ?? VehicleStatus.AVAILABLE}>
            {Object.values(VehicleStatus).map((status) => (
              <option key={status} value={status}>
                {vehicleStatusLabels[status]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fuelType">Antrieb</Label>
        <SelectField id="fuelType" name="fuelType" defaultValue={vehicle?.fuelType ?? FuelType.DIESEL}>
          {Object.values(FuelType).map((fuelType) => (
            <option key={fuelType} value={fuelType}>
              {fuelTypeLabels[fuelType]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" name="vin" defaultValue={vehicle?.vin ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location">Standort</Label>
        <Input id="location" name="location" defaultValue={vehicle?.location ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="imageUrl">Bild-URL</Label>
        <Input id="imageUrl" name="imageUrl" defaultValue={vehicle?.imageUrl ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={vehicle?.notes ?? ""} />
      </div>
      <input type="hidden" name="qrCodeEnabled" value="false" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="qrCodeEnabled" defaultChecked={vehicle?.qrCodeEnabled ?? true} />
        QR-Code aktiviert
      </label>
      <Button type="submit">Fahrzeug speichern</Button>
    </form>
  );
}
