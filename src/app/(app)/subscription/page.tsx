import { SubscriptionTier } from "@prisma/client";
import { changeSubscriptionTier } from "@/server/actions";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { UsageBars } from "@/components/app/usage-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { requireAuth, requireOwner } from "@/lib/auth";
import { tierLabels } from "@/lib/labels";
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
        <p className="text-sm font-semibold uppercase text-primary">Abonnement</p>
        <h1 className="mt-2 text-3xl font-semibold">Abo & Nutzung</h1>
        {company.subscriptionTier === "TRIAL" ? (
          <p className="mt-2 text-muted-foreground">Testphase endet am {formatDate(company.trialEndDate)}.</p>
        ) : (
          <p className="mt-2 text-muted-foreground">Aktiver Plan: {plan.name}</p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Aktueller Plan: {plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <UsageBars usage={usage} plan={plan} />
            <form action={changeSubscriptionTier} className="grid gap-3">
              <Label htmlFor="tier">Plan wechseln</Label>
              <SelectField id="tier" name="tier" defaultValue={company.subscriptionTier}>
                {Object.values(SubscriptionTier).map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabels[tier]}
                  </option>
                ))}
              </SelectField>
              <Button>Plan wechseln</Button>
              <p className="text-xs text-muted-foreground">
                Zahlungsintegration ist noch nicht aktiv. Diese Aktion aktualisiert nur das interne Subscription-Tier.
              </p>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enterprise & individuelle Angebote</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Benoetigen Sie mehr Fahrzeuge, unbegrenzte Nutzer oder individuelle Vertragslaufzeiten?</p>
            <p>Unser Team erstellt Ihnen gerne ein massgeschneidertes Angebot.</p>
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
