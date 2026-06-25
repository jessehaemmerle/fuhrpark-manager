import { addDays } from "date-fns";
import { LicenseCheckResult } from "@prisma/client";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { recordLicenseCheck } from "@/server/compliance-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { licenseCheckResultLabels, statusTone } from "@/lib/labels";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Führerscheinkontrolle"
};

export default async function CompliancePage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "complianceAccess");

  const drivers = await prisma.user.findMany({
    where: { companyId: user.companyId, role: { not: "PLATFORM_ADMIN" } },
    orderBy: { name: "asc" },
    include: {
      licenseChecks: {
        orderBy: { checkedAt: "desc" },
        take: 3
      }
    }
  });

  const now = new Date();
  const soonThreshold = addDays(now, 14);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Compliance"
        title="Führerscheinkontrolle"
        description={`Regelmäßige Sichtprüfung der Fahrerlaubnis zur Erfüllung der Halterhaftung. Prüfintervall: ${company.licenseCheckIntervalDays} Tage.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>Fahrer und Prüfstatus</CardTitle>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <EmptyState
              title="Keine Fahrer vorhanden"
              description="Sobald Nutzer angelegt sind, erscheinen hier deren Führerscheinkontrollen."
            />
          ) : (
            <div className="grid gap-4">
              {drivers.map((driver) => {
                const licenseExpired = driver.licenseValidUntil ? driver.licenseValidUntil < now : false;
                const overdue = driver.nextLicenseCheckDue ? driver.nextLicenseCheckDue < now : false;
                const dueSoon =
                  !overdue && driver.nextLicenseCheckDue
                    ? driver.nextLicenseCheckDue <= soonThreshold
                    : false;

                return (
                  <div key={driver.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{driver.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{driver.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {driver.driverBlocked ? <Badge tone="danger">Gesperrt</Badge> : null}
                        {driver.driverApproved ? <Badge tone="success">Fahrberechtigt</Badge> : null}
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">Führerscheinklasse</dt>
                        <dd className="mt-1 font-medium">{driver.licenseClass ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Nummer</dt>
                        <dd className="mt-1 font-medium">{driver.licenseNumber ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Gültig bis</dt>
                        <dd className="mt-1 flex items-center gap-2 font-medium">
                          {formatDate(driver.licenseValidUntil)}
                          {licenseExpired ? <Badge tone="danger">Abgelaufen</Badge> : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Letzte Prüfung</dt>
                        <dd className="mt-1 font-medium">{formatDate(driver.lastLicenseCheckDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Nächste Prüfung fällig</dt>
                        <dd className="mt-1 flex items-center gap-2 font-medium">
                          {formatDate(driver.nextLicenseCheckDue)}
                          {overdue ? (
                            <Badge tone="danger">Überfällig</Badge>
                          ) : dueSoon ? (
                            <Badge tone="warning">Bald fällig</Badge>
                          ) : null}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                      <form action={recordLicenseCheck} className="grid gap-3 rounded-md border bg-muted/30 p-3">
                        <p className="text-sm font-medium">Kontrolle erfassen</p>
                        <input type="hidden" name="userId" value={driver.id} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label htmlFor={`result-${driver.id}`}>Ergebnis</Label>
                            <SelectField id={`result-${driver.id}`} name="result" defaultValue={LicenseCheckResult.VALID}>
                              {Object.values(LicenseCheckResult).map((result) => (
                                <option key={result} value={result}>
                                  {licenseCheckResultLabels[result]}
                                </option>
                              ))}
                            </SelectField>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`method-${driver.id}`}>Methode</Label>
                            <Input id={`method-${driver.id}`} name="method" placeholder="z. B. Sichtprüfung vor Ort" />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`notes-${driver.id}`}>Notizen</Label>
                          <Textarea id={`notes-${driver.id}`} name="notes" />
                        </div>
                        <div>
                          <Button size="sm">Kontrolle speichern</Button>
                        </div>
                      </form>

                      <div className="rounded-md border p-3">
                        <p className="text-sm font-medium">Letzte Kontrollen</p>
                        {driver.licenseChecks.length === 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">Noch keine Kontrolle erfasst.</p>
                        ) : (
                          <ul className="mt-3 grid gap-2">
                            {driver.licenseChecks.map((check) => (
                              <li key={check.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">{formatDate(check.checkedAt)}</span>
                                <Badge tone={statusTone(check.result)}>{licenseCheckResultLabels[check.result]}</Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
