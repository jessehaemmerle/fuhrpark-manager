import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_CONFIG, UNLIMITED_LIMIT } from "@/lib/plans";

const features = [
  ["maxVehicles", "Fahrzeuge"],
  ["maxUsers", "Nutzer"],
  ["maxDepartments", "Abteilungen"],
  ["maxActiveBookings", "aktive Buchungen"],
  ["maxMonthlyTripLogs", "Fahrten/Monat"],
  ["maxMonthlyDamageReports", "Schaeden/Monat"]
] as const;

const flags = [
  ["analyticsAccess", "Analytics"],
  ["csvExportAccess", "CSV-Export"],
  ["customBrandingAccess", "Branding"],
  ["qrCodeAccess", "QR-Workflows"],
  ["maintenanceModuleAccess", "Wartung"],
  ["driverPermissionAccess", "Fahrerfreigaben"],
  ["prioritySupport", "Priority Support"]
] as const;

function limitLabel(value: number) {
  return value >= UNLIMITED_LIMIT ? "Unbegrenzt" : String(value);
}

export function PricingCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.values(PLAN_CONFIG).map((plan) => (
        <Card key={plan.tier} className={plan.tier === "PROFESSIONAL" ? "border-primary shadow-soft" : ""}>
          <CardHeader>
            <div className="text-sm text-muted-foreground">{plan.tier === "TRIAL" ? "Starten" : "Skalieren"}</div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <div className="text-2xl font-semibold">{plan.monthlyPrice}</div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 text-sm">
              {features.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{limitLabel(plan[key])}</span>
                </div>
              ))}
            </div>
            {!compact ? (
              <div className="grid gap-2 text-sm">
                {flags.map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    {plan[key] ? <Check className="h-4 w-4 text-teal-700" /> : <Minus className="h-4 w-4 text-zinc-400" />}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Button asChild variant={plan.tier === "PROFESSIONAL" ? "default" : "outline"}>
              <Link href={plan.tier === "TRIAL" ? "/register" : "/contact"}>
                {plan.tier === "TRIAL" ? "Free Trial starten" : "Upgrade anfragen"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
