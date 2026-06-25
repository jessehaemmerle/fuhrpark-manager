export const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  FLEET_MANAGER: "Fuhrparkmanagement",
  USER: "Nutzer",
  PLATFORM_ADMIN: "Platform Admin"
};

export const tierLabels: Record<string, string> = {
  TRIAL: "Trial",
  BASIC: "Basic",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise"
};

export const licenseStatusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  ARCHIVED: "Archiviert"
};

export const vehicleStatusLabels: Record<string, string> = {
  AVAILABLE: "Verfügbar",
  IN_USE: "In Nutzung",
  DOWNTIME: "Ausfall",
  MAINTENANCE: "Wartung",
  RETIRED: "Archiviert"
};

export const vehicleCategoryLabels: Record<string, string> = {
  SEDAN: "Limousine",
  SUV: "SUV",
  TRUCK: "LKW",
  VAN: "Transporter",
  HATCHBACK: "Kompakt",
  COUPE: "Coupe",
  OTHER: "Sonstige"
};

export const fuelTypeLabels: Record<string, string> = {
  GASOLINE: "Benzin",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Elektro",
  HYDROGEN: "Wasserstoff",
  OTHER: "Sonstige"
};

export const bookingStatusLabels: Record<string, string> = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
  COMPLETED: "Abgeschlossen"
};

export const maintenanceStatusLabels: Record<string, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Bearbeitung",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen"
};

export const maintenanceTypeLabels: Record<string, string> = {
  INSPECTION: "Inspektion",
  REPAIR: "Reparatur",
  TIRE_CHANGE: "Reifenwechsel",
  SERVICE: "Service",
  CLEANING: "Reinigung",
  OTHER: "Sonstige"
};

export const tripTypeLabels: Record<string, string> = {
  BUSINESS: "Geschäftlich",
  PRIVATE: "Privat",
  COMMUTE: "Arbeitsweg",
  OTHER: "Sonstige"
};

export const damageSeverityLabels: Record<string, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
  CRITICAL: "Kritisch"
};

export const damageStatusLabels: Record<string, string> = {
  OPEN: "Offen",
  IN_REVIEW: "In Prüfung",
  SCHEDULED_FOR_REPAIR: "Reparatur geplant",
  RESOLVED: "Erledigt",
  REJECTED: "Abgelehnt"
};

export const handoverTypeLabels: Record<string, string> = {
  HANDOVER: "Übergabe",
  RETURN: "Rückgabe"
};

export const notificationTypeLabels: Record<string, string> = {
  BOOKING_REQUESTED: "Buchungsanfrage",
  BOOKING_APPROVED: "Buchung genehmigt",
  BOOKING_REJECTED: "Buchung abgelehnt",
  BOOKING_OVERDUE: "Buchung überfällig",
  DAMAGE_REPORTED: "Schaden gemeldet",
  MAINTENANCE_DUE: "Wartung fällig",
  DEADLINE_DUE: "Frist fällig",
  LICENSE_EXPIRING: "Fahrerlaubnis läuft ab",
  LICENSE_CHECK_DUE: "Führerscheinkontrolle fällig",
  INVITATION: "Einladung",
  GENERAL: "Hinweis"
};

export const documentTypeLabels: Record<string, string> = {
  REGISTRATION: "Zulassung / Fahrzeugschein",
  INSURANCE: "Versicherung",
  LEASING: "Leasingvertrag",
  INSPECTION: "HU/AU-Bericht",
  SERVICE_RECORD: "Servicenachweis",
  OTHER: "Sonstiges"
};

export const deadlineTypeLabels: Record<string, string> = {
  HU: "Hauptuntersuchung (TÜV)",
  AU: "Abgasuntersuchung",
  INSPECTION: "Inspektion / Service",
  INSURANCE: "Versicherung",
  LEASING_END: "Leasing-Ende",
  TIRE_CHANGE: "Reifenwechsel",
  TAX: "Kfz-Steuer",
  OTHER: "Sonstige Frist"
};

export const costCategoryLabels: Record<string, string> = {
  FUEL: "Kraftstoff",
  CHARGING: "Ladestrom",
  MAINTENANCE: "Wartung / Reparatur",
  INSURANCE: "Versicherung",
  LEASING: "Leasing / Finanzierung",
  TAX: "Steuer",
  FINE: "Bußgeld",
  CLEANING: "Reinigung",
  TOLL: "Maut",
  OTHER: "Sonstige"
};

export const licenseCheckResultLabels: Record<string, string> = {
  VALID: "Gültig vorgelegt",
  INVALID: "Ungültig / Beanstandung",
  NOT_PRESENTED: "Nicht vorgelegt"
};

export const invitationStatusLabels: Record<string, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  REVOKED: "Zurückgezogen",
  EXPIRED: "Abgelaufen"
};

export const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  ISSUED: "Offen",
  SENT: "Versendet",
  PAID: "Bezahlt",
  CANCELLED: "Storniert"
};

export const invoiceTaxModeLabels: Record<string, string> = {
  STANDARD: "Standard (USt)",
  REVERSE_CHARGE: "Reverse Charge"
};

export function statusTone(status: string) {
  if (["AVAILABLE", "APPROVED", "COMPLETED", "RESOLVED", "ACTIVE", "VALID", "ACCEPTED", "PAID", "SENT"].includes(status)) return "success";
  if (["PENDING", "PLANNED", "IN_REVIEW", "SCHEDULED_FOR_REPAIR", "IN_PROGRESS", "NOT_PRESENTED", "DRAFT", "ISSUED"].includes(status)) return "warning";
  if (["REJECTED", "CANCELLED", "CRITICAL", "DOWNTIME", "RETIRED", "ARCHIVED", "INVALID", "REVOKED", "EXPIRED"].includes(status)) return "danger";
  return "neutral";
}
