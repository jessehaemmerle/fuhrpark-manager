import Link from "next/link";
import { Car, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Preise" },
  { href: "/contact", label: "Kontakt" },
  { href: "/book-demo", label: "Demo buchen" }
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Car className="h-5 w-5" aria-hidden />
          </span>
          Fleetbase
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LogIn className="h-4 w-4" aria-hidden />
              Einloggen
            </Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Free Trial starten</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container grid gap-8 py-10 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Car className="h-5 w-5 text-primary" aria-hidden />
            Fleetbase
          </div>
          <p className="text-sm text-muted-foreground">
            Fuhrparkmanagement fuer moderne Teams mit QR-Workflows, DSGVO-bewusstem Fahrtenbuch und klaren Freigaben.
          </p>
        </div>
        <FooterColumn title="Produkt" links={[["/features", "Features"], ["/pricing", "Preise"], ["/book-demo", "Demo buchen"]]} />
        <FooterColumn title="Unternehmen" links={[["/contact", "Kontakt"], ["/login", "Login"], ["/register", "Registrieren"]]} />
        <FooterColumn title="Rechtliches" links={[["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/agb", "AGB"]]} />
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-2 text-sm text-muted-foreground">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-foreground">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
