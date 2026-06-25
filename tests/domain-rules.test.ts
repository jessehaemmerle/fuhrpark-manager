import { describe, expect, it } from "vitest";
import {
  calculateDistance,
  canAccessQrVehicle,
  canAccessTenantResource,
  driverBlockReason,
  exceedsPlanLimit,
  hasActiveTripConflict,
  hasBlockingMaintenanceConflict,
  isFleetAdminRole,
  qrFeatureGateRequired,
  rangesOverlap
} from "../src/lib/domain-rules";

describe("domain rules", () => {
  it("detects booking time conflicts using requestedStart < existingEnd and requestedEnd > existingStart", () => {
    const existing = { startAt: new Date("2026-06-08T10:00:00Z"), endAt: new Date("2026-06-08T12:00:00Z") };

    expect(rangesOverlap({ startAt: new Date("2026-06-08T09:00:00Z"), endAt: new Date("2026-06-08T10:00:00Z") }, existing)).toBe(false);
    expect(rangesOverlap({ startAt: new Date("2026-06-08T09:30:00Z"), endAt: new Date("2026-06-08T10:30:00Z") }, existing)).toBe(true);
    expect(rangesOverlap({ startAt: new Date("2026-06-08T11:30:00Z"), endAt: new Date("2026-06-08T12:30:00Z") }, existing)).toBe(true);
  });

  it("calculates trip distance and rejects lower end mileage", () => {
    expect(calculateDistance(100, 130)).toBe(30);
    expect(calculateDistance(100, 100)).toBe(0);
    expect(() => calculateDistance(100, 99)).toThrow(/Endkilometerstand/);
  });

  it("enforces plan limit boundaries", () => {
    expect(exceedsPlanLimit(4, 5)).toBe(false);
    expect(exceedsPlanLimit(5, 5)).toBe(true);
  });

  it("detects maintenance conflict only for blocking statuses", () => {
    const requested = { startAt: new Date("2026-06-08T10:00:00Z"), endAt: new Date("2026-06-08T12:00:00Z") };
    expect(
      hasBlockingMaintenanceConflict(requested, [
        { startAt: new Date("2026-06-08T09:00:00Z"), endAt: new Date("2026-06-08T11:00:00Z"), status: "PLANNED" }
      ])
    ).toBe(true);
    expect(
      hasBlockingMaintenanceConflict(requested, [
        { startAt: new Date("2026-06-08T09:00:00Z"), endAt: new Date("2026-06-08T11:00:00Z"), status: "CANCELLED" }
      ])
    ).toBe(false);
  });

  it("detects active trip conflicts", () => {
    expect(hasActiveTripConflict([{ endAt: new Date() }])).toBe(false);
    expect(hasActiveTripConflict([{ endAt: new Date() }, { endAt: null }])).toBe(true);
  });

  it("enforces tenant isolation with platform admin override", () => {
    expect(canAccessTenantResource({ role: "USER", companyId: "a" }, "a")).toBe(true);
    expect(canAccessTenantResource({ role: "USER", companyId: "a" }, "b")).toBe(false);
    expect(canAccessTenantResource({ role: "PLATFORM_ADMIN", companyId: "ops" }, "b")).toBe(true);
  });

  it("checks QR token access rules", () => {
    const user = { role: "USER", companyId: "a" };
    expect(canAccessQrVehicle(user, { companyId: "a", qrCodeEnabled: true, qrCodeToken: "token" })).toBe(true);
    expect(canAccessQrVehicle(user, { companyId: "b", qrCodeEnabled: true, qrCodeToken: "token" })).toBe(false);
    expect(canAccessQrVehicle(user, { companyId: "a", qrCodeEnabled: false, qrCodeToken: "token" })).toBe(false);
    expect(canAccessQrVehicle(user, { companyId: "a", qrCodeEnabled: true, qrCodeToken: null })).toBe(false);
  });

  it("detects blocked, unapproved and expired drivers", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    expect(driverBlockReason({ driverBlocked: true, driverApproved: true, licenseValidUntil: null }, now)).toBe("blocked");
    expect(driverBlockReason({ driverBlocked: false, driverApproved: false, licenseValidUntil: null }, now)).toBe("not_approved");
    expect(driverBlockReason({ driverBlocked: false, driverApproved: true, licenseValidUntil: new Date("2026-06-01T00:00:00Z") }, now)).toBe("license_expired");
    expect(driverBlockReason({ driverBlocked: false, driverApproved: true, licenseValidUntil: new Date("2026-07-01T00:00:00Z") }, now)).toBeNull();
  });

  it("requires the QR feature gate only when QR is newly enabled", () => {
    // Vehicle creation (no previous state): gate fires purely on whether QR is on.
    expect(qrFeatureGateRequired(false)).toBe(false);
    expect(qrFeatureGateRequired(true)).toBe(true);
    // Vehicle update: only block when switching QR from off to on.
    expect(qrFeatureGateRequired(true, false)).toBe(true); // newly enabling
    expect(qrFeatureGateRequired(true, true)).toBe(false); // already on, plain re-save
    expect(qrFeatureGateRequired(false, true)).toBe(false); // turning QR off
    expect(qrFeatureGateRequired(false, false)).toBe(false); // stays off
  });

  it("separates regular users from fleet admin roles", () => {
    expect(isFleetAdminRole("USER")).toBe(false);
    expect(isFleetAdminRole("FLEET_MANAGER")).toBe(true);
    expect(isFleetAdminRole("OWNER")).toBe(true);
    expect(isFleetAdminRole("PLATFORM_ADMIN")).toBe(true);
  });
});
