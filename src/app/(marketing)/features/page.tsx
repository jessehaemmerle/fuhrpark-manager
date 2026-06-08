import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  Car,
  ClipboardCheck,
  Gauge,
  QrCode,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Features"
};

const features: Array<[LucideIcon, string, string]> = [
  [Car, "Fleet Management", "Fahrzeugstammdaten, Status, Kategorien, Kilometerstand, Standort, QR-Code und Historie."],
  [CalendarCheck, "Buchung & Freigabe", "Anfragen, Genehmigungen, Ablehnungen, Storno, Abschluss und Konfliktpruefung."],
  [Gauge, "Fahrtenbuch", "Start-/Endkilometer, Zweck, Fahrtart, Korrekturhinweise, Audit Trail und CSV-Export."],
  [QrCode, "QR-Workflows", "Mobile Fahrzeugseite fuer Fahrt, Schaden, Uebergabe und Rueckgabe mit Token-Sicherheit."],
  [AlertTriangle, "Schadenmanagement", "Meldungen mit Fotos, Schweregrad, Status, Reparaturkosten und Wartungsverknuepfung."],
  [ClipboardCheck, "Uebergabe & Rueckgabe", "Digitale Formulare mit Zustand, Energielevel, Kilometerstand und Signaturplatzhalter."],
  [Wrench, "Wartung & Downtime", "Planung, Kosten, Werkstatt, Status und automatische Verfuegbarkeitsblocker."],
  [Users, "Nutzer & Abteilungen", "Rollen, Fahrerfreigaben, Fuehrerscheinpruefungen, Abteilungen und Planlimits."],
  [BarChart3, "Analytics & Reports", "Auslastung, Kosten, Schaeden, Kilometer, Buchungen und Subscription Usage."],
  [ShieldCheck, "Security & DSGVO", "Mandantentrennung, RBAC, HTTP-only Sessions, minimale Fahrerdaten und Audit Logs."],
  [Building2, "Mandantenfaehigkeit", "Jede Firma hat isolierte Daten, Branding, Subscription-Tier und Usage Monitoring."]
];

export default function FeaturesPage() {
  return (
    <main>
      <section className="border-b bg-white py-16">
        <div className="container max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">Features</p>
          <h1 className="mt-3 text-4xl font-semibold">Fuhrparkprozesse von Buchung bis Reporting.</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Fleetbase verbindet operative Flottenarbeit mit SaaS-Architektur, Planlimits, Rollen und Audit Logs.
          </p>
        </div>
      </section>
      <section className="container py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, title, copy]) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{copy}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
