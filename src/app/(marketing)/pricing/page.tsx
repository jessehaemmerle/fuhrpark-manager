import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata = {
  title: "Preise"
};

export default function PricingPage() {
  return (
    <main>
      <section className="border-b bg-white py-16">
        <div className="container max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">Preise</p>
          <h1 className="mt-3 text-4xl font-semibold">Plaene fuer wachsende Fuhrparks.</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Planlimits werden serverseitig angewendet. Zahlung und Stripe-Checkout sind vorbereitet, aber noch nicht
            integriert.
          </p>
        </div>
      </section>
      <section className="container py-16">
        <PricingCards />
      </section>
    </main>
  );
}
