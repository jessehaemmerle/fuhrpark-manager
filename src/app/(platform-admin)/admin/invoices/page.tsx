import Link from "next/link";
import { InvoiceTaxMode } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getOrCreateBillingSettings, formatEuroCents, type InvoiceLineItem } from "@/lib/invoicing";
import { invoiceStatusLabels, invoiceTaxModeLabels, statusTone, tierLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  cancelInvoice,
  createInvoiceForLicense,
  deleteInvoiceDraft,
  issueAndSendInvoice,
  markInvoicePaid,
  resendInvoice,
  updateInvoiceDraft
} from "@/server/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "Rechnungen" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireRole(["PLATFORM_ADMIN"]);

  const [settings, invoices, billableLicenses] = await Promise.all([
    getOrCreateBillingSettings(prisma),
    prisma.invoice.findMany({
      where: { company: { isPlatformCompany: false } },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        tier: true,
        taxMode: true,
        taxRatePercent: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        servicePeriodStart: true,
        servicePeriodEnd: true,
        netAmountCents: true,
        taxAmountCents: true,
        grossAmountCents: true,
        lineItems: true,
        notes: true,
        sentTo: true,
        paidAt: true,
        createdAt: true,
        company: { select: { name: true, country: true, vatId: true, contactEmail: true, billingEmail: true } },
        license: { select: { name: true } }
      }
    }),
    prisma.license.findMany({
      where: { company: { isPlatformCompany: false }, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, tier: true, company: { select: { name: true } } }
    })
  ]);

  const settingsComplete = Boolean(
    settings.legalName && settings.vatId && settings.addressLine1 && settings.postalCode && settings.city
  );

  const outstandingCents = invoices
    .filter((i) => i.status === "ISSUED" || i.status === "SENT")
    .reduce((acc, i) => acc + i.grossAmountCents, 0);
  const paidCents = invoices.filter((i) => i.status === "PAID").reduce((acc, i) => acc + i.grossAmountCents, 0);
  const draftCount = invoices.filter((i) => i.status === "DRAFT").length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Rechnungswesen</p>
        <h1 className="mt-2 text-3xl font-semibold">Rechnungen</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Entwürfe entstehen automatisch bei der Lizenz-Anlage. Beim Finalisieren wird die fortlaufende
          Rechnungsnummer vergeben, das PDF erzeugt und per E-Mail mit Anhang versendet.
        </p>
      </div>

      {!settingsComplete ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Die Rechnungssteller-Stammdaten sind unvollständig. Bitte zuerst unter{" "}
          <Link href="/admin/billing-settings" className="font-semibold underline">
            Rechnungseinstellungen
          </Link>{" "}
          Name, Adresse und UID hinterlegen – sonst lassen sich keine Rechnungen finalisieren.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Offen (unbezahlt)" value={formatEuroCents(outstandingCents)} tone="warning" />
        <Stat label="Bezahlt" value={formatEuroCents(paidCents)} tone="success" />
        <Stat label="Entwürfe" value={String(draftCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entwurf aus Lizenz erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          {billableLicenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine aktiven Lizenzen vorhanden.</p>
          ) : (
            <form action={createInvoiceForLicense} className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-[280px] flex-1 gap-2">
                <Label htmlFor="licenseId">Lizenz</Label>
                <SelectField id="licenseId" name="licenseId">
                  {billableLicenses.map((license) => (
                    <option key={license.id} value={license.id}>
                      {license.company.name} · {license.name} ({tierLabels[license.tier]})
                    </option>
                  ))}
                </SelectField>
              </div>
              <Button type="submit" variant="outline">
                Entwurf erstellen
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Rechnungen vorhanden.
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => {
            const lineItems = (invoice.lineItems as unknown as InvoiceLineItem[]) ?? [];
            const description = lineItems[0]?.description ?? "";
            const netEuros = (invoice.netAmountCents / 100).toFixed(2);

            return (
              <Card key={invoice.id}>
                <CardContent className="grid gap-4 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {invoice.invoiceNumber ?? "Entwurf"} · {invoice.company.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.license?.name ? `${invoice.license.name} · ` : ""}
                        Leistungszeitraum {formatDate(invoice.servicePeriodStart)} – {formatDate(invoice.servicePeriodEnd)}
                        {invoice.issueDate ? ` · Rechnungsdatum ${formatDate(invoice.issueDate)}` : ""}
                        {invoice.dueDate ? ` · fällig ${formatDate(invoice.dueDate)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(invoice.status)}>{invoiceStatusLabels[invoice.status]}</Badge>
                      <Badge>{tierLabels[invoice.tier]}</Badge>
                      <Badge>{invoiceTaxModeLabels[invoice.taxMode]}</Badge>
                      <span className="text-lg font-semibold">{formatEuroCents(invoice.grossAmountCents, invoice.currency)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Netto {formatEuroCents(invoice.netAmountCents, invoice.currency)} ·{" "}
                    {invoice.taxMode === "REVERSE_CHARGE"
                      ? "USt 0 % (Reverse Charge)"
                      : `USt ${invoice.taxRatePercent} % = ${formatEuroCents(invoice.taxAmountCents, invoice.currency)}`}
                    {!invoice.company.vatId && invoice.company.country !== "AT" ? (
                      <span className="ml-2 text-amber-700">· Hinweis: Kunde ohne UID</span>
                    ) : null}
                  </div>

                  {invoice.status === "DRAFT" ? (
                    <div className="grid gap-4 rounded-md border bg-muted/20 p-4">
                      <form action={updateInvoiceDraft} className="grid gap-3">
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <div className="grid gap-2">
                          <Label htmlFor={`desc-${invoice.id}`}>Beschreibung</Label>
                          <Input id={`desc-${invoice.id}`} name="description" defaultValue={description} required />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="grid gap-2">
                            <Label htmlFor={`net-${invoice.id}`}>Netto (EUR)</Label>
                            <Input id={`net-${invoice.id}`} name="netAmountEuros" type="number" step="0.01" min="0" defaultValue={netEuros} required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`mode-${invoice.id}`}>Steuerbehandlung</Label>
                            <SelectField id={`mode-${invoice.id}`} name="taxMode" defaultValue={invoice.taxMode}>
                              {Object.values(InvoiceTaxMode).map((mode) => (
                                <option key={mode} value={mode}>
                                  {invoiceTaxModeLabels[mode]}
                                </option>
                              ))}
                            </SelectField>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`rate-${invoice.id}`}>USt-Satz (%)</Label>
                            <Input id={`rate-${invoice.id}`} name="taxRatePercent" type="number" min="0" max="99" defaultValue={String(invoice.taxRatePercent)} required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`notes-${invoice.id}`}>Notiz auf Rechnung (optional)</Label>
                          <Textarea id={`notes-${invoice.id}`} name="notes" defaultValue={invoice.notes ?? ""} />
                        </div>
                        <div>
                          <Button type="submit" size="sm" variant="outline">
                            Entwurf speichern
                          </Button>
                        </div>
                      </form>

                      <div className="flex flex-wrap items-end gap-3 border-t pt-4">
                        <form action={issueAndSendInvoice} className="flex flex-wrap items-end gap-3">
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <div className="grid min-w-[260px] gap-2">
                            <Label htmlFor={`to-${invoice.id}`}>Empfänger (optional, Standard: {invoice.company.billingEmail ?? invoice.company.contactEmail})</Label>
                            <Input id={`to-${invoice.id}`} name="recipientEmail" type="email" placeholder={invoice.company.billingEmail ?? invoice.company.contactEmail} />
                          </div>
                          <Button type="submit" size="sm">Finalisieren & senden</Button>
                        </form>
                        <form action={deleteInvoiceDraft}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <Button type="submit" size="sm" variant="destructive">Entwurf löschen</Button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2 border-t pt-4">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                      </Button>
                      {invoice.status !== "CANCELLED" ? (
                        <>
                          <form action={resendInvoice} className="flex items-end gap-2">
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <Input name="recipientEmail" type="email" placeholder={invoice.sentTo ?? invoice.company.billingEmail ?? invoice.company.contactEmail} className="h-9 w-56" />
                            <Button type="submit" size="sm" variant="outline">Erneut senden</Button>
                          </form>
                          {invoice.status === "ISSUED" || invoice.status === "SENT" ? (
                            <form action={markInvoicePaid}>
                              <input type="hidden" name="invoiceId" value={invoice.id} />
                              <Button type="submit" size="sm" variant="outline">Als bezahlt markieren</Button>
                            </form>
                          ) : null}
                          <form action={cancelInvoice}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <Button type="submit" size="sm" variant="destructive">Stornieren</Button>
                          </form>
                        </>
                      ) : null}
                      {invoice.sentTo ? <span className="text-xs text-muted-foreground">Zuletzt an {invoice.sentTo}</span> : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <Badge tone={tone} className="mt-3">{label}</Badge>
    </div>
  );
}
