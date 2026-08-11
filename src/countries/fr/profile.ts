/**
 * Reading the French profile.
 *
 * France has no regional income tax, so `region` here is not a tax jurisdiction:
 * it carries the two genuinely geographic facts a payslip depends on — the
 * Alsace-Moselle local health regime, and the commune's `versement mobilité`.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";

export const DEFAULT_REGION = "france";

/** Situations that decide the base number of `parts` and the décote amount. */
export const HOUSEHOLDS = ["single", "couple"] as const;
export type Household = (typeof HOUSEHOLDS)[number];

function option(profile: EmployeeProfile, key: string): string | number | boolean | undefined {
  return profile.countryOptions?.[key];
}

export function isCadre(profile: EmployeeProfile): boolean {
  return String(option(profile, "statut") ?? "non_cadre") === "cadre";
}

export function householdOf(profile: EmployeeProfile): Household {
  const value = String(option(profile, "foyer") ?? "single");
  return HOUSEHOLDS.includes(value as Household) ? (value as Household) : "single";
}

export function childrenOf(profile: EmployeeProfile): number {
  const value = option(profile, "children");
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * The `quotient familial`, art. 194 CGI: one part for a single filer, two for a
 * couple, half a part for each of the first two children and a whole part from
 * the third.
 */
export function partsOf(profile: EmployeeProfile): number {
  const children = childrenOf(profile);
  const base = householdOf(profile) === "couple" ? 2 : 1;
  const fromChildren = children <= 2 ? children * 0.5 : 1 + (children - 2);
  return base + fromChildren;
}

export function basePartsOf(profile: EmployeeProfile): number {
  return householdOf(profile) === "couple" ? 2 : 1;
}

export function healthRegimeKey(profile: EmployeeProfile): string {
  return profile.region === "alsace_moselle" ? "alsace_moselle" : "standard";
}

export function mobilityKey(profile: EmployeeProfile): string {
  const value = String(option(profile, "versementMobilite") ?? "none");
  return value;
}

export function atmpKey(profile: EmployeeProfile): string {
  return String(option(profile, "atmpRiskClass") ?? "office");
}

/** Fnal and the training contribution both step at a headcount, not at a salary. */
export function fnalKey(profile: EmployeeProfile): string {
  return (profile.companySize ?? 50) >= 50 ? "fifty_plus" : "under_fifty";
}

export function trainingKey(profile: EmployeeProfile): string {
  return (profile.companySize ?? 50) >= 11 ? "eleven_plus" : "under_eleven";
}
