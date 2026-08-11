/**
 * Reading the Spanish profile, and the one place that knows how a community key
 * becomes a rule id.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";

export const AUTONOMIC_SCALE_PREFIX = "ES.IRPF.ESCALA.AUTONOMICA.";

export const COTIZACION_GROUPS = [
  "grupo1",
  "grupo2",
  "grupo3",
  "grupo4",
  "grupo5",
  "grupo6",
  "grupo7",
] as const;

export const DEFAULT_COTIZACION_GROUP = "grupo5";
export const DEFAULT_REGION = "MADRID";

export function autonomousScaleRuleId(key: string): string {
  return `${AUTONOMIC_SCALE_PREFIX}${key}`;
}

export function regionOf(profile: EmployeeProfile): string {
  return profile.region && profile.region.length > 0 ? profile.region : DEFAULT_REGION;
}

/**
 * The unemployment and FOGASA rates differ by contract type, and the gap is
 * deliberate policy: a fixed-term contract costs the employer 1,2 points more.
 */
export function contractKey(profile: EmployeeProfile): string {
  return profile.contractType === "fixed_term" ? "fixed_term" : "permanent";
}

export function cotizacionGroupOf(profile: EmployeeProfile): string {
  const value = String(profile.jobLevel ?? DEFAULT_COTIZACION_GROUP);
  return (COTIZACION_GROUPS as readonly string[]).includes(value)
    ? value
    : DEFAULT_COTIZACION_GROUP;
}

export function riskClassOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["cnaeRiskClass"];
  return typeof value === "string" ? value : "office";
}

/** Percentage returned by the employer's AEAT 2026 withholding calculation. */
export function aeatWithholdingRateOf(profile: EmployeeProfile): number {
  const value = profile.countryOptions?.["aeatWithholdingRate"];
  const rate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new TypeError("A valid AEAT withholding rate is required before calculating Spanish payroll");
  }
  return rate;
}
