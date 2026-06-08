import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fleetbase - Fuhrparkmanagement SaaS",
    template: "%s | Fleetbase"
  },
  description: "B2B SaaS fuer Fuhrpark, Buchungen, Fahrtenbuch, QR-Workflows, Wartung und Analysen."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
