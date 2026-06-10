import { DamageSeverity, TripType } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { DepartmentBookingsChart, DamageSeverityChart, VehicleUtilizationChart } from "@/components/app/report-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { getReportData } from "@/lib/dashboard";
import { damageSeverityLabels, tripTypeLabels } from "@/lib/labels";
import { getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Reports"
};

const exportLabels: Record<string, string> = {
  vehicles: "Fahrzeuge",
  bookings: "Buchungen",
  maintenance: "Wartung",
  users: "Nutzer",
  departments: "Abteilungen",
  "trip-logs": "Fahrtenbuch",
  "damage-reports": "Schäden",
  handovers: "Übergaben"
};

export default async function ReportsPage({
  searchParams
}: {
  searchParams: { start?: string; end?: string; vehicleId?: string; userId?: string; departmentId?: string; tripType?: TripType; damageSeverity?: DamageSeverity };
}) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const plan = getPlan(company);
  const [vehicles, users, departments] = await Promise.all([
    prisma.vehicle.findMany({ where: { companyId: user.companyId }, orderBy: { licensePlate: "asc" } }),
    prisma.user.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } })
  ]);

  if (!plan.analyticsAccess) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow="Analytics" title="Reports" />
        <Card>
          <CardContent className="grid gap-4 pt-5">
            <p className="font-semibold">Analytics ist in Ihrem aktuellen Plan nicht enthalten.</p>
            <p className="text-sm text-muted-foreground">
              Wechseln Sie auf Professional oder Enterprise, um Auslastung, Kosten, Schadenanalysen und erweiterte
              Reports zu nutzen.
            </p>
            <Button asChild className="w-fit">
              <a href="/subscription">Plan wechseln</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportData = await getReportData(user.companyId, searchParams);
  const canExportTenantAdminData = user.role === "OWNER" || user.role === "PLATFORM_ADMIN";
  const exportTypes = [
    "vehicles",
    "bookings",
    "maintenance",
    ...(canExportTenantAdminData ? ["users", "departments"] : []),
    "trip-logs",
    "damage-reports",
    "handovers"
  ];
  const hasFilters = Boolean(
    searchParams.start ||
      searchParams.end ||
      searchParams.vehicleId ||
      searchParams.userId ||
      searchParams.departmentId ||
      searchParams.tripType ||
      searchParams.damageSeverity
  );
  const reportSummary = {
    bookings: reportData.vehicleUtilization.reduce((sum, vehicle) => sum + vehicle.bookings, 0),
    distance: reportData.vehicleUtilization.reduce((sum, vehicle) => sum + vehicle.distance, 0),
    maintenanceCost: reportData.vehicleUtilization.reduce((sum, vehicle) => sum + vehicle.maintenanceCost, 0),
    damages: reportData.damageBySeverity.reduce((sum, row) => sum + row.count, 0)
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Auslastung, Kilometer, Schäden und Buchungen nach Zeitraum und Organisation auswerten."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-[repeat(7,minmax(120px,1fr))_auto_auto]">
            <Field name="start" label="Von" type="date" defaultValue={searchParams.start} />
            <Field name="end" label="Bis" type="date" defaultValue={searchParams.end} />
            <SelectBlock name="vehicleId" label="Fahrzeug" defaultValue={searchParams.vehicleId ?? ""}>
              <option value="">Alle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate}</option>
              ))}
            </SelectBlock>
            <SelectBlock name="departmentId" label="Abteilung" defaultValue={searchParams.departmentId ?? ""}>
              <option value="">Alle</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </SelectBlock>
            <SelectBlock name="userId" label="Nutzer" defaultValue={searchParams.userId ?? ""}>
              <option value="">Alle</option>
              {users.map((reportUser) => (
                <option key={reportUser.id} value={reportUser.id}>{reportUser.name}</option>
              ))}
            </SelectBlock>
            <SelectBlock name="tripType" label="Fahrtart" defaultValue={searchParams.tripType ?? ""}>
              <option value="">Alle</option>
              {Object.values(TripType).map((type) => (
                <option key={type} value={type}>{tripTypeLabels[type]}</option>
              ))}
            </SelectBlock>
            <SelectBlock name="damageSeverity" label="Schwere" defaultValue={searchParams.damageSeverity ?? ""}>
              <option value="">Alle</option>
              {Object.values(DamageSeverity).map((severity) => (
                <option key={severity} value={severity}>{damageSeverityLabels[severity]}</option>
              ))}
            </SelectBlock>
            <Button variant="outline" className="md:col-span-4 xl:col-span-1">Anwenden</Button>
            {hasFilters ? (
              <Button asChild variant="ghost" className="md:col-span-4 xl:col-span-1">
                <Link href="/reports">Zurücksetzen</Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportSummary label="Buchungen" value={reportSummary.bookings.toLocaleString("de-DE")} />
        <ReportSummary label="Kilometer" value={`${reportSummary.distance.toLocaleString("de-DE")} km`} />
        <ReportSummary label="Wartungskosten" value={formatCurrency(reportSummary.maintenanceCost)} />
        <ReportSummary label="Schäden" value={reportSummary.damages.toLocaleString("de-DE")} />
      </div>

      <div className="flex flex-wrap gap-2">
        {exportTypes.map((type) => (
          <Button key={type} asChild variant="outline" size="sm">
            <a href={`/api/export/${type}`}>{exportLabels[type]} exportieren</a>
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Fahrzeugauslastung und Kilometer</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleUtilizationChart data={reportData.vehicleUtilization} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schäden nach Schweregrad</CardTitle>
          </CardHeader>
          <CardContent>
            <DamageSeverityChart data={reportData.damageBySeverity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Buchungen nach Abteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentBookingsChart data={reportData.bookingsByDepartment} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  defaultValue
}: {
  name: string;
  label: string;
  type: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function SelectBlock({
  name,
  label,
  defaultValue,
  children
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <SelectField id={name} name={name} defaultValue={defaultValue}>
        {children}
      </SelectField>
    </div>
  );
}
