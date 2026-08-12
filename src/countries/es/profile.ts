/**
 * Reading the Spanish profile, and the one place that knows how a community key
 * becomes a rule id.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { parseDeclaredPercentage } from "@engine/money/money.ts";

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

const AEAT_PERCENTAGE_PATTERN = /^\d+(?:\.(\d+))?$/;

/**
 * Percentage returned by AEAT, kept as a canonical decimal for exact arithmetic.
 * The 2026 algorithm truncates TIPO at the second decimal, so more precision is
 * not an official output and is refused instead of being rounded silently.
 */
export function aeatWithholdingRateOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["aeatWithholdingRate"];
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError("La ritenuta AEAT deve essere una percentuale decimale");
  }

  const text = typeof value === "number" ? String(value) : value;
  const fraction = AEAT_PERCENTAGE_PATTERN.exec(text)?.[1];
  if (fraction !== undefined && fraction.length > 2) {
    throw new TypeError("La ritenuta AEAT 2026 ammette al massimo due decimali");
  }

  return parseDeclaredPercentage(value).decimal;
}
