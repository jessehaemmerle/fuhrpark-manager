export const metadata = {
  title: "Impressum"
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <Warning />
      <Section title="Anbieter">
        <p>[Firma GmbH]</p>
        <p>[Strasse und Hausnummer]</p>
        <p>[PLZ Ort, Land]</p>
      </Section>
      <Section title="Vertretungsberechtigt">
        <p>Geschaeftsfuehrung: [Name der geschaeftsfuehrenden Person]</p>
      </Section>
      <Section title="Kontakt">
        <p>E-Mail: [kontakt@example.com]</p>
        <p>Telefon: [+49 000 000000]</p>
      </Section>
      <Section title="Register und Umsatzsteuer">
        <p>Handelsregister: [Registergericht und Registernummer]</p>
        <p>USt-IdNr.: [DE000000000]</p>
      </Section>
      <Section title="Inhaltlich verantwortlich">
        <p>[Name und Anschrift der verantwortlichen Person]</p>
      </Section>
    </LegalPage>
  );
}

function Warning() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Bitte vor Veroeffentlichung durch echte Unternehmensdaten ersetzen.
    </div>
  );
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <div className="mt-8 grid gap-6">{children}</div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
