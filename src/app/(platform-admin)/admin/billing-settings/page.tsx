import { requireRole } from "@/lib/auth";
import { getOrCreateBillingSettings } from "@/lib/invoicing";
import { prisma } from "@/lib/prisma";
import { updatePlatformBillingSettings } from "@/server/billing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "Rechnungseinstellungen" };
export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  await requireRole(["PLATFORM_ADMIN"]);
  const data = await getOrCreateBillingSettings(prisma);
  const complete = Boolean(data.legalName && data.vatId && data.addressLine1 && data.postalCode && data.city);

  return (
    <div className="grid max-w-4xl gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Rechnungswesen</p>
        <h1 className="mt-2 text-3xl font-semibold">Rechnungssteller-Stammdaten</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Diese Angaben erscheinen als Aussteller auf jeder Rechnung. Pflichtangaben gemäß § 11 UStG: Firmenname,
          vollständige Adresse und UID-Nummer. Ohne diese Daten können keine Rechnungen finalisiert werden.
        </p>
        {!complete ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Stammdaten unvollständig – bitte ausfüllen, bevor Rechnungen versendet werden.
          </p>
        ) : null}
      </div>

      <form action={updatePlatformBillingSettings}>
        <Card>
          <CardHeader>
            <CardTitle>Aussteller & Steuer</CardTitle>
            <CardDescription>Rechtlicher Name, Anschrift und Umsatzsteuerdaten.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="legalName" label="Firmenname (rechtlich)" defaultValue={data.legalName} required />
              <Field name="vatId" label="UID-Nummer (z.B. ATU12345678)" defaultValue={data.vatId} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="addressLine1" label="Straße & Hausnummer" defaultValue={data.addressLine1} required />
              <Field name="addressLine2" label="Adresszusatz (optional)" defaultValue={data.addressLine2 ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="postalCode" label="PLZ" defaultValue={data.postalCode} required />
              <Field name="city" label="Ort" defaultValue={data.city} required />
              <Field name="country" label="Land (ISO)" defaultValue={data.country} required />
            </div>
            <Field
              name="registrationInfo"
              label="Firmenbuch/Gericht (optional, z.B. FN 123456a, LG Feldkirch)"
              defaultValue={data.registrationInfo ?? ""}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kontakt & Bankverbindung</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="email" label="Rechnungs-E-Mail" type="email" defaultValue={data.email} required />
              <Field name="phone" label="Telefon (optional)" defaultValue={data.phone ?? ""} />
              <Field name="website" label="Website (optional)" defaultValue={data.website ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="iban" label="IBAN" defaultValue={data.iban ?? ""} />
              <Field name="bic" label="BIC" defaultValue={data.bic ?? ""} />
              <Field name="bankName" label="Bank" defaultValue={data.bankName ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rechnungsparameter</CardTitle>
            <CardDescription>Nummernkreis, Steuersatz und Zahlungsziel.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="invoiceNumberPrefix" label="Rechnungsnummern-Präfix" defaultValue={data.invoiceNumberPrefix} required />
              <Field name="taxRatePercent" label="Standard-USt-Satz (%)" type="number" defaultValue={String(data.taxRatePercent)} required />
              <Field name="paymentTermsDays" label="Zahlungsziel (Tage)" type="number" defaultValue={String(data.paymentTermsDays)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reverseChargeNote">Reverse-Charge-Hinweis</Label>
              <Textarea id="reverseChargeNote" name="reverseChargeNote" defaultValue={data.reverseChargeNote} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="footerNote">Fußzeile (optional, z.B. Hinweise/Geschäftsführung)</Label>
              <Textarea id="footerNote" name="footerNote" defaultValue={data.footerNote ?? ""} />
            </div>
            <p className="text-xs text-muted-foreground">
              Aktueller Rechnungszähler: {data.invoiceCounter}. Die nächste finalisierte Rechnung erhält die Nummer{" "}
              <strong>
                {data.invoiceNumberPrefix}-{String(data.invoiceCounter + 1).padStart(5, "0")}
              </strong>
              .
            </p>
            <div>
              <Button type="submit">Stammdaten speichern</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
