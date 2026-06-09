import { BookingStatus } from "@prisma/client";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { approveBooking, createBooking, rejectBooking, updateBookingStatus } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, isFleetAdmin } from "@/lib/auth";
import { bookingStatusLabels, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Buchungen"
};

export default async function BookingsPage({ searchParams }: { searchParams: { status?: BookingStatus } }) {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);
  const [bookings, vehicles] = await Promise.all([
    prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: searchParams.status,
        userId: manager ? undefined : user.id
      },
      include: { vehicle: true, user: true, approvedBy: true, rejectedBy: true },
      orderBy: { startAt: "desc" }
    }),
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    })
  ]);
  const hasFilters = Boolean(searchParams.status);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Buchungen"
        title="Buchungen"
        description="Fahrzeuge anfragen, Freigaben prüfen und laufende Buchungen verwalten."
        actions={
          <Button asChild>
            <a href="#new-booking">Buchung anfragen</a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Buchungshistorie</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="flex flex-wrap gap-3">
              <SelectField name="status" defaultValue={searchParams.status ?? ""} className="max-w-56">
                <option value="">Alle Status</option>
                {Object.values(BookingStatus).map((status) => (
                  <option key={status} value={status}>
                    {bookingStatusLabels[status]}
                  </option>
                ))}
              </SelectField>
              <Button variant="outline">Anwenden</Button>
              {hasFilters ? (
                <Button asChild variant="ghost">
                  <Link href="/bookings">Zurücksetzen</Link>
                </Button>
              ) : null}
            </form>
            <div className="grid gap-3 md:hidden">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{booking.vehicle.licensePlate}</p>
                      <p className="mt-1 text-muted-foreground">{booking.user.name}</p>
                    </div>
                    <Badge tone={statusTone(booking.status)}>{bookingStatusLabels[booking.status]}</Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground">
                    {formatDateTime(booking.startAt)} bis {formatDateTime(booking.endAt)}
                  </p>
                  <p className="mt-2 font-medium">{booking.purpose}</p>
                  {booking.destination ? <p className="mt-1 text-muted-foreground">{booking.destination}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {manager && booking.status === "PENDING" ? (
                      <>
                        <form action={approveBooking}>
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <Button size="sm">Genehmigen</Button>
                        </form>
                        <form action={rejectBooking}>
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input type="hidden" name="note" value="Abgelehnt im Dashboard" />
                          <Button size="sm" variant="outline">Ablehnen</Button>
                        </form>
                      </>
                    ) : null}
                    {["PENDING", "APPROVED"].includes(booking.status) ? (
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={BookingStatus.CANCELLED} />
                        <Button size="sm" variant="ghost">Stornieren</Button>
                      </form>
                    ) : null}
                    {manager && booking.status === "APPROVED" ? (
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={BookingStatus.COMPLETED} />
                        <Button size="sm" variant="outline">Abschließen</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Fahrzeug</th>
                    <th className="py-3 pr-4">Nutzer</th>
                    <th className="py-3 pr-4">Zeitraum</th>
                    <th className="py-3 pr-4">Zweck</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{booking.vehicle.licensePlate}</td>
                      <td className="py-3 pr-4">{booking.user.name}</td>
                      <td className="py-3 pr-4">
                        {formatDateTime(booking.startAt)} bis {formatDateTime(booking.endAt)}
                      </td>
                      <td className="py-3 pr-4">
                        {booking.purpose}
                        <div className="text-xs text-muted-foreground">{booking.destination}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(booking.status)}>{bookingStatusLabels[booking.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {manager && booking.status === "PENDING" ? (
                            <>
                              <form action={approveBooking}>
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <Button size="sm">Genehmigen</Button>
                              </form>
                              <form action={rejectBooking}>
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <input type="hidden" name="note" value="Abgelehnt im Dashboard" />
                                <Button size="sm" variant="outline">Ablehnen</Button>
                              </form>
                            </>
                          ) : null}
                          {["PENDING", "APPROVED"].includes(booking.status) ? (
                            <form action={updateBookingStatus}>
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <input type="hidden" name="status" value={BookingStatus.CANCELLED} />
                              <Button size="sm" variant="ghost">Stornieren</Button>
                            </form>
                          ) : null}
                          {manager && booking.status === "APPROVED" ? (
                            <form action={updateBookingStatus}>
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <input type="hidden" name="status" value={BookingStatus.COMPLETED} />
                              <Button size="sm" variant="outline">Abschließen</Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            </div>
            {bookings.length === 0 ? (
              <EmptyState
                title="Keine Buchungen gefunden"
                description={hasFilters ? "Setzen Sie den Statusfilter zurück, um alle Buchungen zu sehen." : "Neue Buchungen erscheinen hier sofort nach dem Absenden."}
                action={
                  hasFilters ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/bookings">Filter zurücksetzen</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <a href="#new-booking">Buchung anfragen</a>
                    </Button>
                  )
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="new-booking">
          <CardHeader>
            <CardTitle>Buchung anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <EmptyState title="Keine Fahrzeuge verfügbar" description="Legen Sie zuerst ein Fahrzeug an, bevor Buchungen erstellt werden können." />
            ) : (
              <form action={createBooking} className="grid gap-4">
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
                <DateField name="startAt" label="Start" />
                <DateField name="endAt" label="Ende" />
                <div className="grid gap-2">
                  <Label htmlFor="purpose">Zweck</Label>
                  <Textarea id="purpose" name="purpose" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination">Ziel</Label>
                  <Input id="destination" name="destination" />
                </div>
                <Button>Buchung anfragen</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DateField({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="datetime-local" required />
    </div>
  );
}
