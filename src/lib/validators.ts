import {
  BookingStatus,
  DamageSeverity,
  DamageStatus,
  FuelType,
  HandoverType,
  InvoiceTaxMode,
  LicenseStatus,
  MaintenanceStatus,
  MaintenanceType,
  SubscriptionTier,
  TripType,
  UserRole,
  VehicleCategory,
  VehicleStatus
} from "@prisma/client";
import { z } from "zod";
import { passwordSchema } from "@/lib/auth-validators";
export { loginSchema, registerSchema } from "@/lib/auth-validators";

const requiredText = (label: string, min = 2) =>
  z
    .string({ required_error: `${label} ist erforderlich.` })
    .trim()
    .min(min, `${label} ist erforderlich.`)
    .max(500, `${label} ist zu lang.`)
    .transform((value) => value.replace(/[<>]/g, ""));

const optionalText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(1500).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalShortText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(255).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalDate = z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.date().optional());

const checkbox = z.preprocess((value) => value === "on" || value === true || value === "true", z.boolean());

export const idSchema = z.string().min(8);

export const vehicleSchema = z.object({
  internalNumber: requiredText("Interne Nummer", 1),
  licensePlate: requiredText("Kennzeichen", 2),
  brand: requiredText("Marke"),
  model: requiredText("Modell"),
  year: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().min(1950).max(2100).optional()),
  vin: optionalShortText,
  category: z.nativeEnum(VehicleCategory),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  fuelType: z.nativeEnum(FuelType).default(FuelType.DIESEL),
  mileage: z.coerce.number().int().min(0),
  location: optionalShortText,
  notes: optionalText,
  imageUrl: optionalShortText,
  qrCodeEnabled: checkbox.default(false),
  nextServiceMileage: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).optional())
});

export const bookingSchema = z.object({
  vehicleId: idSchema,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  purpose: requiredText("Zweck"),
  destination: optionalShortText
});

export const bookingDecisionSchema = z.object({
  bookingId: idSchema,
  note: optionalText
});

export const bookingStatusSchema = z.object({
  bookingId: idSchema,
  status: z.nativeEnum(BookingStatus)
});

export const tripStartSchema = z.object({
  vehicleId: idSchema,
  bookingId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  startMileage: z.coerce.number().int().min(0),
  startLocation: optionalShortText,
  destination: optionalShortText,
  purpose: requiredText("Zweck"),
  tripType: z.nativeEnum(TripType)
});

export const tripEndSchema = z.object({
  tripLogId: idSchema,
  endMileage: z.coerce.number().int().min(0),
  destination: optionalShortText,
  notes: optionalText
});

export const tripCorrectionSchema = z.object({
  tripLogId: idSchema,
  correctionNote: requiredText("Korrekturhinweis", 5)
});

export const maintenanceSchema = z.object({
  vehicleId: idSchema,
  title: requiredText("Titel"),
  description: optionalText,
  type: z.nativeEnum(MaintenanceType),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  cost: z.coerce.number().min(0).default(0),
  vendor: optionalShortText,
  status: z.nativeEnum(MaintenanceStatus).default(MaintenanceStatus.PLANNED),
  damageReportId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional())
});

export const maintenanceStatusSchema = z.object({
  maintenanceId: idSchema,
  status: z.nativeEnum(MaintenanceStatus)
});

export const damageSchema = z.object({
  vehicleId: idSchema,
  bookingId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  tripLogId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  handoverId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  title: requiredText("Titel"),
  description: requiredText("Beschreibung", 5),
  damageLocation: optionalShortText,
  severity: z.nativeEnum(DamageSeverity),
  photoUrls: optionalText
});

export const damageStatusSchema = z.object({
  damageReportId: idSchema,
  status: z.nativeEnum(DamageStatus),
  repairCost: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().min(0).optional())
});

export const handoverSchema = z.object({
  vehicleId: idSchema,
  bookingId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  type: z.nativeEnum(HandoverType),
  handledAt: z.coerce.date().default(() => new Date()),
  mileage: z.coerce.number().int().min(0),
  energyLevel: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().min(0).max(100).optional()),
  exteriorConditionNote: optionalText,
  interiorConditionNote: optionalText,
  existingDamageConfirmed: checkbox.default(false),
  newDamageReported: checkbox.default(false),
  signatureName: optionalShortText,
  photoUrls: optionalText,
  createDamageTitle: optionalShortText,
  createDamageDescription: optionalText
});

export const departmentSchema = z.object({
  name: requiredText("Name"),
  description: optionalText,
  managerName: optionalShortText
});

export const userCreateSchema = z.object({
  name: requiredText("Name"),
  email: z.string().trim().email().toLowerCase(),
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
  departmentId: z.preprocess((value) => (value === "" ? undefined : value), idSchema.optional()),
  driverApproved: checkbox.default(false),
  driverBlocked: checkbox.default(false),
  licenseClass: optionalShortText,
  licenseNumber: optionalShortText,
  licenseValidUntil: optionalDate,
  driverNotes: optionalText
});

export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .extend({
    userId: idSchema,
    password: z.preprocess((value) => (value === "" ? undefined : value), passwordSchema.optional()),
    active: checkbox.default(true)
  });

export const driverPermissionSchema = z.object({
  userId: idSchema,
  driverApproved: checkbox.default(false),
  driverBlocked: checkbox.default(false),
  licenseClass: optionalShortText,
  licenseNumber: optionalShortText,
  licenseValidUntil: optionalDate,
  lastLicenseCheckDate: optionalDate,
  driverNotes: optionalText
});

export const companySettingsSchema = z.object({
  name: requiredText("Firmenname"),
  logoUrl: optionalShortText,
  primaryBrandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Bitte Hex-Farbe eingeben."),
  address: optionalText,
  country: z.string().trim().min(2).max(2),
  contactEmail: z.string().trim().email(),
  contactPhone: optionalShortText,
  retentionPeriodDays: z.coerce.number().int().min(30).max(3650)
});

export const subscriptionTierSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier)
});

export const platformUserAccessSchema = z.object({
  userId: idSchema,
  role: z.nativeEnum(UserRole),
  active: checkbox.default(false),
  password: z.preprocess((value) => (value === "" ? undefined : value), passwordSchema.optional())
});

const optionalEmail = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase().optional()
);

const companyBaseShape = {
  name: requiredText("Firmenname"),
  address: optionalText,
  country: z.string().trim().min(2).max(2).default("DE"),
  contactEmail: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase(),
  contactPhone: optionalShortText,
  vatId: optionalShortText,
  billingEmail: optionalEmail,
  primaryBrandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Bitte Hex-Farbe eingeben."),
  subscriptionTier: z.nativeEnum(SubscriptionTier),
  active: checkbox.default(false)
};

export const platformCompanyCreateSchema = z.object({
  ...companyBaseShape,
  trialDays: z.coerce.number().int().min(0).max(3650).default(14)
});

export const platformCompanyUpdateSchema = z.object({
  ...companyBaseShape,
  companyId: idSchema,
  trialEndDate: z.coerce.date()
});

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(1).optional()
);

const platformLicenseBaseShape = {
  companyId: idSchema,
  name: requiredText("Lizenzname"),
  tier: z.nativeEnum(SubscriptionTier),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  maxUsers: optionalPositiveInt,
  maxVehicles: optionalPositiveInt,
  notes: optionalText,
  createInitialUser: checkbox.default(false),
  initialUserName: optionalShortText,
  initialUserEmail: optionalShortText,
  initialUserRole: z.nativeEnum(UserRole).default(UserRole.OWNER),
  initialUserTemporaryPassword: optionalShortText
};

const validLicenseDateRange = <T extends { validFrom: Date; validUntil: Date }>(data: T) => data.validUntil >= data.validFrom;
const validTenantInitialRole = <T extends { createInitialUser: boolean; initialUserRole: UserRole }>(data: T) =>
  !data.createInitialUser || data.initialUserRole !== UserRole.PLATFORM_ADMIN;
const validInitialUserFields = <
  T extends {
    createInitialUser: boolean;
    initialUserName?: string;
    initialUserEmail?: string;
    initialUserTemporaryPassword?: string;
  }
>(
  data: T
) => !data.createInitialUser || Boolean(data.initialUserName && data.initialUserEmail && data.initialUserTemporaryPassword);
const validInitialUserEmail = <T extends { createInitialUser: boolean; initialUserEmail?: string }>(data: T) =>
  !data.createInitialUser || !data.initialUserEmail || z.string().email().safeParse(data.initialUserEmail).success;
const validInitialUserPassword = <T extends { createInitialUser: boolean; initialUserTemporaryPassword?: string }>(data: T) =>
  !data.createInitialUser || !data.initialUserTemporaryPassword || passwordSchema.safeParse(data.initialUserTemporaryPassword).success;
const licenseDateRangeMessage = {
  message: "Die Lizenz darf nicht vor dem Startdatum enden.",
  path: ["validUntil"]
};

export const platformLicenseCreateSchema = z
  .object(platformLicenseBaseShape)
  .refine(validLicenseDateRange, licenseDateRangeMessage)
  .refine(validTenantInitialRole, {
    message: "Initiale Mandantennutzer duerfen keine Plattform-Admin-Rolle erhalten.",
    path: ["initialUserRole"]
  })
  .refine(validInitialUserFields, {
    message: "Name, E-Mail und Einmalpasswort sind fuer den initialen Nutzer erforderlich.",
    path: ["initialUserEmail"]
  })
  .refine(validInitialUserEmail, {
    message: "Bitte gueltige E-Mail eingeben.",
    path: ["initialUserEmail"]
  })
  .refine(validInitialUserPassword, {
    message: "Das Einmalpasswort muss mindestens 10 Zeichen haben und Grossbuchstaben, Kleinbuchstaben sowie eine Zahl enthalten.",
    path: ["initialUserTemporaryPassword"]
  });

export const platformLicenseUpdateSchema = z
  .object({
    ...platformLicenseBaseShape,
    licenseId: idSchema,
    status: z.nativeEnum(LicenseStatus)
  })
  .refine(validLicenseDateRange, {
    message: "Die Lizenz darf nicht vor dem Startdatum enden.",
    path: ["validUntil"]
  });

export const platformLicenseIdSchema = z.object({
  licenseId: idSchema
});

// --- Plattform-Rechnungswesen --------------------------------------------

export const billingSettingsSchema = z.object({
  legalName: requiredText("Firmenname"),
  addressLine1: requiredText("Adresse"),
  addressLine2: optionalShortText,
  postalCode: requiredText("PLZ", 1),
  city: requiredText("Ort"),
  country: z.string().trim().min(2).max(2).default("AT"),
  vatId: requiredText("UID-Nummer", 4),
  registrationInfo: optionalShortText,
  email: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase(),
  phone: optionalShortText,
  website: optionalShortText,
  iban: optionalShortText,
  bic: optionalShortText,
  bankName: optionalShortText,
  invoiceNumberPrefix: z.string().trim().min(1, "Praefix erforderlich.").max(12),
  taxRatePercent: z.coerce.number().int().min(0).max(99),
  paymentTermsDays: z.coerce.number().int().min(0).max(180),
  footerNote: optionalText,
  reverseChargeNote: requiredText("Reverse-Charge-Hinweis", 4)
});

const euroAmount = z.coerce.number().min(0).max(1_000_000);

export const invoiceDraftSchema = z.object({
  invoiceId: idSchema,
  description: requiredText("Beschreibung"),
  netAmountEuros: euroAmount,
  taxMode: z.nativeEnum(InvoiceTaxMode),
  taxRatePercent: z.coerce.number().int().min(0).max(99),
  notes: optionalText
});

export const invoiceIdSchema = z.object({
  invoiceId: idSchema
});

export const issueInvoiceSchema = z.object({
  invoiceId: idSchema,
  recipientEmail: optionalEmail
});

export const createInvoiceForLicenseSchema = z.object({
  licenseId: idSchema
});
