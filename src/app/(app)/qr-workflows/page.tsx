import Link from "next/link";
import { QrCode } from "lucide-react";
import { disableVehicleQr, regenerateVehicleQr } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export const metadata = {
  title: "QR Workflows"
};

export default async function QrWorkflowsPage() {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: user.companyId, status: { not: "RETIRED" } },
    orderBy: { licensePlate: "asc" }
  });

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">QR-Code Vehicle Workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">QR Workflows</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fahrzeugcodes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {vehicles.map((vehicle) => {
            const url = vehicle.qrCodeToken ? `${getAppUrl()}/v/${vehicle.qrCodeToken}` : null;
            return (
              <div key={vehicle.id} className="grid gap-4 rounded-md border p-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-white">
                  {vehicle.qrCodeEnabled && vehicle.qrCodeToken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/vehicles/${vehicle.id}/qr?format=svg`} alt="" className="h-20 w-20" />
                  ) : (
                    <QrCode className="h-10 w-10 text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{vehicle.licensePlate}</p>
                    <Badge tone={vehicle.qrCodeEnabled ? "success" : "neutral"}>
                      {vehicle.qrCodeEnabled ? "Aktiv" : "Deaktiviert"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">{url ?? "Kein aktiver Token"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vehicle.qrCodeEnabled && vehicle.qrCodeToken ? (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/v/${vehicle.qrCodeToken}`}>Oeffnen</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/api/vehicles/${vehicle.id}/qr?format=png`}>PNG</Link>
                      </Button>
                    </>
                  ) : null}
                  <form action={regenerateVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <Button size="sm">Regenerieren</Button>
                  </form>
                  <form action={disableVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <Button size="sm" variant="destructive">Deaktivieren</Button>
                  </form>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
