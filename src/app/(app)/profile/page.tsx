import { startOfMonth } from "date-fns";
import { changeOwnPassword } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAuth } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Mein Profil" };

export default async function ProfilePage() {
  const user = await requireAuth();
  const monthStart = startOfMonth(new Date());

  const [tripStats, bookingCount, recentTrips] = await Promise.all([
    prisma.tripLog.aggregate({
      where: { companyId: user.companyId, userId: user.id, createdAt: { gte: monthStart } },
      _count: { id: true },
      _sum: { distance: true }
    }),
    prisma.booking.count({
      where: {
        companyId: user.companyId,
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] }
      }
    }),
    prisma.tripLog.findMany({
      where: { companyId: user.companyId, userId: user.id },
      include: { vehicle: { select: { licensePlate: true, brand: true, model: true } } },
      orderBy: { startAt: "desc" },
      take: 5
    })
  ]);

  const daysUntilExpiry = user.licenseValidUntil
    ? Math.ceil((user.licenseValidUntil.getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Konto</p>
        <h1 className="mt-2 text-3xl font-semibold">{user.name}</h1>
        <p className="mt-2 text-muted-foreground">{user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Fahrten diesen Monat" value={tripStats._count.id} />
        <Stat
          label="Kilometer diesen Monat"
          value={`${(tripStats._sum.distance ?? 0).toLocaleString("de-DE")} km`}
        />
        <Stat label="Offene Buchungen" value={bookingCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fahrerfreigabe & Fuehrerschein</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge>{roleLabels[user.role]}</Badge>
            {user.driverBlocked ? (
              <Badge tone="danger">Gesperrt</Badge>
            ) : user.driverApproved ? (
              <Badge tone="success">Fahrfreigabe erteilt</Badge>
            ) : (
              <Badge tone="warning">Fahrfreigabe fehlt</Badge>
            )}
          </div>

          {user.licenseValidUntil ? (
            <div className="grid gap-1">
              <p>
                Fuehrerschein gueltig bis:{" "}
                <strong>{formatDate(user.licenseValidUntil)}</strong>
              </p>
              {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                <p className={`font-medium ${daysUntilExpiry <= 0 ? "text-red-600" : "text-amber-600"}`}>
                  {daysUntilExpiry <= 0
                    ? "Fahrerlaubnis bereits abgelaufen!"
                    : `Laeuft in ${daysUntilExpiry} Tagen ab.`}
                </p>
              )}
              {user.licenseClass && (
                <p className="text-muted-foreground">Klasse: {user.licenseClass}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Kein Fuehrerschein hinterlegt.</p>
          )}
        </CardContent>
      </Card>

      {recentTrips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Letzte Fahrten</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {recentTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{trip.vehicle.licensePlate} &middot; {trip.purpose}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {trip.startAt.toLocaleDateString("de-DE")}
                    {trip.distance != null ? ` · ${trip.distance} km` : ""}
                  </p>
                </div>
                {!trip.endAt && (
                  <Badge tone="warning">Aktiv</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Passwort aendern</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={changeOwnPassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input id="newPassword" name="newPassword" type="password" required />
              <p className="text-xs text-muted-foreground">Mindestens 10 Zeichen.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Neues Passwort bestaetigen</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button type="submit" className="w-fit">Passwort speichern</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-zinc-50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
