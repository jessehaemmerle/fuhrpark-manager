import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = {
  title: "Kontakt"
};

export default function ContactPage() {
  return (
    <main className="container grid gap-8 py-16 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Kontakt</p>
        <h1 className="mt-3 text-4xl font-semibold">Sprechen wir ueber Ihren Fuhrpark.</h1>
        <div className="mt-8 grid gap-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> vertrieb@example.com
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> +49 000 000000
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kontaktanfrage</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <Field label="Firma" name="company" />
            <Field label="Name" name="name" />
            <Field label="E-Mail" name="email" type="email" />
            <div className="grid gap-2">
              <Label htmlFor="message">Nachricht</Label>
              <Textarea id="message" name="message" />
            </div>
            <Button type="button">Anfrage vorbereiten</Button>
            <p className="text-sm text-muted-foreground">
              Platzhalterformular: Fuer Produktion an CRM, E-Mail-Service oder Helpdesk anbinden.
            </p>
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
