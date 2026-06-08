export const metadata = {
  title: "Datenschutz"
};

const sections = [
  ["Verantwortliche Stelle", "[Firma, Anschrift, Kontaktperson, E-Mail]"],
  ["Erhobene Daten", "Accountdaten, Firmendaten, Fahrzeugdaten, Buchungsdaten und technische Sitzungsdaten."],
  ["Accountdaten", "Name, E-Mail, Rolle, Aktivstatus und notwendige Fahrerfreigaben."],
  ["Firmendaten", "Firma, Adresse, Kontakt, Branding und Subscription-Tier."],
  ["Fahrzeugdaten", "Kennzeichen, interne Nummer, Fahrzeugdaten, Kilometerstand, Status und QR-Token."],
  ["Buchungsdaten", "Zeitraeume, Zweck, Ziel, Genehmigungsstatus und Freigabehistorie."],
  ["Fahrtenbuchdaten", "Start/Ende, Kilometerstaende, Strecke, Zweck, Fahrtart und Korrekturhinweise."],
  ["Schadenberichtsdaten", "Titel, Beschreibung, Ort, Schweregrad, Status, Kosten und Zuordnung."],
  ["Hochgeladene Bilder", "Foto-URLs oder lokale Uploadpfade; Produktionsspeicher muss validiert und abgesichert werden."],
  ["Cookies und Session", "HTTP-only Session-Cookie fuer JWT-basierte Anmeldung."],
  ["Hosting", "[Hostinganbieter, Region, technische und organisatorische Massnahmen]"],
  ["Auftragsverarbeiter", "[Liste der eingesetzten Dienstleister]"],
  ["Aufbewahrung", "Konfigurierbarer Retention-Platzhalter, Standard 3650 Tage fuer Fahrtenbuchdaten."],
  ["Betroffenenrechte", "Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit und Widerspruch."],
  ["Export und Loeschanfragen", "[Prozess fuer Datenexport, Anonymisierung und Loeschung beschreiben]"],
  ["Kontakt", "[Datenschutzkontakt und ggf. Datenschutzbeauftragte Person]"]
];

export default function DatenschutzPage() {
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-4xl font-semibold">Datenschutzerklaerung</h1>
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Platzhalter, keine Rechtsberatung. Vor Produktionsbetrieb von einer qualifizierten Rechtsberatung pruefen lassen.
      </div>
      <div className="mt-8 grid gap-5">
        {sections.map(([title, copy]) => (
          <section key={title} className="rounded-md border bg-white p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{copy}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
