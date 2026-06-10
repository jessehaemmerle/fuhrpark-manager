import { updateCompanySettings } from "@/server/actions";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireOwner } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Einstellungen"
};

export default async function SettingsPage() {
  const user = await requireAuth();
  requireOwner(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const plan = getPlan(company);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Mandant"
        title="Einstellungen"
        description="Firmendaten, Branding und Aufbewahrungsdauer verwalten."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Firmendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCompanySettings} className="grid gap-4">
            <Field name="name" label="Firmenname" defaultValue={company.name} />
            <Field name="logoUrl" label="Logo-URL" defaultValue={company.logoUrl ?? ""} />
            <Field name="primaryBrandColor" label="Primärfarbe" defaultValue={company.primaryBrandColor} />
            <div className="grid gap-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea id="address" name="address" defaultValue={company.address ?? ""} />
            </div>
            <Field name="country" label="Land (ISO)" defaultValue={company.country} />
            <Field name="contactEmail" label="Kontakt-E-Mail" type="email" defaultValue={company.contactEmail} />
            <Field name="contactPhone" label="Telefon" defaultValue={company.contactPhone ?? ""} />
            <Field name="retentionPeriodDays" label="Aufbewahrung Fahrtenbuch (Tage)" type="number" defaultValue={company.retentionPeriodDays} />
            {!plan.customBrandingAccess ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Custom Branding ist im aktuellen Plan eingeschränkt. Upgrade auf Professional für Logo und Farbbranding.
              </p>
            ) : null}
            <Button>Speichern</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text"
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
