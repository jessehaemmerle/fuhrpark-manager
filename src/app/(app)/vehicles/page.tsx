import Link from "next/link";
import { Prisma, FuelType, VehicleCategory, VehicleStatus } from "@prisma/client";
import { Plus } from "lucide-react";
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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Fleet Management</p>
        <h1 className="mt-2 text-3xl font-semibold">Fahrzeuge</h1>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-3 md:grid-cols-5">
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
            <Button type="submit" variant="outline">Filtern</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Fahrzeugliste</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pr-4">Kennzeichen</th>
                  <th className="py-3 pr-4">Fahrzeug</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Kategorie</th>
                  <th className="py-3 pr-4">km</th>
                  <th className="py-3 pr-4">Service</th>
                  <th className="py-3 pr-4">Naechste Belegung</th>
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
                    <td className="py-3 pr-4">
                      {vehicle.nextServiceMileage != null ? (
                        (() => {
                          const km = vehicle.nextServiceMileage - vehicle.mileage;
                          return km <= 0 ? (
                            <Badge tone="danger">Faellig</Badge>
                          ) : km <= 1000 ? (
                            <Badge tone="warning">{km.toLocaleString("de-DE")} km</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">{km.toLocaleString("de-DE")} km</span>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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
            {vehicles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Keine Fahrzeuge gefunden.</p> : null}
          </CardContent>
        </Card>

        <Card>
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

export function VehicleForm({
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
    nextServiceMileage: number | null;
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
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="brand">Marke</Label>
          <Input id="brand" name="brand" required defaultValue={vehicle?.brand} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="model">Modell</Label>
          <Input id="model" name="model" required defaultValue={vehicle?.model} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="year">Baujahr</Label>
          <Input id="year" name="year" type="number" defaultValue={vehicle?.year ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mileage">Kilometer</Label>
          <Input id="mileage" name="mileage" type="number" required defaultValue={vehicle?.mileage ?? 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
        <Label htmlFor="nextServiceMileage">Service-Kilometerstand</Label>
        <Input
          id="nextServiceMileage"
          name="nextServiceMileage"
          type="number"
          placeholder="z.B. 50000"
          defaultValue={vehicle?.nextServiceMileage ?? ""}
        />
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
      <Button type="submit">Speichern</Button>
    </form>
  );
}
