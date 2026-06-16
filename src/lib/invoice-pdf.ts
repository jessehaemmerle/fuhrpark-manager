import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { formatEuroCents, type InvoiceLineItem } from "@/lib/invoicing";

export type InvoiceSeller = {
  legalName: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  registrationInfo?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
};

export type InvoiceBuyer = {
  name: string;
  address?: string | null;
  postalCodeCity?: string | null;
  country: string;
  vatId?: string | null;
  email?: string | null;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;
  servicePeriodStart: Date;
  servicePeriodEnd: Date;
  dueDate: Date;
  currency: string;
  lineItems: InvoiceLineItem[];
  netAmountCents: number;
  taxRatePercent: number;
  taxAmountCents: number;
  grossAmountCents: number;
  taxMode: "STANDARD" | "REVERSE_CHARGE";
  reverseChargeNote: string;
  paymentTermsDays: number;
  footerNote?: string | null;
  notes?: string | null;
  seller: InvoiceSeller;
  buyer: InvoiceBuyer;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.84, 0.86, 0.89);
const ACCENT = rgb(0.06, 0.46, 0.43);

/** Ersetzt nicht-WinAnsi-kodierbare Zeichen, damit Standardfonts nicht werfen. */
function winAnsi(text: string): string {
  return (text ?? "")
    .replace(/€/g, "€")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E¡-ÿ€]/g, "");
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("de-AT");
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Rechnung ${data.invoiceNumber}`);
  doc.setProducer("Fuhrpark Manager");
  doc.setCreator("Fuhrpark Manager");

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const money = (cents: number) => formatEuroCents(cents, data.currency);

  const text = (
    value: string,
    x: number,
    y: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number; lineHeight?: number } = {}
  ) => {
    page.drawText(winAnsi(value), {
      x,
      y,
      size: opts.size ?? 9.5,
      font: opts.font ?? font,
      color: opts.color ?? INK,
      maxWidth: opts.maxWidth,
      lineHeight: opts.lineHeight ?? (opts.size ?? 9.5) * 1.3
    });
  };

  const rightText = (value: string, rightX: number, y: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 9.5;
    const clean = winAnsi(value);
    const width = f.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: rightX - width, y, size, font: f, color: opts.color ?? INK });
  };

  const hline = (y: number, color = LINE, thickness = 0.75) => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: CONTENT_RIGHT, y }, thickness, color });
  };

  let y = PAGE_HEIGHT - MARGIN;

  // --- Kopf: Aussteller -----------------------------------------------------
  text(data.seller.legalName, MARGIN, y, { size: 15, font: bold, color: ACCENT });
  y -= 18;
  const sellerLines = [
    [data.seller.addressLine1, data.seller.addressLine2].filter(Boolean).join(", "),
    `${data.seller.postalCode} ${data.seller.city}`.trim(),
    data.seller.country
  ].filter((l) => l && l.trim().length > 0);
  for (const line of sellerLines) {
    text(line, MARGIN, y, { size: 9, color: MUTED });
    y -= 12;
  }
  const sellerContact = [data.seller.email, data.seller.phone, data.seller.website].filter(Boolean).join("  ·  ");
  if (sellerContact) {
    text(sellerContact, MARGIN, y, { size: 9, color: MUTED });
    y -= 12;
  }
  text(`UID: ${data.seller.vatId}`, MARGIN, y, { size: 9, color: MUTED });
  y -= 12;
  if (data.seller.registrationInfo) {
    text(data.seller.registrationInfo, MARGIN, y, { size: 9, color: MUTED });
    y -= 12;
  }

  // --- Empfänger + Meta -----------------------------------------------------
  y -= 26;
  const recipientTop = y;
  text("Rechnung an", MARGIN, y, { size: 8, font: bold, color: MUTED });
  y -= 16;
  text(data.buyer.name, MARGIN, y, { size: 10.5, font: bold });
  y -= 14;
  for (const line of [data.buyer.address, data.buyer.postalCodeCity, data.buyer.country].filter((l) => l && String(l).trim())) {
    text(String(line), MARGIN, y, { size: 9.5 });
    y -= 12;
  }
  if (data.buyer.vatId) {
    text(`UID: ${data.buyer.vatId}`, MARGIN, y, { size: 9.5 });
    y -= 12;
  }

  // Meta-Block rechts
  const metaX = 350;
  const metaValX = CONTENT_RIGHT;
  let my = recipientTop;
  text("RECHNUNG", metaX, my, { size: 15, font: bold });
  my -= 24;
  const meta: Array<[string, string]> = [
    ["Rechnungsnummer", data.invoiceNumber],
    ["Rechnungsdatum", fmtDate(data.issueDate)],
    ["Leistungszeitraum", `${fmtDate(data.servicePeriodStart)} – ${fmtDate(data.servicePeriodEnd)}`],
    ["Fällig bis", fmtDate(data.dueDate)]
  ];
  for (const [label, value] of meta) {
    text(label, metaX, my, { size: 9, color: MUTED });
    rightText(value, metaValX, my, { size: 9.5, font: bold });
    my -= 15;
  }

  y = Math.min(y, my) - 28;

  // --- Positionstabelle -----------------------------------------------------
  const colQtyRight = 360;
  const colUnitRight = 450;
  const colSumRight = CONTENT_RIGHT;

  text("Beschreibung", MARGIN, y, { size: 8.5, font: bold, color: MUTED });
  rightText("Menge", colQtyRight, y, { size: 8.5, font: bold, color: MUTED });
  rightText("Einzel (netto)", colUnitRight, y, { size: 8.5, font: bold, color: MUTED });
  rightText("Betrag (netto)", colSumRight, y, { size: 8.5, font: bold, color: MUTED });
  y -= 8;
  hline(y);
  y -= 16;

  for (const item of data.lineItems) {
    const descWidth = colQtyRight - MARGIN - 70;
    const wrapped = wrapText(winAnsi(item.description), font, 9.5, descWidth);
    text(wrapped.join("\n"), MARGIN, y, { size: 9.5, maxWidth: descWidth, lineHeight: 12 });
    rightText(String(item.quantity), colQtyRight, y, { size: 9.5 });
    rightText(money(item.unitNetCents), colUnitRight, y, { size: 9.5 });
    rightText(money(item.netCents), colSumRight, y, { size: 9.5 });
    y -= Math.max(wrapped.length * 12, 14) + 6;
  }

  hline(y + 2);
  y -= 14;

  // --- Summen ---------------------------------------------------------------
  const sumLabelRight = colUnitRight;
  const sumValRight = colSumRight;
  const sumRow = (label: string, value: string, opts: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    rightText(label, sumLabelRight, y, { size: opts.size ?? 9.5, font: opts.bold ? bold : font, color: opts.color });
    rightText(value, sumValRight, y, { size: opts.size ?? 9.5, font: opts.bold ? bold : font, color: opts.color });
    y -= 15;
  };

  sumRow("Nettobetrag", money(data.netAmountCents));
  if (data.taxMode === "REVERSE_CHARGE") {
    sumRow("USt (Reverse Charge)", money(0));
  } else {
    sumRow(`USt ${data.taxRatePercent} %`, money(data.taxAmountCents));
  }
  y -= 2;
  hline(y + 8, INK, 1);
  sumRow("Gesamtbetrag", money(data.grossAmountCents), { bold: true, size: 11 });

  // --- Hinweise / Reverse Charge -------------------------------------------
  y -= 16;
  if (data.taxMode === "REVERSE_CHARGE") {
    text(data.reverseChargeNote, MARGIN, y, { size: 9, color: INK, maxWidth: CONTENT_RIGHT - MARGIN, lineHeight: 12 });
    const lines = wrapText(winAnsi(data.reverseChargeNote), font, 9, CONTENT_RIGHT - MARGIN);
    y -= lines.length * 12 + 8;
  }
  if (data.notes) {
    const lines = wrapText(winAnsi(data.notes), font, 9, CONTENT_RIGHT - MARGIN);
    text(data.notes, MARGIN, y, { size: 9, color: MUTED, maxWidth: CONTENT_RIGHT - MARGIN, lineHeight: 12 });
    y -= lines.length * 12 + 8;
  }

  // --- Zahlungsinformationen -----------------------------------------------
  y -= 8;
  text("Zahlungsinformationen", MARGIN, y, { size: 9, font: bold });
  y -= 14;
  const payParts = [
    `Zahlbar ohne Abzug bis ${fmtDate(data.dueDate)} (${data.paymentTermsDays} Tage).`,
    data.seller.iban ? `IBAN: ${data.seller.iban}` : null,
    data.seller.bic ? `BIC: ${data.seller.bic}` : null,
    data.seller.bankName ? `Bank: ${data.seller.bankName}` : null,
    `Verwendungszweck: ${data.invoiceNumber}`
  ].filter(Boolean) as string[];
  for (const part of payParts) {
    text(part, MARGIN, y, { size: 9, color: INK });
    y -= 12;
  }

  // --- Fußzeile -------------------------------------------------------------
  const footerY = MARGIN + 6;
  hline(footerY + 22);
  const footerLine = [
    data.seller.legalName,
    `UID ${data.seller.vatId}`,
    data.seller.iban ? `IBAN ${data.seller.iban}` : null
  ].filter(Boolean).join("  ·  ");
  text(footerLine, MARGIN, footerY + 10, { size: 7.5, color: MUTED });
  if (data.footerNote) {
    text(data.footerNote, MARGIN, footerY, { size: 7.5, color: MUTED, maxWidth: CONTENT_RIGHT - MARGIN, lineHeight: 9 });
  }

  return doc.save();
}

/** Einfacher Wort-Umbruch auf eine Pixelbreite. */
function wrapText(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
