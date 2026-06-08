import { SubscriptionTier, UserRole } from "@prisma/client";
import { updatePlatformCompanyLicense, updatePlatformUserAccess } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { requireRole } from "@/lib/auth";
import { roleLabels, tierLabels } from "@/lib/labels";
import { getCompanyUsage, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Super Admin"
};

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function PlatformAdminPage() {
  await requireRole(["PLATFORM_ADMIN"]);
  const [companies, users] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, vehicles: true, departments: true }
        }
      }
    }),
    prisma.user.findMany({
      include: { company: true },
      orderBy: { name: "asc" }
    })
  ]);

  const companyRows = await Promise.all(
    companies.map(async (company) => ({
      company,
      plan: getPlan(company),
      usage: await getCompanyUsage(company.id)
    }))
  );
  const accessRows = users.sort((a, b) => a.company.name.localeCompare(b.company.name) || a.name.localeCompare(b.name));

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Super Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Lizenzen & Zugänge</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Zentrale Verwaltung fuer Mandantenstatus, Subscription-Tiers, Trial-Laufzeiten und Benutzerzugriffe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mandantenlizenzen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {companyRows.map(({ company, usage, plan }) => (
            <form key={company.id} action={updatePlatformCompanyLicense} className="grid gap-4 border-b pb-4 last:border-0 last:pb-0">
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_160px_160px_110px_130px] lg:items-end">
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {company.contactEmail} · {company.country} · {company._count.users} Nutzer · {company._count.vehicles} Fahrzeuge
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nutzung: {usage.users}/{plan.maxUsers === 999999 ? "∞" : plan.maxUsers} Nutzer, {usage.vehicles}/
                    {plan.maxVehicles === 999999 ? "∞" : plan.maxVehicles} Fahrzeuge
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tier-${company.id}`}>Lizenz</Label>
                  <SelectField id={`tier-${company.id}`} name="subscriptionTier" defaultValue={company.subscriptionTier}>
                    {Object.values(SubscriptionTier).map((tier) => (
                      <option key={tier} value={tier}>
                        {tierLabels[tier]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`trial-${company.id}`}>Trial bis</Label>
                  <Input id={`trial-${company.id}`} name="trialEndDate" type="date" defaultValue={dateInputValue(company.trialEndDate)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={company.active} />
                  Aktiv
                </label>
                <Button size="sm">Speichern</Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone={company.active ? "success" : "danger"}>{company.active ? "Aktiv" : "Gesperrt"}</Badge>
                <Badge>{tierLabels[company.subscriptionTier]}</Badge>
                <Badge tone={company.trialEndDate < new Date() ? "danger" : "neutral"}>Trial bis {formatDate(company.trialEndDate)}</Badge>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zugänge</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {accessRows.map((user) => (
            <form key={user.id} action={updatePlatformUserAccess} className="grid gap-4 border-b pb-4 last:border-0 last:pb-0">
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_170px_120px_minmax(180px,0.7fr)_130px] lg:items-end">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.email} · {user.company.name}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`role-${user.id}`}>Rolle</Label>
                  <SelectField id={`role-${user.id}`} name="role" defaultValue={user.role}>
                    {Object.values(UserRole).map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={user.active} />
                  Aktiv
                </label>
                <div className="grid gap-2">
                  <Label htmlFor={`password-${user.id}`}>Neues Passwort</Label>
                  <Input id={`password-${user.id}`} name="password" type="password" autoComplete="new-password" />
                </div>
                <Button size="sm">Zugang speichern</Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>{roleLabels[user.role]}</Badge>
                <Badge tone={user.active ? "success" : "danger"}>{user.active ? "Aktiv" : "Inaktiv"}</Badge>
                <Badge tone={user.company.active ? "success" : "danger"}>{user.company.active ? "Mandant aktiv" : "Mandant gesperrt"}</Badge>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
