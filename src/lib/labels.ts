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
  AVAILABLE: "Verfuegbar",
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
  BUSINESS: "Geschaeftlich",
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
  IN_REVIEW: "In Pruefung",
  SCHEDULED_FOR_REPAIR: "Reparatur geplant",
  RESOLVED: "Erledigt",
  REJECTED: "Abgelehnt"
};

export const handoverTypeLabels: Record<string, string> = {
  HANDOVER: "Uebergabe",
  RETURN: "Rueckgabe"
};

export function statusTone(status: string) {
  if (["AVAILABLE", "APPROVED", "COMPLETED", "RESOLVED", "ACTIVE"].includes(status)) return "success";
  if (["PENDING", "PLANNED", "IN_REVIEW", "SCHEDULED_FOR_REPAIR", "IN_PROGRESS"].includes(status)) return "warning";
  if (["REJECTED", "CANCELLED", "CRITICAL", "DOWNTIME", "RETIRED", "ARCHIVED"].includes(status)) return "danger";
  return "neutral";
}
