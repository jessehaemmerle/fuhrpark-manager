export const metadata = {
  title: "AGB"
};

const sections = [
  ["Geltungsbereich", "Diese Platzhalter-AGB gelten fuer die Nutzung der SaaS-Plattform Fleetbase."],
  ["Leistungsbeschreibung", "Fleetbase stellt Funktionen fuer Fuhrpark, Buchung, Fahrtenbuch, Wartung und Reports bereit."],
  ["Nutzerkonten", "Kunden verwalten Nutzerkonten, Rollen, Fahrerfreigaben und Zugangsdaten eigenverantwortlich."],
  ["Pflichten der Company Admins", "Admins muessen Daten korrekt pflegen, Berechtigungen pruefen und gesetzliche Vorgaben beachten."],
  ["Zulaessige Nutzung", "Missbrauch, rechtswidrige Inhalte, Umgehung von Sicherheitsfunktionen und unbefugte Zugriffe sind untersagt."],
  ["Subscription Plans", "Planlimits gelten fuer Fahrzeuge, Nutzer, Abteilungen, Buchungen, Fahrten und Schadenberichte."],
  ["Trial-Nutzung", "Trial-Zeitraum und Umfang koennen begrenzt sein. Es besteht kein Anspruch auf dauerhafte kostenlose Nutzung."],
  ["Verfuegbarkeit", "[SLA, Wartungsfenster und Supportzeiten ergaenzen]"],
  ["Haftung", "[Haftungsregelung rechtlich pruefen und konkretisieren]"],
  ["Datenschutz", "Es gilt die Datenschutzerklaerung. Auftragsverarbeitungsvertrag bei B2B-Nutzung ergaenzen."],
  ["Kuendigung", "[Laufzeiten, Fristen, Datenexport und Loeschung beschreiben]"],
  ["Aenderungen", "[Verfahren fuer Aenderungen der Bedingungen beschreiben]"],
  ["Anwendbares Recht", "[Rechtswahl und Gerichtsstand mit Rechtsberatung abstimmen]"]
];

export default function AgbPage() {
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-4xl font-semibold">Allgemeine Geschaeftsbedingungen</h1>
      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Klar markierte Platzhalter. Keine rechtliche Garantie, keine Rechtsberatung.
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
