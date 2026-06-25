import "server-only";

export type EmailAttachment = {
  filename: string;
  /** Base64-kodierter Inhalt. */
  content: string;
  contentType?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Email dev] To: ${to} | Subject: ${subject}${attachments?.length ? ` | Anhänge: ${attachments.map((a) => a.filename).join(", ")}` : ""}`);
      return { ok: true };
    }
    return { ok: false, error: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt)." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Fuhrpark Manager <noreply@fuhrpark.app>",
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments?.length ? { attachments } : {})
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[Email] Send failed:", res.status, detail);
    return { ok: false, error: `E-Mail-Versand fehlgeschlagen (${res.status}).` };
  }

  return { ok: true };
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
<h2 style="color:#0f766e;margin:0 0 16px">${title}</h2>
${body}
<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb">
<p style="font-size:12px;color:#9ca3af">Fuhrpark Manager &middot; Diese E-Mail wurde automatisch generiert.</p>
</body></html>`;
}

function table(rows: Array<[string, string]>): string {
  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
${rows.map(([label, value]) => `<tr>
  <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280;width:35%">${label}</td>
  <td style="padding:8px 12px;border:1px solid #e5e7eb">${value}</td>
</tr>`).join("")}
</table>`;
}

export function bookingApprovedEmail(opts: {
  userName: string;
  vehicleName: string;
  licensePlate: string;
  startAt: Date;
  endAt: Date;
  note?: string | null;
}): { subject: string; html: string } {
  const rows: Array<[string, string]> = [
    ["Fahrzeug", `${opts.vehicleName} (${opts.licensePlate})`],
    ["Start", opts.startAt.toLocaleString("de-DE")],
    ["Ende", opts.endAt.toLocaleString("de-DE")]
  ];
  if (opts.note) rows.push(["Hinweis", opts.note]);

  return {
    subject: `Buchung genehmigt: ${opts.licensePlate}`,
    html: wrap("Buchung genehmigt", `
      <p>Hallo ${opts.userName},</p>
      <p>Ihre Buchungsanfrage wurde <strong style="color:#16a34a">genehmigt</strong>.</p>
      ${table(rows)}
    `)
  };
}

export function bookingRejectedEmail(opts: {
  userName: string;
  vehicleName: string;
  licensePlate: string;
  startAt: Date;
  endAt: Date;
  note?: string | null;
}): { subject: string; html: string } {
  const rows: Array<[string, string]> = [
    ["Fahrzeug", `${opts.vehicleName} (${opts.licensePlate})`],
    ["Zeitraum", `${opts.startAt.toLocaleString("de-DE")} &ndash; ${opts.endAt.toLocaleString("de-DE")}`]
  ];
  if (opts.note) rows.push(["Grund", opts.note]);

  return {
    subject: `Buchung abgelehnt: ${opts.licensePlate}`,
    html: wrap("Buchung abgelehnt", `
      <p>Hallo ${opts.userName},</p>
      <p>Ihre Buchungsanfrage wurde leider <strong style="color:#dc2626">abgelehnt</strong>.</p>
      ${table(rows)}
      <p>Sie k&ouml;nnen jederzeit eine neue Anfrage stellen.</p>
    `)
  };
}

export function invoiceIssuedEmail(opts: {
  recipientName: string;
  sellerName: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  grossFormatted: string;
  servicePeriod: string;
  reverseCharge: boolean;
}): { subject: string; html: string } {
  const rows: Array<[string, string]> = [
    ["Rechnungsnummer", opts.invoiceNumber],
    ["Rechnungsdatum", opts.issueDate.toLocaleDateString("de-AT")],
    ["Leistungszeitraum", opts.servicePeriod],
    ["Gesamtbetrag", opts.grossFormatted],
    ["Zahlbar bis", opts.dueDate.toLocaleDateString("de-AT")]
  ];

  return {
    subject: `Rechnung ${opts.invoiceNumber} – ${opts.sellerName}`,
    html: wrap("Ihre Rechnung", `
      <p>Sehr geehrte Damen und Herren${opts.recipientName ? ` (${opts.recipientName})` : ""},</p>
      <p>im Anhang finden Sie Ihre Rechnung als PDF.</p>
      ${table(rows)}
      ${opts.reverseCharge ? `<p style="font-size:13px;color:#6b7280">Steuerschuldnerschaft des Leistungsempf&auml;ngers (Reverse Charge).</p>` : ""}
      <p>Bitte begleichen Sie den Betrag unter Angabe der Rechnungsnummer als Verwendungszweck.</p>
    `)
  };
}
