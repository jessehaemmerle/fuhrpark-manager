import { LicenseStatus, SubscriptionTier, UserRole } from "@prisma/client";
import {
  archivePlatformLicense,
  createPlatformLicense,
  deletePlatformLicense,
  updatePlatformLicense,
  updatePlatformUserAccess
} from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { licenseStatusLabels, roleLabels, statusTone, tierLabels } from "@/lib/labels";
import { getCompanyUsage, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Super Admin"
};

export const dynamic = "force-dynamic";

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function futureDateInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
}

function limitValue(value: number | null | undefined) {
  return value?.toString() ?? "";
}

export default async function PlatformAdminPage() {
  await requireRole(["PLATFORM_ADMIN"]);
  const [companies, licenses, users] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, vehicles: true, departments: true, licenses: true }
        }
      }
    }),
    prisma.license.findMany({
      include: { company: true, createdBy: true },
      orderBy: [{ status: "asc" }, { validUntil: "desc" }, { createdAt: "desc" }]
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
  const activeLicenses = licenses.filter((license) => license.status === "ACTIVE").length;
  const archivedLicenses = licenses.filter((license) => license.status === "ARCHIVED").length;
  const accessRows = users.sort((a, b) => a.company.name.localeCompare(b.company.name) || a.name.localeCompare(b.name));

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Super Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Lizenzen & Zugänge</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Dieser Bereich ist von der normalen Mandanten-App getrennt und verwaltet Lizenzschluessel, Laufzeiten,
          Mandantenstatus und Plattformzugänge.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Mandanten" value={companies.length} />
        <Stat label="Aktive Lizenzen" value={activeLicenses} tone="success" />
        <Stat label="Archivierte Lizenzen" value={archivedLicenses} tone="danger" />
        <Stat label="Zugänge" value={users.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Lizenz generieren</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPlatformLicense} className="grid gap-4 lg:grid-cols-4">
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="companyId">Mandant</Label>
              <SelectField id="companyId" name="companyId">
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <Field name="name" label="Lizenzname" defaultValue="Jahreslizenz" />
            <div className="grid gap-2">
              <Label htmlFor="tier">Lizenz</Label>
              <SelectField id="tier" name="tier" defaultValue={SubscriptionTier.PROFESSIONAL}>
                {Object.values(SubscriptionTier).map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabels[tier]}
                  </option>
                ))}
              </SelectField>
            </div>
            <Field name="validFrom" label="Gueltig ab" type="date" defaultValue={dateInputValue(new Date())} />
            <Field name="validUntil" label="Gueltig bis" type="date" defaultValue={futureDateInput(365)} />
            <Field name="maxUsers" label="Nutzerlimit" type="number" />
            <Field name="maxVehicles" label="Fahrzeuglimit" type="number" />
            <div className="grid gap-2 lg:col-span-3">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="flex items-end">
              <Button>Lizenz generieren</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bestehende Lizenzen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Lizenzen generiert.</p>
          ) : (
            licenses.map((license) => (
              <div key={license.id} className="grid gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{license.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {license.licenseKey} · {license.company.name} · Erstellt von {license.createdBy?.name ?? "System"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={statusTone(license.status)}>{licenseStatusLabels[license.status]}</Badge>
                    <Badge>{tierLabels[license.tier]}</Badge>
                    <Badge>Bis {formatDate(license.validUntil)}</Badge>
                  </div>
                </div>
                <form action={updatePlatformLicense} className="grid gap-3 lg:grid-cols-6">
                  <input type="hidden" name="licenseId" value={license.id} />
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor={`name-${license.id}`}>Lizenzname</Label>
                    <Input id={`name-${license.id}`} name="name" defaultValue={license.name} />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor={`company-${license.id}`}>Mandant</Label>
                    <SelectField id={`company-${license.id}`} name="companyId" defaultValue={license.companyId}>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`status-${license.id}`}>Status</Label>
                    <SelectField id={`status-${license.id}`} name="status" defaultValue={license.status}>
                      {Object.values(LicenseStatus).map((status) => (
                        <option key={status} value={status}>
                          {licenseStatusLabels[status]}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`tier-${license.id}`}>Lizenz</Label>
                    <SelectField id={`tier-${license.id}`} name="tier" defaultValue={license.tier}>
                      {Object.values(SubscriptionTier).map((tier) => (
                        <option key={tier} value={tier}>
                          {tierLabels[tier]}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <Field name="validFrom" label="Gueltig ab" type="date" defaultValue={dateInputValue(license.validFrom)} idSuffix={license.id} />
                  <Field name="validUntil" label="Gueltig bis" type="date" defaultValue={dateInputValue(license.validUntil)} idSuffix={license.id} />
                  <Field name="maxUsers" label="Nutzerlimit" type="number" defaultValue={limitValue(license.maxUsers)} idSuffix={license.id} />
                  <Field name="maxVehicles" label="Fahrzeuglimit" type="number" defaultValue={limitValue(license.maxVehicles)} idSuffix={license.id} />
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor={`notes-${license.id}`}>Notizen</Label>
                    <Textarea id={`notes-${license.id}`} name="notes" defaultValue={license.notes ?? ""} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm">Speichern</Button>
                  </div>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={archivePlatformLicense}>
                    <input type="hidden" name="licenseId" value={license.id} />
                    <Button size="sm" variant="outline" disabled={license.status === "ARCHIVED"}>
                      Archivieren
                    </Button>
                  </form>
                  <form action={deletePlatformLicense}>
                    <input type="hidden" name="licenseId" value={license.id} />
                    <Button size="sm" variant="destructive">Loeschen</Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mandantenstatus</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {companyRows.map(({ company, usage, plan }) => (
            <div key={company.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-xs text-muted-foreground">
                  {company.contactEmail} · {company._count.licenses} Lizenzen · {usage.users}/{plan.maxUsers === 999999 ? "unbegrenzt" : plan.maxUsers} Nutzer · {usage.vehicles}/
                  {plan.maxVehicles === 999999 ? "unbegrenzt" : plan.maxVehicles} Fahrzeuge
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={company.active ? "success" : "danger"}>{company.active ? "Aktiv" : "Gesperrt"}</Badge>
                <Badge>{tierLabels[company.subscriptionTier]}</Badge>
                <Badge>Trial/Lizenz bis {formatDate(company.trialEndDate)}</Badge>
              </div>
            </div>
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

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "danger" }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <Badge tone={tone} className="mt-3">{label}</Badge>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  idSuffix
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  idSuffix?: string;
}) {
  const id = idSuffix ? `${name}-${idSuffix}` : name;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
