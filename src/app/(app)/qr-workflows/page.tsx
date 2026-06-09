import Link from "next/link";
import { QrCode } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { disableVehicleQr, regenerateVehicleQr } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export const metadata = {
  title: "QR-Workflows"
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
      <PageHeader
        eyebrow="QR-Codes"
        title="QR-Workflows"
        description="Fahrzeugcodes verwalten und mobile Workflows direkt am Fahrzeug öffnen."
      />
      <Card>
        <CardHeader>
          <CardTitle>Fahrzeugcodes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {vehicles.map((vehicle) => {
            const url = vehicle.qrCodeToken ? `${getAppUrl()}/v/${vehicle.qrCodeToken}` : null;
            const qrActive = vehicle.qrCodeEnabled && Boolean(vehicle.qrCodeToken);
            return (
              <div key={vehicle.id} className="grid gap-4 rounded-md border p-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-white">
                  {qrActive ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/vehicles/${vehicle.id}/qr?format=svg`} alt="" className="h-20 w-20" />
                  ) : (
                    <QrCode className="h-10 w-10 text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{vehicle.licensePlate}</p>
                    <Badge tone={qrActive ? "success" : "neutral"}>
                      {qrActive ? "Aktiv" : "Deaktiviert"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">{url ?? "Kein aktiver Token"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {qrActive ? (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/v/${vehicle.qrCodeToken}`}>Öffnen</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/api/vehicles/${vehicle.id}/qr?format=png`}>PNG</Link>
                      </Button>
                    </>
                  ) : null}
                  <form action={regenerateVehicleQr}>
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <Button size="sm">{qrActive ? "Regenerieren" : "QR-Code erstellen"}</Button>
                  </form>
                  {qrActive ? (
                    <form action={disableVehicleQr}>
                      <input type="hidden" name="vehicleId" value={vehicle.id} />
                      <Button size="sm" variant="destructive">Deaktivieren</Button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {vehicles.length === 0 ? (
            <EmptyState title="Keine Fahrzeuge verfügbar" description="Sobald Fahrzeuge angelegt sind, können hier QR-Codes erstellt werden." />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
