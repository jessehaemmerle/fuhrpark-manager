import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { addDays, addHours, subDays } from "date-fns";
import { PrismaClient, SubscriptionTier } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("FleetbaseDemo123!", 12);
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "FleetbaseDemo123!";
const adminPasswordHash = bcrypt.hashSync(superAdminPassword, 12);

function token() {
  return randomBytes(32).toString("base64url");
}

async function seedPlanConfigs() {
  const plans = [
    ["TRIAL", 5, 8, 3, 10, 60, 20, false, false, false, true, true, true, false, 0],
    ["BASIC", 10, 25, 8, 40, 400, 80, false, true, false, true, true, true, false, 4900],
    ["PROFESSIONAL", 75, 250, 40, 500, 6000, 800, true, true, true, true, true, true, true, 14900],
    ["ENTERPRISE", 999999, 999999, 999999, 999999, 999999, 999999, true, true, true, true, true, true, true, null]
  ] as const;

  for (const plan of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { tier: plan[0] as SubscriptionTier },
      update: {},
      create: {
        tier: plan[0] as SubscriptionTier,
        maxVehicles: plan[1],
        maxUsers: plan[2],
        maxDepartments: plan[3],
        maxActiveBookings: plan[4],
        maxMonthlyTripLogs: plan[5],
        maxMonthlyDamageReports: plan[6],
        analyticsAccess: plan[7],
        csvExportAccess: plan[8],
        customBrandingAccess: plan[9],
        qrCodeAccess: plan[10],
        maintenanceModuleAccess: plan[11],
        driverPermissionAccess: plan[12],
        prioritySupport: plan[13],
        monthlyPriceCents: plan[14]
      }
    });
  }
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.vehicleHandover.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.tripLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.license.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.usageSnapshot.deleteMany();
  await prisma.company.deleteMany();
  await seedPlanConfigs();

  const platform = await prisma.company.create({
    data: {
      name: "Fleetbase Operations",
      slug: "fleetbase-operations",
      contactEmail: "platform@example.com",
      subscriptionTier: "ENTERPRISE",
      trialEndDate: addDays(new Date(), 365),
      primaryBrandColor: "#0f766e",
      country: "DE"
    }
  });

  const acme = await prisma.company.create({
    data: {
      name: "Musterlogistik GmbH",
      slug: "musterlogistik",
      address: "Logistikstrasse 12, 10115 Berlin",
      contactEmail: "fleet@musterlogistik.example",
      contactPhone: "+49 30 123456",
      subscriptionTier: "PROFESSIONAL",
      trialEndDate: addDays(new Date(), 20),
      primaryBrandColor: "#0f766e",
      country: "DE"
    }
  });

  const alpina = await prisma.company.create({
    data: {
      name: "Alpina Service AG",
      slug: "alpina-service",
      address: "Rheinufer 4, 6900 Bregenz",
      contactEmail: "office@alpina-service.example",
      contactPhone: "+43 5574 0000",
      subscriptionTier: "BASIC",
      trialEndDate: addDays(new Date(), 7),
      primaryBrandColor: "#2563eb",
      country: "AT"
    }
  });

  const [jessieAdmin, platformAdmin, owner, manager, userOne, userTwo, alpinaOwner, alpinaManager, alpinaUser] = await Promise.all([
    prisma.user.create({
      data: {
        companyId: platform.id,
        name: "Jesse Admin",
        email: "jesse@haemmerle.at",
        passwordHash: adminPasswordHash,
        role: "PLATFORM_ADMIN",
        driverApproved: true
      }
    }),
    prisma.user.create({
      data: {
        companyId: platform.id,
        name: "Platform Admin",
        email: "admin@fleetbase.example",
        passwordHash,
        role: "PLATFORM_ADMIN",
        driverApproved: true
      }
    }),
    prisma.user.create({
      data: {
        companyId: acme.id,
        name: "Anna Owner",
        email: "owner@musterlogistik.example",
        passwordHash,
        role: "OWNER",
        driverApproved: true,
        licenseClass: "B",
        licenseValidUntil: addDays(new Date(), 900),
        lastLicenseCheckDate: subDays(new Date(), 20)
      }
    }),
    prisma.user.create({
      data: {
        companyId: acme.id,
        name: "Max Fuhrpark",
        email: "manager@musterlogistik.example",
        passwordHash,
        role: "FLEET_MANAGER",
        driverApproved: true,
        licenseClass: "B, C1",
        licenseValidUntil: addDays(new Date(), 420),
        lastLicenseCheckDate: subDays(new Date(), 40)
      }
    }),
    prisma.user.create({
      data: {
        companyId: acme.id,
        name: "Lisa Fahrer",
        email: "lisa@musterlogistik.example",
        passwordHash,
        role: "USER",
        driverApproved: true,
        licenseClass: "B",
        licenseValidUntil: addDays(new Date(), 25),
        lastLicenseCheckDate: subDays(new Date(), 80)
      }
    }),
    prisma.user.create({
      data: {
        companyId: acme.id,
        name: "Tom Gesperrt",
        email: "tom@musterlogistik.example",
        passwordHash,
        role: "USER",
        driverApproved: false,
        driverBlocked: true,
        licenseClass: "B",
        licenseValidUntil: subDays(new Date(), 10),
        driverNotes: "Fuehrerschein abgelaufen, Nachweis ausstehend."
      }
    }),
    prisma.user.create({
      data: {
        companyId: alpina.id,
        name: "Sabine Owner",
        email: "owner@alpina-service.example",
        passwordHash,
        role: "OWNER",
        driverApproved: true,
        licenseClass: "B",
        licenseValidUntil: addDays(new Date(), 500)
      }
    }),
    prisma.user.create({
      data: {
        companyId: alpina.id,
        name: "Peter Manager",
        email: "manager@alpina-service.example",
        passwordHash,
        role: "FLEET_MANAGER",
        driverApproved: true,
        licenseClass: "B",
        licenseValidUntil: addDays(new Date(), 300)
      }
    }),
    prisma.user.create({
      data: {
        companyId: alpina.id,
        name: "Julia Nutzerin",
        email: "julia@alpina-service.example",
        passwordHash,
        role: "USER",
        driverApproved: true,
        licenseClass: "B",
        licenseValidUntil: addDays(new Date(), 120)
      }
    })
  ]);

  await Promise.all([
    prisma.license.create({
      data: {
        companyId: acme.id,
        createdById: jessieAdmin.id,
        licenseKey: "FB-DEMO-MUST-2026-PROF",
        name: "Professional Jahreslizenz",
        tier: "PROFESSIONAL",
        validFrom: subDays(new Date(), 5),
        validUntil: addDays(new Date(), 365),
        maxUsers: 250,
        maxVehicles: 75,
        notes: "Beispieldatensatz fuer das Super-Admin-Panel."
      }
    }),
    prisma.license.create({
      data: {
        companyId: alpina.id,
        createdById: platformAdmin.id,
        licenseKey: "FB-DEMO-ALPI-2026-BASIC",
        name: "Basic Lizenz",
        tier: "BASIC",
        validFrom: subDays(new Date(), 20),
        validUntil: addDays(new Date(), 180),
        maxUsers: 25,
        maxVehicles: 10,
        notes: "Aktive Lizenz fuer Demo-Mandant."
      }
    })
  ]);

  const [logistics, sales, service, fieldOps] = await Promise.all([
    prisma.department.create({ data: { companyId: acme.id, name: "Logistik", managerName: "Max Fuhrpark" } }),
    prisma.department.create({ data: { companyId: acme.id, name: "Vertrieb", managerName: "Anna Owner" } }),
    prisma.department.create({ data: { companyId: alpina.id, name: "Service", managerName: "Peter Manager" } }),
    prisma.department.create({ data: { companyId: alpina.id, name: "Field Ops", managerName: "Sabine Owner" } })
  ]);

  await Promise.all([
    prisma.user.update({ where: { id: userOne.id }, data: { departmentId: logistics.id } }),
    prisma.user.update({ where: { id: userTwo.id }, data: { departmentId: logistics.id } }),
    prisma.user.update({ where: { id: manager.id }, data: { departmentId: logistics.id } }),
    prisma.user.update({ where: { id: alpinaUser.id }, data: { departmentId: service.id } }),
    prisma.user.update({ where: { id: alpinaManager.id }, data: { departmentId: fieldOps.id } })
  ]);

  const vehicleTemplates = [
    [acme.id, "ML-001", "B-ML 240", "Mercedes-Benz", "EQA", 2023, "SUV", "ELECTRIC", 34210, "Berlin"],
    [acme.id, "ML-002", "B-ML 118", "Volkswagen", "ID.4", 2024, "SUV", "ELECTRIC", 18880, "Berlin"],
    [acme.id, "ML-003", "B-TR 707", "Ford", "Transit", 2021, "VAN", "DIESEL", 72040, "Potsdam"],
    [acme.id, "ML-004", "B-LK 812", "Mercedes-Benz", "Atego", 2020, "TRUCK", "DIESEL", 91110, "Berlin"],
    [acme.id, "ML-005", "B-KM 331", "Skoda", "Octavia", 2022, "SEDAN", "HYBRID", 46220, "Leipzig"],
    [acme.id, "ML-006", "B-VN 991", "Renault", "Kangoo", 2023, "VAN", "GASOLINE", 22170, "Berlin"],
    [alpina.id, "AS-001", "B-ALP 10", "BMW", "320d Touring", 2021, "SEDAN", "DIESEL", 58120, "Bregenz"],
    [alpina.id, "AS-002", "B-ALP 22", "Toyota", "Proace", 2022, "VAN", "DIESEL", 40210, "Dornbirn"],
    [alpina.id, "AS-003", "B-ALP 31", "Hyundai", "Kona Electric", 2023, "SUV", "ELECTRIC", 16200, "Feldkirch"],
    [alpina.id, "AS-004", "B-ALP 44", "VW", "Golf", 2020, "HATCHBACK", "GASOLINE", 67010, "Bregenz"],
    [alpina.id, "AS-005", "B-ALP 55", "MAN", "TGE", 2021, "VAN", "DIESEL", 80120, "Bludenz"]
  ] as const;

  const vehicles = await Promise.all(
    vehicleTemplates.map((vehicle, index) =>
      prisma.vehicle.create({
        data: {
          companyId: vehicle[0],
          internalNumber: vehicle[1],
          licensePlate: vehicle[2],
          brand: vehicle[3],
          model: vehicle[4],
          year: vehicle[5],
          category: vehicle[6],
          fuelType: vehicle[7],
          mileage: vehicle[8],
          location: vehicle[9],
          status: index === 2 ? "MAINTENANCE" : "AVAILABLE",
          qrCodeToken: token(),
          qrCodeEnabled: true,
          notes: "Bordmappe und Notfallkarte im Handschuhfach."
        }
      })
    )
  );

  const bookingOne = await prisma.booking.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[0].id,
      userId: userOne.id,
      startAt: addHours(new Date(), 8),
      endAt: addHours(new Date(), 16),
      purpose: "Kundentermin Hamburg",
      destination: "Hamburg",
      status: "PENDING"
    }
  });

  const bookingTwo = await prisma.booking.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[1].id,
      userId: userOne.id,
      startAt: subDays(new Date(), 2),
      endAt: subDays(new Date(), 1),
      purpose: "Messefahrt",
      destination: "Hannover",
      status: "APPROVED",
      approvedById: manager.id,
      approvedAt: subDays(new Date(), 3)
    }
  });

  const alpinaBooking = await prisma.booking.create({
    data: {
      companyId: alpina.id,
      vehicleId: vehicles[7].id,
      userId: alpinaUser.id,
      startAt: addDays(new Date(), 1),
      endAt: addDays(new Date(), 2),
      purpose: "Serviceroute Tirol",
      destination: "Innsbruck",
      status: "APPROVED",
      approvedById: alpinaManager.id,
      approvedAt: subDays(new Date(), 1)
    }
  });

  const activeTrip = await prisma.tripLog.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[4].id,
      userId: userOne.id,
      startAt: addHours(new Date(), -2),
      startMileage: 46220,
      startLocation: "Leipzig",
      destination: "Dresden",
      purpose: "Lieferantenbesuch",
      tripType: "BUSINESS"
    }
  });

  await prisma.tripLog.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[1].id,
      userId: userOne.id,
      bookingId: bookingTwo.id,
      startAt: subDays(new Date(), 2),
      endAt: subDays(new Date(), 1),
      startMileage: 18120,
      endMileage: 18880,
      distance: 760,
      startLocation: "Berlin",
      destination: "Hannover",
      purpose: "Messefahrt",
      tripType: "BUSINESS",
      locked: true
    }
  });

  const damage = await prisma.damageReport.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[2].id,
      reporterUserId: userOne.id,
      title: "Kratzer an rechter Schiebetuer",
      description: "Beim Beladen entdeckt, keine Funktionseinschraenkung.",
      damageLocation: "Rechte Seite",
      severity: "MEDIUM",
      status: "IN_REVIEW",
      photoUrls: ["/uploads/.gitkeep"]
    }
  });

  await prisma.damageReport.create({
    data: {
      companyId: alpina.id,
      vehicleId: vehicles[9].id,
      reporterUserId: alpinaUser.id,
      title: "Steinschlag Frontscheibe",
      description: "Kleiner Steinschlag im Sichtfeld.",
      damageLocation: "Frontscheibe",
      severity: "HIGH",
      status: "SCHEDULED_FOR_REPAIR"
    }
  });

  await prisma.maintenanceRecord.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[2].id,
      title: "Reparatur Schiebetuer",
      description: "Schaden begutachten und Lackarbeiten planen.",
      type: "REPAIR",
      startAt: addDays(new Date(), 2),
      endAt: addDays(new Date(), 4),
      cost: 850,
      vendor: "Werkstatt Berlin Mitte",
      status: "PLANNED",
      damageReportId: damage.id,
      createdById: manager.id
    }
  });

  await prisma.maintenanceRecord.create({
    data: {
      companyId: alpina.id,
      vehicleId: vehicles[8].id,
      title: "Jahresservice",
      type: "SERVICE",
      startAt: addDays(new Date(), 8),
      endAt: addDays(new Date(), 9),
      cost: 420,
      vendor: "Autohaus Bregenz",
      status: "PLANNED",
      createdById: alpinaManager.id
    }
  });

  await prisma.vehicleHandover.create({
    data: {
      companyId: acme.id,
      vehicleId: vehicles[1].id,
      bookingId: bookingTwo.id,
      userId: userOne.id,
      type: "RETURN",
      handledAt: subDays(new Date(), 1),
      mileage: 18880,
      energyLevel: 62,
      exteriorConditionNote: "Keine neuen Schaeden",
      interiorConditionNote: "Sauber",
      existingDamageConfirmed: true,
      signatureName: "Lisa Fahrer"
    }
  });

  await prisma.vehicleHandover.create({
    data: {
      companyId: alpina.id,
      vehicleId: vehicles[7].id,
      bookingId: alpinaBooking.id,
      userId: alpinaUser.id,
      type: "HANDOVER",
      handledAt: new Date(),
      mileage: 40210,
      energyLevel: 80,
      exteriorConditionNote: "Leichte Gebrauchsspuren",
      interiorConditionNote: "OK",
      existingDamageConfirmed: true,
      signatureName: "Julia Nutzerin"
    }
  });

  await prisma.vehicle.update({ where: { id: vehicles[4].id }, data: { status: "IN_USE" } });

  await prisma.auditLog.createMany({
    data: [
      { companyId: acme.id, actorUserId: owner.id, action: "company.created", entityType: "Company", entityId: acme.id, metadata: { seed: true } },
      { companyId: acme.id, actorUserId: manager.id, action: "booking.requested", entityType: "Booking", entityId: bookingOne.id, metadata: { seed: true } },
      { companyId: acme.id, actorUserId: userOne.id, action: "trip.started", entityType: "TripLog", entityId: activeTrip.id, metadata: { seed: true } },
      { companyId: acme.id, actorUserId: userOne.id, action: "damage.created", entityType: "DamageReport", entityId: damage.id, metadata: { seed: true } },
      { companyId: alpina.id, actorUserId: alpinaOwner.id, action: "company.created", entityType: "Company", entityId: alpina.id, metadata: { seed: true } },
      { companyId: platform.id, actorUserId: platformAdmin.id, action: "platform.seeded", entityType: "Platform", entityId: platform.id, metadata: { seed: true } }
    ]
  });

  process.stdout.write("Seed complete\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
