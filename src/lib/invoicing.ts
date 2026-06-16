import "server-only";

import { differenceInCalendarMonths } from "date-fns";
import type { InvoiceTaxMode, Prisma, PrismaClient, SubscriptionTier } from "@prisma/client";

import { tierLabels } from "@/lib/labels";

/**
 * Zentrale Rechnungslogik für das Plattform-Billing.
 *
 * Steuer-/Reverse-Charge-Behandlung ist für die beiden rechtlich häufigen
 * B2B-Fälle automatisiert:
 *  - Leistungsempfänger in Österreich  -> 20 % österreichische USt
 *  - Leistungsempfänger im EU-Ausland mit gültiger UID -> Reverse Charge (0 %)
 * Alle anderen Fälle (EU ohne UID, Drittland) werden konservativ mit dem
 * Standardsatz vorbelegt und können im Entwurf manuell angepasst werden.
 */

// EU-Mitgliedstaaten (ISO-3166-1 alpha-2), Stand 2026.
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK"
]);

export const PLATFORM_PRICE_FALLBACK_CENTS: Record<SubscriptionTier, number | null> = {
  TRIAL: 0,
  BASIC: 4900,
  PROFESSIONAL: 14900,
  ENTERPRISE: null
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitNetCents: number;
  netCents: number;
};

export function normalizeCountry(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().slice(0, 2);
}

export function isEuCountry(country: string | null | undefined): boolean {
  return EU_COUNTRIES.has(normalizeCountry(country));
}

/**
 * Sehr leichte Format-Plausibilisierung einer UID/VAT-ID (keine VIES-Abfrage):
 * Ländercode (2 Buchstaben) + 2–13 alphanumerische Zeichen.
 */
export function looksLikeVatId(vatId: string | null | undefined): boolean {
  if (!vatId) return false;
  const cleaned = vatId.replace(/[\s.-]/g, "").toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{2,13}$/.test(cleaned);
}

export type TaxTreatment = {
  taxMode: InvoiceTaxMode;
  taxRatePercent: number;
};

export function determineTaxTreatment(opts: {
  sellerCountry: string;
  buyerCountry: string | null | undefined;
  buyerVatId: string | null | undefined;
  standardRatePercent: number;
}): TaxTreatment {
  const seller = normalizeCountry(opts.sellerCountry) || "AT";
  const buyer = normalizeCountry(opts.buyerCountry);

  // Inland: österreichische USt.
  if (buyer === seller) {
    return { taxMode: "STANDARD", taxRatePercent: opts.standardRatePercent };
  }

  // EU-Ausland mit gültiger UID: Reverse Charge.
  if (buyer && isEuCountry(buyer) && looksLikeVatId(opts.buyerVatId)) {
    return { taxMode: "REVERSE_CHARGE", taxRatePercent: 0 };
  }

  // Restfälle (EU ohne UID, Drittland): konservativ Standardsatz, manuell prüfbar.
  return { taxMode: "STANDARD", taxRatePercent: opts.standardRatePercent };
}

/** Anzahl abzurechnender Monate einer Lizenzperiode (mindestens 1). */
export function billingMonths(periodStart: Date, periodEnd: Date): number {
  const months = differenceInCalendarMonths(periodEnd, periodStart);
  return months >= 1 ? months : 1;
}

export function computeTotals(netAmountCents: number, taxRatePercent: number) {
  const net = Math.round(netAmountCents);
  const taxAmountCents = Math.round((net * taxRatePercent) / 100);
  return {
    netAmountCents: net,
    taxAmountCents,
    grossAmountCents: net + taxAmountCents
  };
}

export function formatInvoiceNumber(prefix: string, seq: number): string {
  const cleanPrefix = (prefix || "RE").trim();
  return `${cleanPrefix}-${String(seq).padStart(5, "0")}`;
}

export function formatEuroCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format((cents ?? 0) / 100);
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Liest die Plattform-Preise aus SubscriptionPlanConfig, mit Fallback. */
export async function getPlanPriceCents(db: DbClient, tier: SubscriptionTier): Promise<number | null> {
  const config = await db.subscriptionPlanConfig.findUnique({
    where: { tier },
    select: { monthlyPriceCents: true }
  });
  if (config) return config.monthlyPriceCents;
  return PLATFORM_PRICE_FALLBACK_CENTS[tier];
}

/** Holt die (Singleton-)Rechnungssteller-Einstellungen, legt sie bei Bedarf an. */
export async function getOrCreateBillingSettings(db: DbClient) {
  const existing = await db.platformBillingSettings.findUnique({ where: { id: "platform" } });
  if (existing) return existing;
  return db.platformBillingSettings.create({ data: { id: "platform" } });
}

export function buildDefaultLineItems(opts: {
  tier: SubscriptionTier;
  periodStart: Date;
  periodEnd: Date;
  monthlyPriceCents: number | null;
}): InvoiceLineItem[] {
  const months = billingMonths(opts.periodStart, opts.periodEnd);
  const unit = opts.monthlyPriceCents ?? 0;
  const start = opts.periodStart.toLocaleDateString("de-AT");
  const end = opts.periodEnd.toLocaleDateString("de-AT");
  return [
    {
      description: `Fuhrpark-Manager Lizenz – ${tierLabels[opts.tier]} (${months} Monat${months === 1 ? "" : "e"}: ${start} – ${end})`,
      quantity: months,
      unitNetCents: unit,
      netCents: unit * months
    }
  ];
}

export function sumLineItems(items: InvoiceLineItem[]): number {
  return items.reduce((acc, item) => acc + Math.round(item.netCents), 0);
}

/**
 * Baut die Daten für einen Rechnungs-Entwurf (Status DRAFT) zu einer Lizenz.
 * Wird sowohl bei der Lizenz-Anlage (automatisch) als auch manuell genutzt.
 */
export async function buildDraftInvoiceData(
  db: DbClient,
  opts: {
    company: { id: string; country: string | null; vatId: string | null };
    license: {
      id: string;
      tier: SubscriptionTier;
      validFrom: Date;
      validUntil: Date;
    };
    createdById?: string | null;
  }
): Promise<Prisma.InvoiceCreateInput> {
  const settings = await getOrCreateBillingSettings(db);
  const monthlyPriceCents = await getPlanPriceCents(db, opts.license.tier);

  const lineItems = buildDefaultLineItems({
    tier: opts.license.tier,
    periodStart: opts.license.validFrom,
    periodEnd: opts.license.validUntil,
    monthlyPriceCents
  });
  const netAmountCents = sumLineItems(lineItems);

  const treatment = determineTaxTreatment({
    sellerCountry: settings.country,
    buyerCountry: opts.company.country,
    buyerVatId: opts.company.vatId,
    standardRatePercent: settings.taxRatePercent
  });
  const totals = computeTotals(netAmountCents, treatment.taxRatePercent);

  return {
    company: { connect: { id: opts.company.id } },
    license: { connect: { id: opts.license.id } },
    status: "DRAFT",
    tier: opts.license.tier,
    currency: "EUR",
    servicePeriodStart: opts.license.validFrom,
    servicePeriodEnd: opts.license.validUntil,
    taxMode: treatment.taxMode,
    taxRatePercent: treatment.taxRatePercent,
    netAmountCents: totals.netAmountCents,
    taxAmountCents: totals.taxAmountCents,
    grossAmountCents: totals.grossAmountCents,
    lineItems: lineItems as unknown as Prisma.InputJsonValue,
    ...(opts.createdById ? { createdBy: { connect: { id: opts.createdById } } } : {})
  };
}
