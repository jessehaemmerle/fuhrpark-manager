import "server-only";

import { getOrCreateBillingSettings, type InvoiceLineItem } from "@/lib/invoicing";
import { renderInvoicePdf, type InvoiceBuyer, type InvoiceSeller } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";

/** Erzeugt das Rechnungs-PDF frisch aus den gespeicherten Snapshots. */
export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!invoice.invoiceNumber || !invoice.issueDate || !invoice.dueDate || !invoice.sellerSnapshot || !invoice.buyerSnapshot) {
    throw new Error("Rechnung ist noch nicht finalisiert.");
  }

  const settings = await getOrCreateBillingSettings(prisma);
  const bytes = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    servicePeriodStart: invoice.servicePeriodStart,
    servicePeriodEnd: invoice.servicePeriodEnd,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    lineItems: (invoice.lineItems as unknown as InvoiceLineItem[]) ?? [],
    netAmountCents: invoice.netAmountCents,
    taxRatePercent: invoice.taxRatePercent,
    taxAmountCents: invoice.taxAmountCents,
    grossAmountCents: invoice.grossAmountCents,
    taxMode: invoice.taxMode,
    reverseChargeNote: settings.reverseChargeNote,
    paymentTermsDays: settings.paymentTermsDays,
    footerNote: settings.footerNote,
    notes: invoice.notes,
    seller: invoice.sellerSnapshot as unknown as InvoiceSeller,
    buyer: invoice.buyerSnapshot as unknown as InvoiceBuyer
  });
  return Buffer.from(bytes);
}

/** Liefert das gespeicherte PDF, erzeugt es bei Bedarf neu und persistiert es. */
export async function getInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; invoiceNumber: string } | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, invoiceNumber: true, status: true, pdf: true }
  });
  if (!invoice || invoice.status === "DRAFT" || !invoice.invoiceNumber) return null;

  if (invoice.pdf) {
    return { buffer: invoice.pdf as Buffer, invoiceNumber: invoice.invoiceNumber };
  }

  const buffer = await generateInvoicePdf(invoiceId);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { pdf: buffer } });
  return { buffer, invoiceNumber: invoice.invoiceNumber };
}
