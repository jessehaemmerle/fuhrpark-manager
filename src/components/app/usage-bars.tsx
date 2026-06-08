import { Progress } from "@/components/ui/progress";
import { type CompanyUsage, getLimitForMetric, type PlanConfig, type UsageMetric, UNLIMITED_LIMIT } from "@/lib/plans";

const labels: Record<UsageMetric, string> = {
  vehicles: "Fahrzeuge",
  users: "Nutzer",
  departments: "Abteilungen",
  activeBookings: "Aktive Buchungen",
  monthlyTripLogs: "Fahrten diesen Monat",
  monthlyDamageReports: "Schaeden diesen Monat"
};

export function UsageBars({ usage, plan }: { usage: CompanyUsage; plan: PlanConfig }) {
  const metrics = Object.keys(labels) as UsageMetric[];

  return (
    <div className="grid gap-4">
      {metrics.map((metric) => {
        const limit = getLimitForMetric(plan, metric);
        const value = usage[metric];
        const percent = limit >= UNLIMITED_LIMIT ? 8 : (value / limit) * 100;

        return (
          <div key={metric}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{labels[metric]}</span>
              <span className="text-muted-foreground">
                {value} / {limit >= UNLIMITED_LIMIT ? "unbegrenzt" : limit}
              </span>
            </div>
            <Progress value={percent} />
          </div>
        );
      })}
    </div>
  );
}
