import { PricingCards } from "@/components/marketing/pricing-cards";
import { PageHeader } from "@/components/app/page-header";
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
      <PageHeader
        eyebrow="Abonnement"
        title="Abo & Nutzung"
        description={`Trial endet am ${formatDate(company.trialEndDate)}.`}
      />

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
            <CardTitle>Kontakt & Abrechnung</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Planwechsel, Lizenzlaufzeit und Vertragsfragen werden zentral betreut.</p>
            <p>Für Änderungen am Abo kontaktieren Sie den Vertrieb.</p>
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
