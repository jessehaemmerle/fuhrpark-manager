import "server-only";

import { addDays, subDays } from "date-fns";
import { notifyCompanyManagers, notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

async function hasRecentNotification(userId: string, type: Parameters<typeof notifyUser>[0]["type"], entityId: string | null, sinceDays = 7) {
  const count = await prisma.notification.count({
    where: {
      userId,
      type,
      entityId: entityId ?? undefined,
      createdAt: { gte: subDays(new Date(), sinceDays) }
    }
  });
  return count > 0;
}

async function remindExpiringLicenses(now: Date) {
  const horizon = addDays(now, 30);
  const drivers = await prisma.user.findMany({
    where: {
      active: true,
      licenseValidUntil: { not: null, lte: horizon },
      company: { active: true }
    },
    select: { id: true, name: true, companyId: true, licenseValidUntil: true }
  });

  let sent = 0;
  for (const driver of drivers) {
    if (await hasRecentNotification(driver.id, "LICENSE_EXPIRING", driver.id)) continue;
    const expired = driver.licenseValidUntil && driver.licenseValidUntil < now;
    await notifyUser({
      companyId: driver.companyId,
      userId: driver.id,
      type: "LICENSE_EXPIRING",
      title: expired ? "Fahrerlaubnis abgelaufen" : "Fahrerlaubnis läuft bald ab",
      body: `Gültig bis ${formatDate(driver.licenseValidUntil)}. Bitte aktualisierten Nachweis hinterlegen.`,
      url: "/compliance",
      entityType: "User",
      entityId: driver.id
    });
    await notifyCompanyManagers(
      driver.companyId,
      {
        type: "LICENSE_EXPIRING",
        title: `Fahrerlaubnis: ${driver.name}`,
        body: `${driver.name} – gültig bis ${formatDate(driver.licenseValidUntil)}.`,
        url: "/compliance",
        entityType: "User",
        entityId: driver.id
      },
      { excludeUserId: driver.id }
    );
    sent += 1;
  }
  return sent;
}

async function remindDueLicenseChecks(now: Date) {
  const horizon = addDays(now, 7);
  const drivers = await prisma.user.findMany({
    where: {
      active: true,
      nextLicenseCheckDue: { not: null, lte: horizon },
      company: { active: true }
    },
    select: { id: true, name: true, companyId: true, nextLicenseCheckDue: true }
  });

  let sent = 0;
  for (const driver of drivers) {
    if (await hasRecentNotification(driver.id, "LICENSE_CHECK_DUE", driver.id)) continue;
    await notifyCompanyManagers(driver.companyId, {
      type: "LICENSE_CHECK_DUE",
      title: `Führerscheinkontrolle fällig: ${driver.name}`,
      body: `Nächste Kontrolle fällig am ${formatDate(driver.nextLicenseCheckDue)}.`,
      url: "/compliance",
      entityType: "User",
      entityId: driver.id
    });
    sent += 1;
  }
  return sent;
}

async function remindDueDeadlines(now: Date) {
  const deadlines = await prisma.vehicleDeadline.findMany({
    where: { completed: false, company: { active: true } },
    include: { vehicle: { select: { licensePlate: true } } }
  });

  let sent = 0;
  for (const deadline of deadlines) {
    const remindFrom = subDays(deadline.dueDate, deadline.reminderLeadDays);
    if (remindFrom > now) continue;
    if (deadline.lastRemindedAt && deadline.lastRemindedAt > subDays(now, 7)) continue;

    await notifyCompanyManagers(deadline.companyId, {
      type: "DEADLINE_DUE",
      title: `Frist fällig: ${deadline.vehicle.licensePlate}`,
      body: `${deadline.title ?? deadline.type} fällig am ${formatDate(deadline.dueDate)}.`,
      url: "/deadlines",
      entityType: "VehicleDeadline",
      entityId: deadline.id
    });
    await prisma.vehicleDeadline.update({ where: { id: deadline.id }, data: { lastRemindedAt: now } });
    sent += 1;
  }
  return sent;
}

async function flagOverdueBookings(now: Date) {
  const bookings = await prisma.booking.findMany({
    where: { status: "APPROVED", endAt: { lt: now }, company: { active: true } },
    select: { id: true, companyId: true, userId: true, endAt: true, vehicle: { select: { licensePlate: true } } }
  });

  let sent = 0;
  for (const booking of bookings) {
    if (await hasRecentNotification(booking.userId, "BOOKING_OVERDUE", booking.id, 30)) continue;
    await notifyUser({
      companyId: booking.companyId,
      userId: booking.userId,
      type: "BOOKING_OVERDUE",
      title: `Buchung überfällig: ${booking.vehicle.licensePlate}`,
      body: `Die Buchung endete am ${formatDate(booking.endAt)} und wurde noch nicht abgeschlossen.`,
      url: "/bookings",
      entityType: "Booking",
      entityId: booking.id
    });
    await notifyCompanyManagers(
      booking.companyId,
      {
        type: "BOOKING_OVERDUE",
        title: `Überfällige Buchung: ${booking.vehicle.licensePlate}`,
        body: `Endete am ${formatDate(booking.endAt)}, Status weiterhin „genehmigt".`,
        url: "/bookings",
        entityType: "Booking",
        entityId: booking.id
      },
      { excludeUserId: booking.userId }
    );
    sent += 1;
  }
  return sent;
}

async function enforceRetention(now: Date) {
  const companies = await prisma.company.findMany({ select: { id: true, retentionPeriodDays: true } });

  let deletedTripLogs = 0;
  let deletedNotifications = 0;
  for (const company of companies) {
    const cutoff = subDays(now, company.retentionPeriodDays);
    const tripLogs = await prisma.tripLog.deleteMany({
      where: { companyId: company.id, locked: true, createdAt: { lt: cutoff } }
    });
    const notifications = await prisma.notification.deleteMany({
      where: { companyId: company.id, readAt: { not: null }, createdAt: { lt: subDays(now, 90) } }
    });
    deletedTripLogs += tripLogs.count;
    deletedNotifications += notifications.count;
  }
  return { deletedTripLogs, deletedNotifications };
}

export async function runScheduledJobs(now = new Date()) {
  const [expiringLicenses, dueLicenseChecks, dueDeadlines, overdueBookings, retention] = await Promise.all([
    remindExpiringLicenses(now),
    remindDueLicenseChecks(now),
    remindDueDeadlines(now),
    flagOverdueBookings(now),
    enforceRetention(now)
  ]);

  return { expiringLicenses, dueLicenseChecks, dueDeadlines, overdueBookings, retention };
}
