/**
 * Reading the German profile: the country-specific options, and the lookup keys
 * they resolve to.
 *
 * These live in one module because the same key is needed twice — the care
 * insurance rate is charged as a contribution AND enters the Vorsorgepauschale,
 * and the two must never disagree about whether this employee has children.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { DEFAULT_LAND, SAXONY } from "./geography.ts";

export const STEUERKLASSEN = ["I", "II", "III", "IV"] as const;
export type Steuerklasse = (typeof STEUERKLASSEN)[number];

export const ZUSATZBEITRAG_KEYS = ["low", "average", "high"] as const;

/** The age from which a childless employee pays the Pflege surcharge (§ 55 Abs. 3 SGB XI). */
const CHILDLESS_SURCHARGE_AGE = 23;

function option(profile: EmployeeProfile, key: string): string | number | boolean | undefined {
  return profile.countryOptions?.[key];
}

export function steuerklasseOf(profile: EmployeeProfile): Steuerklasse {
  const value = option(profile, "steuerklasse");
  if (!STEUERKLASSEN.includes(value as Steuerklasse)) {
    throw new TypeError(`Unbekannte Steuerklasse: "${String(value)}"`);
  }
  return value as Steuerklasse;
}

/** Only class III uses the Splitting tariff (§ 32a Abs. 5): tax on half, doubled. */
export function isSplittingClass(profile: EmployeeProfile): boolean {
  return steuerklasseOf(profile) === "III";
}

export function hasParentStatus(profile: EmployeeProfile): boolean {
  return option(profile, "hasParentStatus") === true;
}

export function qualifyingChildrenUnder25(profile: EmployeeProfile): number {
  const value = option(profile, "qualifyingChildrenUnder25");
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TypeError(`Ungültige Zahl berücksichtigungsfähiger Kinder: "${String(value)}"`);
  }
  return parsed;
}

export function landOf(profile: EmployeeProfile): string {
  const value = profile.region;
  return typeof value === "string" && value.length > 0 ? value : DEFAULT_LAND;
}

export function isChurchMember(profile: EmployeeProfile): boolean {
  return String(option(profile, "churchMember") ?? "no") === "yes";
}

export function zusatzbeitragKey(profile: EmployeeProfile): string {
  const value = String(option(profile, "zusatzbeitrag") ?? "average");
  return (ZUSATZBEITRAG_KEYS as readonly string[]).includes(value) ? value : "average";
}

/**
 * The care-insurance key. Two independent modifiers on one rate:
 *
 *   childless and 23 or older   +0,6 points  (§ 55 Abs. 3 SGB XI)
 *   second to fifth child       −0,25 points each, while the youngest is under 25
 *   Sachsen                     +1,0 point on the employee, because the Land
 *                               kept the Buß- und Bettag as a public holiday
 *
 * A childless employee under 23 pays the plain 1,8% — the same rate as a parent
 * of one child — which is why the age matters and the surcharge is not simply
 * "has no children".
 */
export function careInsuranceKey(profile: EmployeeProfile): string {
  const parent = hasParentStatus(profile);
  const children = qualifyingChildrenUnder25(profile);
  const age = profile.age ?? CHILDLESS_SURCHARGE_AGE;
  const band =
    !parent
      ? age >= CHILDLESS_SURCHARGE_AGE
        ? "childless"
        : "children1"
      : children < 2
        ? "children1"
        : `children${Math.min(children, 5)}${children >= 5 ? "plus" : ""}`;

  return landOf(profile) === SAXONY ? `saxony_${band}` : band;
}

/** The employer's care share: half everywhere, one point less in Sachsen. */
export function careInsuranceEmployerKey(profile: EmployeeProfile): string {
  return landOf(profile) === SAXONY ? "saxony" : "standard";
}

/** Church tax is keyed by Land, but only for a member — otherwise `none`. */
export function churchKey(profile: EmployeeProfile): string {
  return isChurchMember(profile) ? landOf(profile) : "none";
}
