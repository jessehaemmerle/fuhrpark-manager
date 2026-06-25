export type RuleTimeRange = {
  startAt: Date;
  endAt: Date;
};

export function rangesOverlap(requested: RuleTimeRange, existing: RuleTimeRange) {
  return requested.startAt < existing.endAt && requested.endAt > existing.startAt;
}

export function hasBlockingMaintenanceConflict(
  requested: RuleTimeRange,
  records: Array<RuleTimeRange & { status: string }>
) {
  return records.some((record) => ["PLANNED", "IN_PROGRESS"].includes(record.status) && rangesOverlap(requested, record));
}

export function hasActiveTripConflict(trips: Array<{ endAt: Date | null }>) {
  return trips.some((trip) => trip.endAt === null);
}

export function calculateDistance(startMileage: number, endMileage: number) {
  if (endMileage < startMileage) {
    throw new Error("Der Endkilometerstand muss groesser oder gleich dem Startkilometerstand sein.");
  }
  return endMileage - startMileage;
}

export function exceedsPlanLimit(current: number, limit: number) {
  return current >= limit;
}

export function canAccessTenantResource(user: { role: string; companyId: string }, resourceCompanyId: string) {
  return user.role === "PLATFORM_ADMIN" || user.companyId === resourceCompanyId;
}

export function canAccessQrVehicle(
  user: { role: string; companyId: string },
  vehicle: { companyId: string; qrCodeEnabled: boolean; qrCodeToken: string | null }
) {
  return Boolean(vehicle.qrCodeEnabled && vehicle.qrCodeToken && canAccessTenantResource(user, vehicle.companyId));
}

export function driverBlockReason(driver: {
  driverBlocked: boolean;
  driverApproved: boolean;
  licenseValidUntil: Date | null;
}, now = new Date()) {
  if (driver.driverBlocked) return "blocked";
  if (!driver.driverApproved) return "not_approved";
  if (driver.licenseValidUntil && driver.licenseValidUntil < now) return "license_expired";
  return null;
}

export function isFleetAdminRole(role: string) {
  return role === "OWNER" || role === "FLEET_MANAGER" || role === "PLATFORM_ADMIN";
}

/**
 * QR codes are a plan feature. The feature gate must only block when a QR code is
 * being newly enabled — never when creating/editing a vehicle that keeps QR off,
 * and never when re-saving a vehicle that already had QR enabled. For creation
 * there is no previous state, so the default (`false`) makes the gate fire purely
 * on whether QR is being switched on.
 */
export function qrFeatureGateRequired(nextEnabled: boolean, previousEnabled = false) {
  return nextEnabled && !previousEnabled;
}
