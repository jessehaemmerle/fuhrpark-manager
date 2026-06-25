import QRCode from "qrcode";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { updateCompanySettings } from "@/server/actions";
import {
  confirmTwoFactor,
  disableTwoFactor,
  initTwoFactor,
  regenerateRecoveryCodes,
  updateNotificationPreferences
} from "@/server/security-actions";
import { PageHeader } from "@/components/app/page-header";
import { RecoveryCodesNotice } from "@/components/app/recovery-codes-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth, requireOwner } from "@/lib/auth";
import { SUPPORTED_LOCALES, localeLabels } from "@/lib/i18n";
import { getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { buildOtpAuthUrl } from "@/lib/totp";

export const metadata = {
  title: "Einstellungen"
};

export default async function SettingsPage() {
  const user = await requireAuth();
  requireOwner(user);
  const [company, account] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId } }),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { notifyByEmail: true, twoFactorEnabled: true, twoFactorSecret: true, email: true }
    })
  ]);
  const plan = getPlan(company);

  const recoveryRaw = cookies().get("fb_recovery_codes")?.value;
  const recoveryCodes = recoveryRaw ? recoveryRaw.split(",").filter(Boolean) : [];

  const setupSecret = !account.twoFactorEnabled ? account.twoFactorSecret : null;
  const setupQrSvg = setupSecret
    ? await QRCode.toString(buildOtpAuthUrl({ secret: setupSecret, account: account.email }), {
        type: "svg",
        margin: 1,
        width: 200
      })
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Mandant"
        title="Einstellungen"
        description="Firmendaten, Branding, Compliance-Intervalle, Benachrichtigungen und Sicherheit verwalten."
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
            <div className="grid gap-2">
              <Label htmlFor="locale">Sprache</Label>
              <SelectField id="locale" name="locale" defaultValue={company.locale}>
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {localeLabels[locale]}
                  </option>
                ))}
              </SelectField>
            </div>
            <Field name="retentionPeriodDays" label="Aufbewahrung Fahrtenbuch (Tage)" type="number" defaultValue={company.retentionPeriodDays} />
            <Field
              name="licenseCheckIntervalDays"
              label="Intervall Führerscheinkontrolle (Tage)"
              type="number"
              defaultValue={company.licenseCheckIntervalDays}
            />
            {!plan.customBrandingAccess ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Custom Branding ist im aktuellen Plan eingeschränkt. Upgrade auf Professional für Logo und Farbbranding.
              </p>
            ) : null}
            <Button>Speichern</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Persönliche Benachrichtigungen</CardTitle>
          <CardDescription>Steuern Sie, ob Sie Benachrichtigungen zusätzlich per E-Mail erhalten.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateNotificationPreferences} className="grid gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notifyByEmail" defaultChecked={account.notifyByEmail} />
              Benachrichtigungen auch per E-Mail senden
            </label>
            <Button size="sm">Speichern</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-3xl" id="security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden /> Zwei-Faktor-Authentifizierung
          </CardTitle>
          <CardDescription>Zusätzlicher Schutz für Ihren Inhaber-Zugang per Authenticator-App (TOTP).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {recoveryCodes.length > 0 ? <RecoveryCodesNotice codes={recoveryCodes} /> : null}

          {account.twoFactorEnabled ? (
            <>
              <Badge tone="success">Aktiv</Badge>
              <form action={regenerateRecoveryCodes}>
                <Button size="sm" variant="outline">Neue Recovery-Codes erzeugen</Button>
              </form>
              <form action={disableTwoFactor} className="grid max-w-xs gap-2">
                <Label htmlFor="disable-code">Code zum Deaktivieren</Label>
                <Input id="disable-code" name="code" inputMode="numeric" placeholder="6-stelliger Code" />
                <Button size="sm" variant="destructive">2FA deaktivieren</Button>
              </form>
            </>
          ) : setupQrSvg ? (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div
                className="flex aspect-square items-center justify-center rounded-md border bg-white p-3"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: setupQrSvg }}
              />
              <div className="grid content-start gap-3 text-sm">
                <p>1. Scannen Sie den QR-Code mit Ihrer Authenticator-App.</p>
                <p className="break-all text-muted-foreground">
                  Manuell: <span className="font-mono">{setupSecret}</span>
                </p>
                <form action={confirmTwoFactor} className="grid max-w-xs gap-2">
                  <Label htmlFor="confirm-code">2. Code aus der App eingeben</Label>
                  <Input id="confirm-code" name="code" inputMode="numeric" placeholder="6-stelliger Code" required />
                  <Button size="sm">Aktivieren</Button>
                </form>
              </div>
            </div>
          ) : (
            <form action={initTwoFactor}>
              <Button size="sm">2FA einrichten</Button>
            </form>
          )}
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
