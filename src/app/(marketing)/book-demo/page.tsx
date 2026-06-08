import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = {
  title: "Demo buchen"
};

export default function BookDemoPage() {
  return (
    <main className="container grid gap-8 py-16 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <CalendarDays className="mb-4 h-8 w-8 text-primary" />
        <h1 className="text-4xl font-semibold">Demo buchen</h1>
        <p className="mt-4 text-muted-foreground">
          Platzhalter fuer Kalenderintegration. Spaeter kann hier Cal.com, HubSpot Meetings oder ein eigenes Scheduling
          angeschlossen werden.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Demo-Anfrage</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <Field label="Firma" name="company" />
            <Field label="Name" name="name" />
            <Field label="E-Mail" name="email" type="email" />
            <Field label="Fahrzeuge im Fuhrpark" name="vehicles" type="number" />
            <div className="grid gap-2">
              <Label htmlFor="needs">Schwerpunkte</Label>
              <Textarea id="needs" name="needs" placeholder="Buchungen, QR, Fahrtenbuch, Wartung..." />
            </div>
            <Button type="button">Demo-Anfrage vorbereiten</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}
