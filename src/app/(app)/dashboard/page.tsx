import {
  AlertTriangle,
  CalendarCheck,
  Car,
  Gauge,
  ShieldAlert,
  TrendingUp,
  Wrench,
  Milestone
} from "lucide-react";
import { DashboardChart } from "@/components/app/dashboard-chart";
import { MetricCard } from "@/components/app/metric-card";
import { UsageBars } from "@/components/app/usage-bars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard";
import { bookingStatusLabels, maintenanceStatusLabels, statusTone } from "@/lib/labels";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime, formatValidUntil } from "@/lib/utils";

export const metadata = {
  title: "Dashboard"
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardData(user.companyId);
  const chartData = [
    { name: "Fahrzeuge", value: data.metrics.totalVehicles },
    { name: "Verfuegbar", value: data.metrics.availableVehicles },
    { name: "Buchungen", value: data.metrics.pendingBookings + data.metrics.approvedBookingsThisMonth },
    { name: "Fahrten", value: data.metrics.activeTrips },
    { name: "Schaeden", value: data.metrics.openDamageReports }
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">Guten Tag, {user.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {data.company.subscriptionTier === "TRIAL"
              ? `Testphase bis ${formatValidUntil(data.company.trialEndDate)} · ${data.plan.name}`
              : `Plan: ${data.plan.name}`}
          </p>
        </div>
        <Badge tone={data.company.subscriptionTier === "TRIAL" ? "warning" : "success"}>
          {data.company.subscriptionTier === "TRIAL" ? "Trial aktiv" : "Abo aktiv"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Fahrzeuge" value={data.metrics.totalVehicles} icon={Car} />
        <MetricCard label="Verfuegbar" value={data.metrics.availableVehicles} icon={CalendarCheck} />
        <MetricCard label="Aktive Fahrten" value={data.metrics.activeTrips} icon={Gauge} />
        <MetricCard label="Offene Schaeden" value={data.metrics.openDamageReports} icon={AlertTriangle} />
        <MetricCard label="Pending Buchungen" value={data.metrics.pendingBookings} icon={TrendingUp} />
        <MetricCard label="Wartung naechste 30 Tage" value={data.metrics.upcomingMaintenanceCount} icon={Wrench} />
        <MetricCard label="Wartungskosten Monat" value={formatCurrency(data.metrics.maintenanceCostsThisMonth)} icon={Wrench} />
        <MetricCard label="Fahrerlaubnis laeuft ab" value={data.metrics.expiringDrivers} icon={ShieldAlert} />
        {data.metrics.vehiclesNearServiceCount > 0 && (
          <MetricCard label="Service faellig" value={data.metrics.vehiclesNearServiceCount} icon={Milestone} />
        )}
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
            {data.upcomingMaintenance.length === 0 ? <p className="text-sm text-muted-foreground">Keine Termine.</p> : null}
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
                <p className="mt-1 text-muted-foreground">Gueltig bis {formatDate(driver.licenseValidUntil)}</p>
              </div>
            ))}
            {data.expiringDrivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine bald ablaufenden Fahrerlaubnisse.</p>
            ) : null}
          </CardContent>
        </Card>
        {data.vehiclesNearService.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Service faellig</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.vehiclesNearService.map((v) => {
                const kmLeft = (v.nextServiceMileage ?? 0) - v.mileage;
                return (
                  <div key={v.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{v.licensePlate}</p>
                      <Badge tone={kmLeft <= 0 ? "danger" : "warning"}>
                        {kmLeft <= 0 ? "Ueberfaellig" : `${kmLeft.toLocaleString("de-DE")} km`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{v.brand} {v.model}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
