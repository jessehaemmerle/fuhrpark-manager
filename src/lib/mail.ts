import "server-only";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type MailResult = { delivered: boolean; driver: string; detail?: string };

export function mailDriver() {
  return (process.env.MAIL_DRIVER ?? "log").toLowerCase();
}

function fromAddress() {
  return process.env.MAIL_FROM ?? "Fleetbase <no-reply@fleetbase.local>";
}

/**
 * Pluggable, dependency-free mailer.
 *
 * - `log` (default): writes the message to the server log — ideal for local
 *   development without an SMTP relay.
 * - `webhook`: POSTs the message to `MAIL_WEBHOOK_URL`, which lets you bridge to
 *   Resend / SendGrid / a self-hosted SMTP relay without adding a dependency.
 *
 * Swap in a real transport in production by setting `MAIL_DRIVER=webhook` and
 * pointing `MAIL_WEBHOOK_URL` at your mail service.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const driver = mailDriver();

  if (driver === "webhook") {
    const url = process.env.MAIL_WEBHOOK_URL;
    if (!url) return { delivered: false, driver, detail: "MAIL_WEBHOOK_URL ist nicht gesetzt." };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddress(), ...message })
      });
      return { delivered: response.ok, driver, detail: response.ok ? undefined : `HTTP ${response.status}` };
    } catch (error) {
      return { delivered: false, driver, detail: error instanceof Error ? error.message : "Webhook-Fehler" };
    }
  }

  // eslint-disable-next-line no-console
  console.info(`[mail:${driver}] → ${message.to} :: ${message.subject}\n${message.text}`);
  return { delivered: true, driver, detail: "logged" };
}
