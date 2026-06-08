import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HeroDashboard } from "@/components/marketing/hero-dashboard";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featureCards: Array<[LucideIcon, string, string]> = [
  [CalendarCheck, "Buchungen & Freigaben", "Anfragen, Genehmigungen, Konfliktpruefung und Historie pro Mandant."],
  [Gauge, "Digitales Fahrtenbuch", "Start, Ende, Kilometer, Zweck und Korrekturhinweise DSGVO-bewusst erfassen."],
  [QrCode, "QR-Fahrzeugworkflow", "Scan am Fahrzeug fuer Fahrt, Schaden, Uebergabe und Rueckgabe."],
  [Wrench, "Wartung & Ausfall", "Wartungsfenster blockieren Verfuegbarkeit und zeigen Kosten je Fahrzeug."],
  [AlertTriangle, "Schadenberichte", "Fotos, Status, Schweregrad, Reparaturkosten und Audit Trail."],
  [BarChart3, "Analytics & Exporte", "Auslastung, Kosten, Kilometer, Abteilungen und CSV-Reports."]
];

export default function LandingPage() {
  return (
    <main>
      <section className="relative min-h-[680px] overflow-hidden text-white">
        <HeroDashboard />
        <div className="container relative z-10 flex min-h-[680px] max-w-4xl flex-col justify-center py-24">
          <p className="mb-4 text-sm font-semibold uppercase text-teal-200">B2B SaaS fuer DACH-Fuhrparks</p>
          <h1 className="text-5xl font-semibold leading-tight md:text-7xl">Fleetbase</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Verwalten Sie Fahrzeuge, Buchungen, Freigaben, Wartungen, QR-Workflows, Fahrtenbuch und Schadenprozesse in
            einer mandantenfaehigen Plattform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">Free Trial starten</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link href="/book-demo">Demo buchen</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link href="/login">Einloggen</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b bg-white py-14">
        <div className="container grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Problem und Loesung</p>
            <h2 className="mt-3 text-3xl font-semibold">Weniger Tabellen, weniger Rueckfragen, mehr Kontrolle.</h2>
          </div>
          <div className="grid gap-4 text-muted-foreground md:grid-cols-2">
            <p>Buchungen per E-Mail, unklare Fahrerfreigaben und handschriftliche Fahrtenbuecher erzeugen Risiken.</p>
            <p>Fleetbase verbindet operative Workflows, Rollen, Planlimits und Audit Logs in einer SaaS-Struktur.</p>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase text-primary">Funktionsueberblick</p>
          <h2 className="mt-3 text-3xl font-semibold">Alles, was Fuhrparkteams taeglich brauchen.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(([Icon, title, copy]) => (
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

      <section className="bg-zinc-50 py-16">
        <div className="container grid gap-6 md:grid-cols-3">
          {[
            ["1", "Fahrzeug anfragen", "Nutzer waehlen Fahrzeug, Zeitraum, Zweck und Ziel."],
            ["2", "Freigabe pruefen", "Manager sehen Konflikte mit Buchungen, Wartung und aktiven Fahrten."],
            ["3", "Fahrt dokumentieren", "Uebergabe, Fahrtenbuch, Rueckgabe und Schaeden werden verknuepft."]
          ].map(([step, title, copy]) => (
            <div key={step}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                {step}
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container grid gap-10 py-16 md:grid-cols-2">
        <div>
          <QrCode className="mb-4 h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold">QR-Code direkt am Fahrzeug.</h2>
          <p className="mt-4 text-muted-foreground">
            Jeder QR-Code enthaelt nur einen zufaelligen, unerratbaren Token. Nach Login prueft der Server Mandant,
            Rolle und Fahrerfreigabe, bevor Aktionen moeglich sind.
          </p>
        </div>
        <div className="grid gap-3">
          {["Fahrt starten", "Kilometer erfassen", "Schaden melden", "Uebergabe/Rueckgabe abschliessen"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-md border bg-white p-4">
              <CheckCircle2 className="h-5 w-5 text-teal-700" />
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-white py-16">
        <div className="container grid gap-8 md:grid-cols-3">
          <InfoBlock icon={<ClipboardCheck />} title="Schadenprozess" copy="Meldungen mit Fotos, Status, Schweregrad und optionaler Wartungsverknuepfung." />
          <InfoBlock icon={<Wrench />} title="Wartung & Kosten" copy="Ausfallzeiten blockieren Buchungen, Kosten laufen in Reports und Fahrzeugdetails ein." />
          <InfoBlock icon={<ShieldCheck />} title="DSGVO-bewusst" copy="Rollen, Audit Trail, Exportlogik, Zweckbindung und Retention-Platzhalter sind angelegt." />
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Preise</p>
            <h2 className="mt-3 text-3xl font-semibold">Planlimits statt Checkout-Komplexitaet.</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/pricing">Alle Plaene vergleichen</Link>
          </Button>
        </div>
        <PricingCards compact />
      </section>

      <section className="bg-zinc-50 py-16">
        <div className="container grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold">Haeufige Fragen</h2>
          </div>
          <div className="grid gap-4">
            {[
              ["Gibt es schon Zahlung?", "Nein. Planlimits sind aktiv, die Struktur ist fuer Stripe vorbereitet."],
              ["Sind QR-Codes sicher?", "Der QR-Code enthaelt nur einen zufaelligen Token. Aktionen brauchen Login und Mandantenpruefung."],
              ["Ist das Fahrtenbuch rechtssicher?", "Die Struktur ist DSGVO-bewusst, muss aber vor Livegang juristisch geprueft werden."]
            ].map(([question, answer]) => (
              <div key={question} className="rounded-md border bg-white p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {["Mittelstand", "Serviceflotten", "Poolfahrzeuge"].map((segment) => (
            <Card key={segment}>
              <CardContent className="pt-5">
                <LockKeyhole className="mb-4 h-5 w-5 text-primary" />
                <p className="font-semibold">{segment}</p>
                <p className="mt-2 text-sm text-muted-foreground">Testimonial-Platzhalter fuer Kundenfeedback.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div>
      <div className="mb-4 text-primary [&_svg]:h-7 [&_svg]:w-7">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
