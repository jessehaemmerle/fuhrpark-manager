import { TripType } from "@prisma/client";
import { correctTripLog, finishTrip, startTrip } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, isFleetAdmin } from "@/lib/auth";
import { tripTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Fahrtenbuch"
};

export default async function TripLogPage() {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);
  const [trips, vehicles, approvedBookings] = await Promise.all([
    prisma.tripLog.findMany({
      where: { companyId: user.companyId, userId: manager ? undefined : user.id },
      include: { vehicle: true, user: true, booking: true },
      orderBy: { startAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        userId: manager ? undefined : user.id,
        status: "APPROVED"
      },
      include: { vehicle: true },
      orderBy: { startAt: "asc" },
      take: 20
    })
  ]);

  const activeTrips = trips.filter((trip) => !trip.endAt);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Digitales Fahrtenbuch</p>
        <h1 className="mt-2 text-3xl font-semibold">Fahrtenbuch</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Fahrtdaten werden zur Fuhrparkabrechnung, steuerlichen Dokumentation und Fahrzeugnutzung erhoben. Zugriff ist
          rollenbasiert beschraenkt; abgeschlossene Fahrten werden nicht still veraendert, sondern mit Korrekturhinweisen
          dokumentiert.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Fahrten</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="mb-4 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/trip-logs">CSV exportieren</a>
              </Button>
            </div>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pr-4">Fahrzeug</th>
                  <th className="py-3 pr-4">Fahrer</th>
                  <th className="py-3 pr-4">Zeitraum</th>
                  <th className="py-3 pr-4">Kilometer</th>
                  <th className="py-3 pr-4">Zweck</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{trip.vehicle.licensePlate}</td>
                    <td className="py-3 pr-4">{trip.user.name}</td>
                    <td className="py-3 pr-4">
                      {formatDateTime(trip.startAt)} bis {formatDateTime(trip.endAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {trip.startMileage} - {trip.endMileage ?? "..."} ({trip.distance ?? 0} km)
                    </td>
                    <td className="py-3 pr-4">
                      {trip.purpose}
                      <div className="text-xs text-muted-foreground">{tripTypeLabels[trip.tripType]}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={trip.endAt ? "success" : "warning"}>{trip.endAt ? "Abgeschlossen" : "Aktiv"}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="grid gap-2">
                        {!trip.endAt ? (
                          <form action={finishTrip} className="flex flex-wrap gap-2">
                            <input type="hidden" name="tripLogId" value={trip.id} />
                            <Input className="w-32" name="endMileage" type="number" placeholder="End-km" required />
                            <Button size="sm">Beenden</Button>
                          </form>
                        ) : null}
                        {manager && trip.endAt ? (
                          <form action={correctTripLog} className="flex flex-wrap gap-2">
                            <input type="hidden" name="tripLogId" value={trip.id} />
                            <Input className="w-56" name="correctionNote" placeholder="Korrekturhinweis" required />
                            <Button size="sm" variant="outline">Notiz</Button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trips.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Keine Fahrten.</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fahrt starten</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={startTrip} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="vehicleId">Fahrzeug</Label>
                  <SelectField id="vehicleId" name="vehicleId" required>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.licensePlate} · {vehicle.brand} {vehicle.model}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bookingId">Buchung</Label>
                  <SelectField id="bookingId" name="bookingId">
                    <option value="">Ohne Buchung</option>
                    {approvedBookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.vehicle.licensePlate} · {formatDateTime(booking.startAt)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Field name="startMileage" label="Start-km" type="number" />
                <Field name="startLocation" label="Startort" />
                <Field name="destination" label="Ziel" />
                <div className="grid gap-2">
                  <Label htmlFor="purpose">Zweck</Label>
                  <Textarea id="purpose" name="purpose" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tripType">Fahrtart</Label>
                  <SelectField id="tripType" name="tripType" defaultValue={TripType.BUSINESS}>
                    {Object.values(TripType).map((type) => (
                      <option key={type} value={type}>
                        {tripTypeLabels[type]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Button>Fahrt starten</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktive Fahrten</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{trip.vehicle.licensePlate}</p>
                  <p className="text-muted-foreground">{trip.user.name} · seit {formatDateTime(trip.startAt)}</p>
                </div>
              ))}
              {activeTrips.length === 0 ? <p className="text-sm text-muted-foreground">Keine aktive Fahrt.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}
