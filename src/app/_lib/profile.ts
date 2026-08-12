/**
 * URL search params ↔ EmployeeProfile, driven by the adapter rather than by a
 * list of Italian field names.
 *
 * The whole calculation stays addressable by URL — a payroll figure someone can
 * send to their accountant with the inputs attached is worth more than one
 * trapped in a client-side store. What changed when the fourth country landed is
 * WHERE the field list comes from: `adapter.requiredInputs()`. This module now
 * knows what a `money` field is and what a `select` field is, and nothing about
 * CCNLs, Steuerklassen or comunidades autónomas.
 *
 * Unknown or impossible values fall back to the descriptor's own default rather
 * than throwing — a hand-edited URL should give a sensible profile, not an error
 * page — and that same fallback is what makes cascading fields work: choose a
 * different CCNL and the level that no longer exists is replaced by the new
 * default, with no country-specific branch anywhere.
 */

import { isSupported, resolveAdapter } from "@engine/adapter/registry.ts";
import type {
  EmployeeProfile,
  EUCountry,
  InputDescriptor,
} from "@engine/model/employee-profile.ts";
import { EU_COUNTRIES } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";
import { registerAllCountries } from "@countries/index.ts";
import { paramNameOf } from "./fields.ts";
import { LOCALE_TAG, message, type Locale } from "./i18n.ts";

registerAllCountries();

export type RawParams = Record<string, string | string[] | undefined>;

export const DEFAULT_COUNTRY: EUCountry = "IT";
export const DEFAULT_GROSS_EUROS = 45_000;
const MIN_GROSS_EUROS = 1;
const MAX_GROSS_EUROS = 1_000_000;
const TAX_YEAR = 2026;

/** Applied when the country's adapter does not declare the field itself. */
const BASE_PROFILE = {
  taxYear: TAX_YEAR,
  payPeriods: 12,
  employmentType: "employee",
  contractType: "permanent",
  workingTimePercent: 100,
} as const;

function first(params: RawParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function countryFromParams(params: RawParams): EUCountry {
  const raw = first(params, "country");
  return EU_COUNTRIES.includes(raw as EUCountry) ? (raw as EUCountry) : DEFAULT_COUNTRY;
}

/**
 * Why the raw gross is refused rather than repaired.
 *
 * `grossFromParams` clamps, because the engine must always receive a valid
 * profile — it is total by design and a `Money` of zero is a legitimate value
 * it would happily compute with. But clamping an EMPTY field to €1 and then
 * showing the resulting net would be a number the user never asked for,
 * presented exactly like one they did. So the interface asks this question
 * separately, and shows an empty state instead of a figure.
 */
export function grossIssue(params: RawParams, locale: Locale = "it"): string | undefined {
  const raw = (first(params, "gross") ?? "").trim();
  if (raw === "") return message(locale, "grossMissing");

  const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return message(locale, "grossPositive");
  }
  if (parsed < MIN_GROSS_EUROS) {
    return `Il minimo calcolabile è € ${MIN_GROSS_EUROS}.`;
  }
  if (parsed > MAX_GROSS_EUROS) {
    const value = new Intl.NumberFormat(LOCALE_TAG[locale], {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(MAX_GROSS_EUROS);
    return message(locale, "grossMaximum", { value });
  }
  return undefined;
}

export function grossFromParams(params: RawParams): number {
  const raw = Number.parseInt((first(params, "gross") ?? "").replace(/\D/g, ""), 10);
  const value = Number.isFinite(raw) ? raw : DEFAULT_GROSS_EUROS;
  return Math.min(MAX_GROSS_EUROS, Math.max(MIN_GROSS_EUROS, value));
}

export function profileFromParams(params: RawParams): EmployeeProfile {
  const country = countryFromParams(params);
  let profile: EmployeeProfile = {
    ...BASE_PROFILE,
    country,
    grossAnnual: money(grossFromParams(params), "EUR"),
  };

  if (!isSupported(country)) return profile;
  const adapter = resolveAdapter(country);

  // Twice, because forms cascade: the level options depend on the CCNL, so the
  // second pass sees the descriptors the FIRST pass's choices produced.
  for (let pass = 0; pass < 2; pass += 1) {
    profile = applyDescriptors(profile, adapter.requiredInputs(profile), params);
  }
  return profile;
}

function applyDescriptors(
  profile: EmployeeProfile,
  descriptors: readonly InputDescriptor[],
  params: RawParams,
): EmployeeProfile {
  let next = profile;
  for (const descriptor of descriptors) {
    if (descriptor.field === "grossAnnual") continue; // owned by grossFromParams
    const raw = first(params, paramNameOf(descriptor.field));
    const candidate = raw ?? (descriptor.defaultValue === undefined ? undefined : String(descriptor.defaultValue));
    const option = descriptor.options?.find((item) => item.value === candidate);
    if (option?.assigns) {
      for (const [field, value] of Object.entries(option.assigns)) {
        next = assign(next, field, value);
      }
      continue;
    }
    next = assign(next, descriptor.field, coerce(descriptor, raw));
  }
  return next;
}

/**
 * A raw string becomes the value the descriptor describes — or the descriptor's
 * default when it is missing, unparseable, or not one of the offered options.
 */
function coerce(
  descriptor: InputDescriptor,
  raw: string | undefined,
): string | number | boolean | undefined {
  const fallback = descriptor.defaultValue;

  if (descriptor.kind === "integer") {
    if (raw === undefined || raw.trim() === "") return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  // Declared percentages stay in their original decimal spelling. Converting
  // them to Number here would silently erase excess precision before the exact
  // country adapter can validate it (for example 21.0500000 -> 21.05).
  if (descriptor.kind === "decimal") {
    if (raw === undefined || raw.trim() === "") return fallback;
    return Number.isFinite(Number(raw)) ? raw.trim() : fallback;
  }

  if (descriptor.kind === "boolean") {
    if (raw === "true" || raw === "false") return raw === "true";
    return fallback;
  }

  if (descriptor.options) {
    const allowed = descriptor.options.some((option) => option.value === raw);
    return allowed ? raw : fallback;
  }

  return raw ?? fallback;
}

/** `payPeriods` and `countryOptions.steuerklasse` land in different places. */
function assign(
  profile: EmployeeProfile,
  field: string,
  value: string | number | boolean | undefined,
): EmployeeProfile {
  if (value === undefined) return profile;

  if (field.startsWith("countryOptions.")) {
    const key = field.slice("countryOptions.".length);
    return { ...profile, countryOptions: { ...profile.countryOptions, [key]: value } };
  }

  // `payPeriods` is declared as a select, so it arrives as a string.
  if (field === "payPeriods" || field === "companySize" || field === "age") {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? { ...profile, [field]: parsed } : profile;
  }

  return { ...profile, [field]: value } as EmployeeProfile;
}

/** The values the form should show back, keyed by URL param name. */
export function formValuesOf(profile: EmployeeProfile): Record<string, string> {
  const values: Record<string, string> = {
    country: profile.country,
    gross: String(profile.grossAnnual.cents / 100),
  };

  if (!isSupported(profile.country)) return values;

  for (const descriptor of resolveAdapter(profile.country).requiredInputs(profile)) {
    if (descriptor.field === "grossAnnual") continue;
    const compound = descriptor.options?.find(
      (option) =>
        option.assigns &&
        Object.entries(option.assigns).every(
          ([field, expected]) => String(read(profile, field)) === String(expected),
        ),
    );
    if (compound) {
      values[paramNameOf(descriptor.field)] = compound.value;
      continue;
    }
    if (descriptor.hidden) continue;
    const current = read(profile, descriptor.field) ?? descriptor.defaultValue;
    if (current !== undefined) values[paramNameOf(descriptor.field)] = String(current);
  }
  return values;
}

function read(profile: EmployeeProfile, field: string): string | number | boolean | undefined {
  if (field.startsWith("countryOptions.")) {
    return profile.countryOptions?.[field.slice("countryOptions.".length)];
  }
  return (profile as unknown as Record<string, string | number | boolean | undefined>)[field];
}
