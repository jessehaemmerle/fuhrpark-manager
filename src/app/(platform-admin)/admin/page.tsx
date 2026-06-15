import { randomBytes } from "crypto";
import { LicenseStatus, SubscriptionTier, UserRole } from "@prisma/client";
import {
  archivePlatformLicense,
  createPlatformCompany,
  createPlatformLicense,
  deletePlatformLicense,
  updatePlatformCompany,
  updatePlatformLicense,
  updatePlatformUserAccess
} from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function temporaryPassword() {
  return `Fb7-${randomBytes(10).toString("base64url")}`;
}

export default async function PlatformAdminPage() {
  await requireRole(["PLATFORM_ADMIN"]);
  const tenantWhere = { isPlatformCompany: false };
  const [companies, licenses, users] = await Promise.all([
    prisma.company.findMany({
      where: tenantWhere,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, vehicles: true, departments: true, licenses: true }
        }
      }
    }),
    prisma.license.findMany({
      where: { company: tenantWhere },
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
  const tenantRoles = Object.values(UserRole).filter((role) => role !== UserRole.PLATFORM_ADMIN);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Super Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Mandanten, Lizenzen & Zugänge</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Dieser Bereich ist von der normalen Mandanten-App getrennt und verwaltet Mandanten, Lizenzschluessel,
          Laufzeiten und Plattformzugänge.
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
          <CardTitle>Mandant anlegen</CardTitle>
          <CardDescription>Mandanten koennen ohne Lizenz vorbereitet und spaeter separat lizenziert werden.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPlatformCompany} className="grid gap-4 lg:grid-cols-4">
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="tenantName">Firmenname</Label>
              <Input id="tenantName" name="name" autoComplete="organization" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenantContactEmail">Kontakt-E-Mail</Label>
              <Input id="tenantContactEmail" name="contactEmail" type="email" autoComplete="email" required />
            </div>
            <Field name="contactPhone" label="Telefon" idSuffix="tenant-new" />
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="tenantAddress">Adresse</Label>
              <Textarea id="tenantAddress" name="address" />
            </div>
            <Field name="country" label="Land (ISO)" defaultValue="DE" idSuffix="tenant-new" />
            <div className="grid gap-2">
              <Label htmlFor="tenantPrimaryBrandColor">Primaerfarbe</Label>
              <Input id="tenantPrimaryBrandColor" name="primaryBrandColor" type="color" defaultValue="#0f766e" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenantSubscriptionTier">Plan</Label>
              <SelectField id="tenantSubscriptionTier" name="subscriptionTier" defaultValue={SubscriptionTier.TRIAL}>
                {Object.values(SubscriptionTier).map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabels[tier]}
                  </option>
                ))}
              </SelectField>
            </div>
            <Field name="trialDays" label="Gueltigkeit (Tage)" type="number" defaultValue="14" idSuffix="tenant-new" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked />
              Aktiv
            </label>
            <div className="flex items-end">
              <Button>Mandant anlegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neue Lizenz generieren</CardTitle>
          <CardDescription>Optional kann direkt ein Erstzugang mit Einmalpasswort angelegt werden.</CardDescription>
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
            <div className="grid gap-4 rounded-md border bg-muted/20 p-4 lg:col-span-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">Erstzugang</p>
                  <p className="text-sm text-muted-foreground">
                    Der Nutzer meldet sich mit dem Einmalpasswort an und vergibt danach ein eigenes Passwort.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="createInitialUser" />
                  Nutzer anlegen
                </label>
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="initialUserName">Name</Label>
                  <Input id="initialUserName" name="initialUserName" autoComplete="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="initialUserEmail">E-Mail</Label>
                  <Input id="initialUserEmail" name="initialUserEmail" type="email" autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="initialUserRole">Rolle</Label>
                  <SelectField id="initialUserRole" name="initialUserRole" defaultValue={UserRole.OWNER}>
                    {tenantRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="initialUserTemporaryPassword">Einmalpasswort</Label>
                  <Input
                    id="initialUserTemporaryPassword"
                    name="initialUserTemporaryPassword"
                    defaultValue={temporaryPassword()}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
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
        <CardContent className="grid gap-4">
          {companyRows.map(({ company, usage, plan }) => (
            <form key={company.id} action={updatePlatformCompany} className="grid gap-4 border-b pb-4 last:border-0 last:pb-0">
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_150px_150px_110px_120px] lg:items-end">
                <div className="grid gap-2">
                  <Label htmlFor={`tenant-name-${company.id}`}>Firmenname</Label>
                  <Input id={`tenant-name-${company.id}`} name="name" defaultValue={company.name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tenant-email-${company.id}`}>Kontakt-E-Mail</Label>
                  <Input id={`tenant-email-${company.id}`} name="contactEmail" type="email" defaultValue={company.contactEmail} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`tenant-tier-${company.id}`}>Plan</Label>
                  <SelectField id={`tenant-tier-${company.id}`} name="subscriptionTier" defaultValue={company.subscriptionTier}>
                    {Object.values(SubscriptionTier).map((tier) => (
                      <option key={tier} value={tier}>
                        {tierLabels[tier]}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Field name="trialEndDate" label="Gueltig bis" type="date" defaultValue={dateInputValue(company.trialEndDate)} idSuffix={company.id} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={company.active} />
                  Aktiv
                </label>
                <Button size="sm">Speichern</Button>
              </div>
              <input type="hidden" name="country" value={company.country} />
              <input type="hidden" name="primaryBrandColor" value={company.primaryBrandColor} />
              <input type="hidden" name="contactPhone" value={company.contactPhone ?? ""} />
              <input type="hidden" name="address" value={company.address ?? ""} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {company.contactEmail} · {company._count.licenses} Lizenzen · {usage.users}/{plan.maxUsers === 999999 ? "unbegrenzt" : plan.maxUsers} Nutzer · {usage.vehicles}/
                  {plan.maxVehicles === 999999 ? "unbegrenzt" : plan.maxVehicles} Fahrzeuge
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={company.active ? "success" : "danger"}>{company.active ? "Aktiv" : "Gesperrt"}</Badge>
                  <Badge>{tierLabels[company.subscriptionTier]}</Badge>
                  <Badge>Trial/Lizenz bis {formatDate(company.trialEndDate)}</Badge>
                </div>
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
                    {(user.company.isPlatformCompany ? [UserRole.PLATFORM_ADMIN] : tenantRoles).map((role) => (
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
                  <Label htmlFor={`password-${user.id}`}>Einmalpasswort</Label>
                  <Input id={`password-${user.id}`} name="password" autoComplete="new-password" />
                </div>
                <Button size="sm">Zugang speichern</Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>{roleLabels[user.role]}</Badge>
                <Badge tone={user.active ? "success" : "danger"}>{user.active ? "Aktiv" : "Inaktiv"}</Badge>
                {user.company.isPlatformCompany ? (
                  <Badge tone="success">Plattformzugang</Badge>
                ) : (
                  <Badge tone={user.company.active ? "success" : "danger"}>{user.company.active ? "Mandant aktiv" : "Mandant gesperrt"}</Badge>
                )}
                {user.mustChangePassword ? <Badge tone="warning">Passwortwechsel offen</Badge> : null}
                {user.temporaryPasswordIssuedAt ? <Badge tone="warning">Einmalpasswort aktiv</Badge> : null}
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
  defaultValue?: string | number;
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
