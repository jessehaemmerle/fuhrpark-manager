"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { invoiceIssuedEmail, sendEmail } from "@/lib/email";
import {
  buildDraftInvoiceData,
  computeTotals,
  formatEuroCents,
  formatInvoiceNumber,
  getOrCreateBillingSettings,
  type InvoiceLineItem
} from "@/lib/invoicing";
import { generateInvoicePdf, getInvoicePdf } from "@/lib/invoice-render";
import type { InvoiceBuyer, InvoiceSeller } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";
import { toFormDataObject } from "@/lib/utils";
import {
  billingSettingsSchema,
  createInvoiceForLicenseSchema,
  invoiceDraftSchema,
  invoiceIdSchema,
  issueInvoiceSchema
} from "@/lib/validators";

function parseForm<T>(schema: { parse: (data: unknown) => T }, formData: FormData): T {
  return schema.parse(toFormDataObject(formData));
}

export async function updatePlatformBillingSettings(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(billingSettingsSchema, formData);

  await prisma.platformBillingSettings.upsert({
    where: { id: "platform" },
    create: { id: "platform", ...data },
    update: data
  });

  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "billing.settings_changed",
    entityType: "PlatformBillingSettings",
    entityId: "platform"
  });
  revalidatePath("/admin/billing-settings");
  revalidatePath("/admin/invoices");
}

export async function createInvoiceForLicense(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { licenseId } = parseForm(createInvoiceForLicenseSchema, formData);

  const license = await prisma.license.findFirstOrThrow({
    where: { id: licenseId, company: { isPlatformCompany: false } },
    include: { company: { select: { id: true, country: true, vatId: true } } }
  });

  const data = await buildDraftInvoiceData(prisma, {
    company: license.company,
    license: { id: license.id, tier: license.tier, validFrom: license.validFrom, validUntil: license.validUntil },
    createdById: actor.id
  });
  const invoice = await prisma.invoice.create({ data });

  await writeAuditLog({
    companyId: license.companyId,
    actorUserId: actor.id,
    action: "invoice.draft_created",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { licenseId: license.id, tier: license.tier }
  });
  revalidatePath("/admin/invoices");
}

export async function updateInvoiceDraft(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(invoiceDraftSchema, formData);

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
  if (invoice.status !== "DRAFT") {
    throw new Error("Nur Entwürfe können bearbeitet werden.");
  }

  const netCents = Math.round(data.netAmountEuros * 100);
  const lineItems: InvoiceLineItem[] = [
    { description: data.description, quantity: 1, unitNetCents: netCents, netCents }
  ];
  const totals = computeTotals(netCents, data.taxRatePercent);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      taxMode: data.taxMode,
      taxRatePercent: data.taxRatePercent,
      netAmountCents: totals.netAmountCents,
      taxAmountCents: totals.taxAmountCents,
      grossAmountCents: totals.grossAmountCents,
      lineItems: lineItems as unknown as object,
      notes: data.notes ?? null
    }
  });

  await writeAuditLog({
    companyId: invoice.companyId,
    actorUserId: actor.id,
    action: "invoice.draft_updated",
    entityType: "Invoice",
    entityId: invoice.id
  });
  revalidatePath("/admin/invoices");
}

export async function deleteInvoiceDraft(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { invoiceId } = parseForm(invoiceIdSchema, formData);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status !== "DRAFT") {
    throw new Error("Nur Entwürfe können gelöscht werden. Finalisierte Rechnungen müssen storniert werden.");
  }

  await prisma.invoice.delete({ where: { id: invoice.id } });
  await writeAuditLog({
    companyId: invoice.companyId,
    actorUserId: actor.id,
    action: "invoice.draft_deleted",
    entityType: "Invoice",
    entityId: invoice.id
  });
  revalidatePath("/admin/invoices");
}

export async function issueAndSendInvoice(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { invoiceId, recipientEmail } = parseForm(issueInvoiceSchema, formData);

  const settings = await getOrCreateBillingSettings(prisma);
  if (!settings.legalName || !settings.vatId || !settings.addressLine1 || !settings.postalCode || !settings.city) {
    throw new Error("Bitte zuerst die Rechnungssteller-Stammdaten (Name, Adresse, UID) vollständig ausfüllen.");
  }

  const draft = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { company: { select: { id: true, name: true, address: true, country: true, vatId: true, billingEmail: true, contactEmail: true } } }
  });
  if (draft.status !== "DRAFT") {
    throw new Error("Diese Rechnung wurde bereits finalisiert.");
  }
  if (!draft.company.address || draft.company.address.trim().length === 0) {
    throw new Error("Bitte zuerst die Adresse des Mandanten hinterlegen (Pflichtangabe auf der Rechnung).");
  }

  const issueDate = new Date();
  const dueDate = addDays(issueDate, settings.paymentTermsDays);
  const totals = computeTotals(draft.netAmountCents, draft.taxRatePercent);

  const sellerSnapshot: InvoiceSeller = {
    legalName: settings.legalName,
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    postalCode: settings.postalCode,
    city: settings.city,
    country: settings.country,
    vatId: settings.vatId,
    registrationInfo: settings.registrationInfo,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    iban: settings.iban,
    bic: settings.bic,
    bankName: settings.bankName
  };
  const buyerSnapshot: InvoiceBuyer = {
    name: draft.company.name,
    address: draft.company.address,
    postalCodeCity: null,
    country: draft.company.country,
    vatId: draft.company.vatId,
    email: draft.company.billingEmail ?? draft.company.contactEmail
  };

  // Fortlaufende Rechnungsnummer atomar vergeben + finalisieren.
  const issued = await prisma.$transaction(async (tx) => {
    const updatedSettings = await tx.platformBillingSettings.update({
      where: { id: "platform" },
      data: { invoiceCounter: { increment: 1 } },
      select: { invoiceCounter: true, invoiceNumberPrefix: true }
    });
    const invoiceNumber = formatInvoiceNumber(updatedSettings.invoiceNumberPrefix, updatedSettings.invoiceCounter);

    return tx.invoice.update({
      where: { id: draft.id },
      data: {
        status: "ISSUED",
        invoiceNumber,
        issueDate,
        dueDate,
        netAmountCents: totals.netAmountCents,
        taxAmountCents: totals.taxAmountCents,
        grossAmountCents: totals.grossAmountCents,
        sellerSnapshot: sellerSnapshot as unknown as object,
        buyerSnapshot: buyerSnapshot as unknown as object
      }
    });
  });

  await writeAuditLog({
    companyId: draft.companyId,
    actorUserId: actor.id,
    action: "invoice.issued",
    entityType: "Invoice",
    entityId: issued.id,
    metadata: { invoiceNumber: issued.invoiceNumber, grossCents: issued.grossAmountCents }
  });

  // PDF erzeugen und speichern (außerhalb der Transaktion).
  const pdfBuffer = await generateInvoicePdf(issued.id);
  await prisma.invoice.update({
    where: { id: issued.id },
    data: { pdf: pdfBuffer }
  });

  // E-Mail mit PDF-Anhang versenden.
  const recipient = recipientEmail ?? draft.company.billingEmail ?? draft.company.contactEmail;
  const email = invoiceIssuedEmail({
    recipientName: draft.company.name,
    sellerName: settings.legalName,
    invoiceNumber: issued.invoiceNumber!,
    issueDate,
    dueDate,
    grossFormatted: formatEuroCents(issued.grossAmountCents, issued.currency),
    servicePeriod: `${issued.servicePeriodStart.toLocaleDateString("de-AT")} – ${issued.servicePeriodEnd.toLocaleDateString("de-AT")}`,
    reverseCharge: issued.taxMode === "REVERSE_CHARGE"
  });
  const result = await sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    replyTo: settings.email || undefined,
    attachments: [
      {
        filename: `Rechnung-${issued.invoiceNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
        contentType: "application/pdf"
      }
    ]
  });

  if (result.ok) {
    await prisma.invoice.update({
      where: { id: issued.id },
      data: { status: "SENT", sentAt: new Date(), sentTo: recipient }
    });
    await writeAuditLog({
      companyId: draft.companyId,
      actorUserId: actor.id,
      action: "invoice.sent",
      entityType: "Invoice",
      entityId: issued.id,
      metadata: { to: recipient }
    });
  } else {
    await writeAuditLog({
      companyId: draft.companyId,
      actorUserId: actor.id,
      action: "invoice.send_failed",
      entityType: "Invoice",
      entityId: issued.id,
      metadata: { to: recipient, error: result.error ?? "unbekannt" }
    });
  }

  revalidatePath("/admin/invoices");

  if (!result.ok) {
    throw new Error(
      `Rechnung ${issued.invoiceNumber} wurde finalisiert, aber der E-Mail-Versand schlug fehl: ${result.error ?? "unbekannt"}. Sie können sie erneut senden.`
    );
  }
}

export async function resendInvoice(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { invoiceId, recipientEmail } = parseForm(issueInvoiceSchema, formData);

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: {
      id: true,
      status: true,
      invoiceNumber: true,
      issueDate: true,
      dueDate: true,
      servicePeriodStart: true,
      servicePeriodEnd: true,
      grossAmountCents: true,
      currency: true,
      taxMode: true,
      companyId: true,
      company: { select: { name: true, billingEmail: true, contactEmail: true } }
    }
  });
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    throw new Error("Nur finalisierte Rechnungen können (erneut) versendet werden.");
  }

  const settings = await getOrCreateBillingSettings(prisma);
  const pdf = await getInvoicePdf(invoice.id);
  if (!pdf) {
    throw new Error("Das Rechnungs-PDF konnte nicht erzeugt werden.");
  }
  const pdfBuffer = pdf.buffer;

  const recipient = recipientEmail ?? invoice.company.billingEmail ?? invoice.company.contactEmail;
  const email = invoiceIssuedEmail({
    recipientName: invoice.company.name,
    sellerName: settings.legalName,
    invoiceNumber: invoice.invoiceNumber!,
    issueDate: invoice.issueDate!,
    dueDate: invoice.dueDate!,
    grossFormatted: formatEuroCents(invoice.grossAmountCents, invoice.currency),
    servicePeriod: `${invoice.servicePeriodStart.toLocaleDateString("de-AT")} – ${invoice.servicePeriodEnd.toLocaleDateString("de-AT")}`,
    reverseCharge: invoice.taxMode === "REVERSE_CHARGE"
  });
  const result = await sendEmail({
    to: recipient,
    subject: email.subject,
    html: email.html,
    replyTo: settings.email || undefined,
    attachments: [
      { filename: `Rechnung-${invoice.invoiceNumber}.pdf`, content: pdfBuffer.toString("base64"), contentType: "application/pdf" }
    ]
  });
  if (!result.ok) {
    throw new Error(result.error ?? "E-Mail-Versand fehlgeschlagen.");
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: invoice.status === "PAID" ? "PAID" : "SENT", sentAt: new Date(), sentTo: recipient }
  });
  await writeAuditLog({
    companyId: invoice.companyId,
    actorUserId: actor.id,
    action: "invoice.resent",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { to: recipient }
  });
  revalidatePath("/admin/invoices");
}

export async function markInvoicePaid(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { invoiceId } = parseForm(invoiceIdSchema, formData);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status !== "ISSUED" && invoice.status !== "SENT") {
    throw new Error("Nur offene (finalisierte) Rechnungen können als bezahlt markiert werden.");
  }

  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });
  await writeAuditLog({
    companyId: invoice.companyId,
    actorUserId: actor.id,
    action: "invoice.paid",
    entityType: "Invoice",
    entityId: invoice.id
  });
  revalidatePath("/admin/invoices");
}

export async function cancelInvoice(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const { invoiceId } = parseForm(invoiceIdSchema, formData);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status === "DRAFT") {
    throw new Error("Entwürfe werden gelöscht, nicht storniert.");
  }
  if (invoice.status === "CANCELLED") {
    throw new Error("Diese Rechnung ist bereits storniert.");
  }

  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await writeAuditLog({
    companyId: invoice.companyId,
    actorUserId: actor.id,
    action: "invoice.cancelled",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { invoiceNumber: invoice.invoiceNumber }
  });
  revalidatePath("/admin/invoices");
}
