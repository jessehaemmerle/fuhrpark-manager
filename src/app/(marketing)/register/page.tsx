import { redirect } from "next/navigation";

export const metadata = {
  title: "Registrieren"
};

// Es gibt keine Self-Service-Registrierung / Trials mehr. Zugaenge werden vom
// Vertrieb angelegt – Interessenten werden auf die Kontaktseite geleitet.
export default function RegisterPage() {
  redirect("/contact");
}
