import { NextResponse } from "next/server";

// Self-Service-Registrierung inkl. Trials ist deaktiviert. Neue Mandanten und
// deren Owner-Konten werden ausschliesslich vom Vertrieb/Plattform-Admin
// angelegt. Interessenten kontaktieren den Vertrieb.
export async function POST() {
  return NextResponse.json(
    { error: "Die Self-Service-Registrierung ist deaktiviert. Bitte kontaktieren Sie den Vertrieb." },
    { status: 403 }
  );
}
