import { PricingCards } from "@/components/marketing/pricing-cards";
import { UsageBars } from "@/components/app/usage-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth, requireOwner } from "@/lib/auth";
import { getCompanyUsage, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Abo & Nutzung"
};

export default async function SubscriptionPage() {
  const user = await requireAuth();
  requireOwner(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const [usage] = await Promise.all([getCompanyUsage(user.companyId)]);
  const plan = getPlan(company);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Subscription</p>
        <h1 className="mt-2 text-3xl font-semibold">Abo & Nutzung</h1>
        <p className="mt-2 text-muted-foreground">Trial endet am {formatDate(company.trialEndDate)}.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Aktueller Plan: {plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageBars usage={usage} plan={plan} />
            <p className="text-sm text-muted-foreground">
              Lizenz, Trial-Laufzeit und Mandantenstatus werden zentral im Super-Admin-Panel verwaltet.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stripe-ready Struktur</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Planlimits, Feature Flags und Usage Snapshots sind vom Zahlungsanbieter getrennt.</p>
            <p>Stripe kann spaeter ueber Checkout, Customer Portal, Webhooks und Subscription Sync angebunden werden.</p>
            <Button asChild variant="outline" className="w-fit">
              <a href="/contact">Vertrieb kontaktieren</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <PricingCards />
    </div>
  );
}
