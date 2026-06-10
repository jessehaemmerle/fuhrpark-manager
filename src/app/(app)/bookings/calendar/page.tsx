import Link from "next/link";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subWeeks
} from "date-fns";
import { de } from "date-fns/locale";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Buchungskalender" };

export default async function BookingCalendarPage({
  searchParams
}: {
  searchParams: { week?: string };
}) {
  const user = await requireAuth();

  const weekStart = startOfWeek(
    searchParams.week ? new Date(searchParams.week) : new Date(),
    { weekStartsOn: 1 }
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [vehicles, bookings] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId: user.companyId, status: { not: "RETIRED" } },
      orderBy: { licensePlate: "asc" }
    }),
    prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ["PENDING", "APPROVED"] },
        startAt: { lt: weekEnd },
        endAt: { gt: weekStart }
      },
      include: { user: { select: { name: true } } },
      orderBy: { startAt: "asc" }
    })
  ]);

  const prevWeek = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Buchungsworkflow</p>
          <h1 className="mt-2 text-3xl font-semibold">Buchungskalender</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/bookings/calendar?week=${prevWeek}`}>&larr; Vorwoche</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/bookings/calendar">Heute</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/bookings/calendar?week=${nextWeek}`}>Naechste &rarr;</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/bookings" className="text-muted-foreground hover:text-foreground">
          ← Listenansicht
        </Link>
        <span className="font-medium">
          {format(weekStart, "d. MMMM", { locale: de })} –{" "}
          {format(weekEnd, "d. MMMM yyyy", { locale: de })}
        </span>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-36 border border-zinc-200 bg-zinc-50 p-2 text-left font-medium text-muted-foreground">
                  Fahrzeug
                </th>
                {days.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const isToday = dayStr === todayStr;
                  return (
                    <th
                      key={dayStr}
                      className={`border border-zinc-200 p-2 text-center font-medium ${isToday ? "bg-primary/10" : "bg-zinc-50"}`}
                    >
                      <span className="block text-xs text-muted-foreground">
                        {format(day, "EEE", { locale: de })}
                      </span>
                      <span className={isToday ? "text-primary font-semibold" : ""}>
                        {format(day, "d.M.")}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const vBookings = bookings.filter((b) => b.vehicleId === vehicle.id);
                return (
                  <tr key={vehicle.id}>
                    <td className="border border-zinc-200 p-2 align-top">
                      <p className="font-medium">{vehicle.licensePlate}</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </td>
                    {days.map((day) => {
                      const dayStart = new Date(day);
                      dayStart.setHours(0, 0, 0, 0);
                      const dayEnd = new Date(day);
                      dayEnd.setHours(23, 59, 59, 999);

                      const dayBookings = vBookings.filter(
                        (b) => b.startAt <= dayEnd && b.endAt >= dayStart
                      );
                      const dayStr = format(day, "yyyy-MM-dd");
                      const isToday = dayStr === todayStr;

                      return (
                        <td
                          key={dayStr}
                          className={`border border-zinc-200 p-1 align-top ${isToday ? "bg-primary/5" : ""}`}
                        >
                          {dayBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className={`mb-1 rounded p-1 text-xs ${
                                booking.status === "APPROVED"
                                  ? "border border-green-300 bg-green-50"
                                  : "border border-amber-300 bg-amber-50"
                              }`}
                            >
                              <p className="truncate font-medium">{booking.user.name}</p>
                              <p className="truncate text-muted-foreground">{booking.purpose}</p>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {vehicles.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-zinc-200 py-8 text-center text-muted-foreground"
                  >
                    Keine Fahrzeuge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-green-300 bg-green-50" />
          Genehmigt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-50" />
          Ausstehend
        </span>
      </div>
    </div>
  );
}
