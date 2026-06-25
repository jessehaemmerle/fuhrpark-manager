export const SUPPORTED_LOCALES = ["de", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

export const localeLabels: Record<Locale, string> = {
  de: "Deutsch",
  en: "English"
};

/**
 * Scaffold dictionary. The app currently ships German-first; this provides the
 * `t()` plumbing and a representative key set so surfaces can be migrated to
 * translated strings incrementally without another infrastructure change.
 */
const dictionaries: Record<Locale, Record<string, string>> = {
  de: {
    "nav.dashboard": "Dashboard",
    "nav.vehicles": "Fahrzeuge",
    "nav.bookings": "Buchungen",
    "nav.calendar": "Kalender",
    "nav.tripLog": "Fahrtenbuch",
    "nav.maintenance": "Wartung",
    "nav.deadlines": "Termine & Fristen",
    "nav.costs": "Kosten",
    "nav.documents": "Dokumente",
    "nav.compliance": "Führerscheinkontrolle",
    "nav.damageReports": "Schäden",
    "nav.handovers": "Übergaben",
    "nav.notifications": "Benachrichtigungen",
    "nav.users": "Nutzer",
    "nav.invitations": "Einladungen",
    "nav.departments": "Abteilungen",
    "nav.reports": "Reports",
    "nav.subscription": "Abo & Nutzung",
    "nav.settings": "Einstellungen",
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.create": "Anlegen"
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.vehicles": "Vehicles",
    "nav.bookings": "Bookings",
    "nav.calendar": "Calendar",
    "nav.tripLog": "Trip log",
    "nav.maintenance": "Maintenance",
    "nav.deadlines": "Deadlines",
    "nav.costs": "Costs",
    "nav.documents": "Documents",
    "nav.compliance": "Licence checks",
    "nav.damageReports": "Damages",
    "nav.handovers": "Handovers",
    "nav.notifications": "Notifications",
    "nav.users": "Users",
    "nav.invitations": "Invitations",
    "nav.departments": "Departments",
    "nav.reports": "Reports",
    "nav.subscription": "Plan & usage",
    "nav.settings": "Settings",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.create": "Create"
  }
};

export function normalizeLocale(locale: string | null | undefined): Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : DEFAULT_LOCALE;
}

export function getDictionary(locale: string | null | undefined) {
  return dictionaries[normalizeLocale(locale)];
}

export function translator(locale: string | null | undefined) {
  const dictionary = getDictionary(locale);
  return (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key;
}
