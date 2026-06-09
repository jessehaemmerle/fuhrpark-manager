import {
  AlertTriangle,
  CalendarCheck,
  Car,
  Gauge,
  ShieldAlert,
  TrendingUp,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { DashboardChart } from "@/components/app/dashboard-chart";
import { EmptyState } from "@/components/app/empty-state";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { UsageBars } from "@/components/app/usage-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard";
import { bookingStatusLabels, maintenanceStatusLabels, statusTone } from "@/lib/labels";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Dashboard"
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardData(user.companyId);
  const chartData = [
    { name: "Fahrzeuge", value: data.metrics.totalVehicles },
    { name: "Verfügbar", value: data.metrics.availableVehicles },
    { name: "Buchungen", value: data.metrics.pendingBookings + data.metrics.approvedBookingsThisMonth },
    { name: "Fahrten", value: data.metrics.activeTrips },
    { name: "Schäden", value: data.metrics.openDamageReports }
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Guten Tag, ${user.name}`}
        description={
          <>
            Trial bis {formatDate(data.company.trialEndDate)} · Plan {data.plan.name}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/bookings">Buchung anfragen</Link>
            </Button>
            <Button asChild>
              <Link href="/trip-log">Fahrt starten</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Fahrzeuge" value={data.metrics.totalVehicles} icon={Car} />
        <MetricCard label="Verfügbar" value={data.metrics.availableVehicles} icon={CalendarCheck} />
        <MetricCard label="Aktive Fahrten" value={data.metrics.activeTrips} icon={Gauge} />
        <MetricCard label="Offene Schäden" value={data.metrics.openDamageReports} icon={AlertTriangle} />
        <MetricCard label="Offene Buchungen" value={data.metrics.pendingBookings} icon={TrendingUp} />
        <MetricCard label="Wartung nächste 30 Tage" value={data.metrics.upcomingMaintenanceCount} icon={Wrench} />
        <MetricCard label="Wartungskosten Monat" value={formatCurrency(data.metrics.maintenanceCostsThisMonth)} icon={Wrench} />
        <MetricCard label="Fahrerlaubnis läuft ab" value={data.metrics.expiringDrivers} icon={ShieldAlert} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operativer Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan-Nutzung</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageBars usage={data.usage} plan={data.plan} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Buchungen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.recentBookings.map((booking) => (
              <div key={booking.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{booking.vehicle.licensePlate}</span>
                  <Badge tone={statusTone(booking.status)}>{bookingStatusLabels[booking.status]}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{booking.user.name}</p>
                <p className="mt-1 text-muted-foreground">{formatDateTime(booking.startAt)}</p>
              </div>
            ))}
            {data.recentBookings.length === 0 ? (
              <EmptyState
                title="Keine aktuellen Buchungen"
                description="Sobald eine Buchung erstellt oder genehmigt wird, erscheint sie hier."
                action={
                  <Button asChild size="sm">
                    <Link href="/bookings">Buchung anfragen</Link>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Anstehende Wartung</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.upcomingMaintenance.map((record) => (
              <div key={record.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{record.title}</span>
                  <Badge tone={statusTone(record.status)}>{maintenanceStatusLabels[record.status]}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{record.vehicle.licensePlate}</p>
                <p className="mt-1 text-muted-foreground">{formatDateTime(record.startAt)}</p>
              </div>
            ))}
            {data.upcomingMaintenance.length === 0 ? (
              <EmptyState title="Keine anstehenden Termine" description="Geplante Wartungen erscheinen automatisch in dieser Übersicht." />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fahrerfreigaben</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.expiringDrivers.map((driver) => (
              <div key={driver.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{driver.name}</p>
                <p className="mt-1 text-muted-foreground">Gültig bis {formatDate(driver.licenseValidUntil)}</p>
              </div>
            ))}
            {data.expiringDrivers.length === 0 ? (
              <EmptyState title="Keine bald ablaufenden Fahrerlaubnisse" description="Fahrerfreigaben mit Ablaufdatum werden hier frühzeitig sichtbar." />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
