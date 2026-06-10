import Link from "next/link";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Aktivitaetsprotokoll" };

const PAGE_SIZE = 50;

const entityTypeLabels: Record<string, string> = {
  Vehicle: "Fahrzeug",
  Booking: "Buchung",
  TripLog: "Fahrt",
  User: "Nutzer",
  MaintenanceRecord: "Wartung",
  DamageReport: "Schaden",
  VehicleHandover: "Uebergabe",
  Company: "Unternehmen",
  Export: "Export"
};

const actionLabels: Record<string, string> = {
  "vehicle.created": "Fahrzeug angelegt",
  "vehicle.updated": "Fahrzeug bearbeitet",
  "vehicle.archived": "Fahrzeug archiviert",
  "vehicle.qr_regenerated": "QR-Token erneuert",
  "vehicle.qr_disabled": "QR-Code deaktiviert",
  "vehicle.qr_opened": "QR-Seite geoeffnet",
  "booking.requested": "Buchung beantragt",
  "booking.approved": "Buchung genehmigt",
  "booking.rejected": "Buchung abgelehnt",
  "booking.cancelled": "Buchung storniert",
  "booking.completed": "Buchung abgeschlossen",
  "trip.started": "Fahrt gestartet",
  "trip.completed": "Fahrt beendet",
  "trip.corrected": "Fahrt korrigiert",
  "maintenance.created": "Wartung angelegt",
  "maintenance.planned": "Wartung geplant",
  "maintenance.in_progress": "Wartung gestartet",
  "maintenance.completed": "Wartung abgeschlossen",
  "maintenance.cancelled": "Wartung abgebrochen",
  "damage.created": "Schaden gemeldet",
  "damage.resolved": "Schaden erledigt",
  "damage.rejected": "Schaden abgelehnt",
  "handover.handover": "Uebergabe protokolliert",
  "handover.return": "Rueckgabe protokolliert",
  "user.created": "Nutzer angelegt",
  "user.updated": "Nutzer bearbeitet",
  "user.deactivated": "Nutzer deaktiviert",
  "user.password_changed": "Passwort geaendert",
  "driver_permission.changed": "Fahrerfreigabe geaendert",
  "company.settings_changed": "Einstellungen geaendert",
  "subscription.tier_changed": "Plan gewechselt",
  "csv_export.created": "CSV-Export erstellt"
};

export default async function AuditLogPage({
  searchParams
}: {
  searchParams: { page?: string; entityType?: string };
}) {
  const user = await requireAuth();
  requireFleetAdmin(user);

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const entityType = searchParams.entityType || undefined;

  const where = {
    companyId: user.companyId,
    ...(entityType && { entityType })
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count({ where })
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const qs = (p: number) => {
    const params = new URLSearchParams({ page: String(p) });
    if (entityType) params.set("entityType", entityType);
    return `/audit-log?${params}`;
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Compliance</p>
        <h1 className="mt-2 text-3xl font-semibold">Aktivitaetsprotokoll</h1>
        <p className="mt-2 text-muted-foreground">
          Alle Systemaktionen werden unveraenderlich protokolliert.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="GET">
        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Entitaet</label>
          <SelectField name="entityType" defaultValue={entityType ?? ""} className="w-44">
            <option value="">Alle Entitaeten</option>
            {Object.entries(entityTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
        </div>
        <Button type="submit" size="sm" variant="outline">Filtern</Button>
        {entityType && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/audit-log">Alle anzeigen</Link>
          </Button>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{total.toLocaleString("de-DE")} Eintraege</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{actionLabels[log.action] ?? log.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.actor?.name ?? "System"}
                    {log.entityId ? ` · ID ${log.entityId.slice(0, 8)}…` : ""}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <Badge>{entityTypeLabels[log.entityType] ?? log.entityType}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Keine Eintraege gefunden.</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center gap-3">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={qs(page - 1)}>&larr; Vorherige</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">Seite {page} von {totalPages}</span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={qs(page + 1)}>Naechste &rarr;</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
