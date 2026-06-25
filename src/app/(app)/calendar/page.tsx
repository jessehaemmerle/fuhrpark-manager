import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth, isFleetAdmin } from "@/lib/auth";
import { bookingStatusLabels, maintenanceStatusLabels, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Kalender"
};

type AgendaItem = {
  id: string;
  kind: "booking" | "maintenance";
  startAt: Date;
  endAt: Date;
  licensePlate: string;
  label: string;
  status: string;
  statusLabel: string;
};

export default async function CalendarPage() {
  const user = await requireAuth();
  const manager = isFleetAdmin(user.role);

  const now = new Date();
  const horizon = addDays(now, 30);

  const bookingUserScope = manager ? {} : { userId: user.id };

  const [bookings, maintenance, overdueBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ["PENDING", "APPROVED"] },
        startAt: { gte: now, lte: horizon },
        ...bookingUserScope
      },
      include: { vehicle: true, user: true },
      orderBy: { startAt: "asc" }
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        startAt: { gte: now, lte: horizon }
      },
      include: { vehicle: true },
      orderBy: { startAt: "asc" }
    }),
    prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: "APPROVED",
        endAt: { lt: now },
        ...bookingUserScope
      },
      include: { vehicle: true, user: true },
      orderBy: { endAt: "asc" }
    })
  ]);

  const items: AgendaItem[] = [
    ...bookings.map((booking) => ({
      id: booking.id,
      kind: "booking" as const,
      startAt: booking.startAt,
      endAt: booking.endAt,
      licensePlate: booking.vehicle.licensePlate,
      label: booking.user.name,
      status: booking.status,
      statusLabel: bookingStatusLabels[booking.status]
    })),
    ...maintenance.map((record) => ({
      id: record.id,
      kind: "maintenance" as const,
      startAt: record.startAt,
      endAt: record.endAt,
      licensePlate: record.vehicle.licensePlate,
      label: record.title,
      status: record.status,
      statusLabel: maintenanceStatusLabels[record.status]
    }))
  ];

  items.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const days = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = format(startOfDay(item.startAt), "yyyy-MM-dd");
    const bucket = days.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      days.set(key, [item]);
    }
  }

  const dayEntries = Array.from(days.entries());
  const hasContent = dayEntries.length > 0 || overdueBookings.length > 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kalender"
        title="Buchungs- & Verfügbarkeitskalender"
        description="Geplante Buchungen und Wartungsfenster der nächsten 30 Tage auf einen Blick."
      />

      {overdueBookings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Überfällig</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {overdueBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{booking.vehicle.licensePlate}</p>
                    <p className="mt-1 text-muted-foreground">{booking.user.name}</p>
                    <p className="mt-1 text-muted-foreground">
                      Rückgabe fällig: {formatDateTime(booking.endAt)}
                    </p>
                  </div>
                  <Badge tone="danger">Überfällig</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {dayEntries.map(([key, dayItems]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>
              {format(new Date(key), "EEEE, dd.MM.yyyy", { locale: de })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {dayItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{item.licensePlate}</p>
                      <Badge tone={item.kind === "booking" ? "neutral" : "warning"}>
                        {item.kind === "booking" ? "Buchung" : "Wartung"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-muted-foreground">
                      {formatDateTime(item.startAt)} bis {formatDateTime(item.endAt)}
                    </p>
                  </div>
                  <Badge tone={statusTone(item.status)}>{item.statusLabel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {!hasContent ? (
        <EmptyState
          title="Nichts geplant"
          description={`Für den Zeitraum bis ${formatDate(horizon)} sind keine Buchungen oder Wartungen eingetragen.`}
        />
      ) : null}
    </div>
  );
}
