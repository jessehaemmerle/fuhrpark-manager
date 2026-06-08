import { BookingStatus } from "@prisma/client";
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

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Booking Workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Buchungen</h1>
      </div>
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
              <Button variant="outline">Filtern</Button>
            </form>
            <div className="overflow-x-auto">
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
                              <Button size="sm" variant="outline">Abschliessen</Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Keine Buchungen.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buchung anfragen</CardTitle>
          </CardHeader>
          <CardContent>
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
              <Button>Absenden</Button>
            </form>
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
