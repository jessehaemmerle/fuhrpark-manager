import { requireRole } from "@/lib/auth";
import { getCompanyUsage, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tierLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Platform Admin"
};

export default async function PlatformAdminPage() {
  await requireRole(["PLATFORM_ADMIN"]);
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" }
  });
  const rows = await Promise.all(
    companies.map(async (company) => ({
      company,
      plan: getPlan(company),
      usage: await getCompanyUsage(company.id)
    }))
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Platform</p>
        <h1 className="mt-2 text-3xl font-semibold">Mandanten & Usage</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 pr-4">Firma</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Trial bis</th>
                <th className="py-3 pr-4">Fahrzeuge</th>
                <th className="py-3 pr-4">Nutzer</th>
                <th className="py-3 pr-4">Buchungen</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ company, usage }) => (
                <tr key={company.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{company.name}</td>
                  <td className="py-3 pr-4">{tierLabels[company.subscriptionTier]}</td>
                  <td className="py-3 pr-4">{formatDate(company.trialEndDate)}</td>
                  <td className="py-3 pr-4">{usage.vehicles}</td>
                  <td className="py-3 pr-4">{usage.users}</td>
                  <td className="py-3 pr-4">{usage.activeBookings}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={company.active ? "success" : "danger"}>{company.active ? "Aktiv" : "Inaktiv"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
