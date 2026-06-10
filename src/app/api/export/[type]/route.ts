import { NextResponse } from "next/server";
import { isFleetAdmin, getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

const managerOnly = new Set(["vehicles", "bookings", "maintenance", "users", "departments"]);

export async function GET(_: Request, { params }: { params: { type: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (managerOnly.has(params.type) && !isFleetAdmin(user.role)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  try {
    assertFeatureAccess(getPlan(company), "csvExportAccess");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV nicht verfuegbar." }, { status: 403 });
  }

  const rows = await exportRows(params.type, user.companyId, isFleetAdmin(user.role) ? undefined : user.id);
  if (!rows) return NextResponse.json({ error: "Unbekannter Exporttyp." }, { status: 404 });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "csv_export.created",
    entityType: "Export",
    entityId: params.type,
    metadata: { type: params.type, rows: rows.length }
  });

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${params.type}.csv"`
    }
  });
}

async function exportRows(type: string, companyId: string, ownUserId?: string) {
  if (type === "vehicles") {
    return prisma.vehicle.findMany({ where: { companyId }, orderBy: { licensePlate: "asc" } });
  }
  if (type === "bookings") {
    return prisma.booking.findMany({ where: { companyId, userId: ownUserId }, orderBy: { startAt: "desc" } });
  }
  if (type === "maintenance") {
    return prisma.maintenanceRecord.findMany({ where: { companyId }, orderBy: { startAt: "desc" } });
  }
  if (type === "users") {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        licenseClass: true,
        licenseValidUntil: true,
        lastLicenseCheckDate: true,
        driverApproved: true,
        driverBlocked: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: "asc" }
    });
  }
  if (type === "departments") {
    return prisma.department.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }
  if (type === "trip-logs") {
    return prisma.tripLog.findMany({ where: { companyId, userId: ownUserId }, orderBy: { startAt: "desc" } });
  }
  if (type === "damage-reports") {
    return prisma.damageReport.findMany({ where: { companyId, reporterUserId: ownUserId }, orderBy: { createdAt: "desc" } });
  }
  if (type === "handovers") {
    return prisma.vehicleHandover.findMany({ where: { companyId, userId: ownUserId }, orderBy: { handledAt: "desc" } });
  }
  return null;
}
