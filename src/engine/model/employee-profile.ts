/**
 * The input. Every field here is a DISCRIMINANT — something that changes the
 * result for the same gross (docs/02-discriminants.md).
 *
 * The design rule that matters: an adapter DECLARES which fields its country
 * needs (`requiredInputs()`), and the UI renders only those. `Steuerklasse`
 * shown to an Italian user, or `CCNL` to a German one, is not a cosmetic slip —
 * it says the product does not understand the domain.
 */

import type { Currency, Money } from "../money/money.ts";

/** Countries currently exposed by the product, not a roadmap catalogue. */
export const EU_COUNTRIES = ["IT", "DE", "ES", "FR"] as const;

export type EUCountry = (typeof EU_COUNTRIES)[number];

export type EmploymentType = "employee" | "director" | "apprentice";
export type ContractType = "permanent" | "fixed_term";

export type Dependants = {
  readonly children: number;
  readonly childAges?: readonly number[];
  readonly other: number;
};

export type EmployeeProfile = {
  // Jurisdiction
  readonly country: EUCountry;
  readonly region?: string;
  readonly municipality?: string;
  readonly taxYear: number;

  // Remuneration
  readonly grossAnnual: Money;
  readonly payPeriods: number;

  // Employment
  readonly employmentType: EmploymentType;
  readonly contractType: ContractType;
  readonly workingTimePercent: number;
  readonly collectiveAgreement?: string;
  readonly jobLevel?: string;
  readonly companySize?: number;

  // Personal
  readonly age?: number;

  /**
   * Country-specific inputs an adapter declares and reads: INAIL rate, German
   * Zusatzbeitrag, Dutch Awf band. Kept out of the shared shape so that adding
   * a country never widens this type.
   */
  readonly countryOptions?: Readonly<Record<string, string | number | boolean>>;
};

/**
 * Where an input belongs in the form. Declared by the COUNTRY, because only the
 * country knows that a `Steuerklasse` is a personal fact and a `Gefahrtarif` is
 * a company one — see rfc/002. The form renders these in a fixed order under
 * fixed headings and knows nothing else about them.
 */
export type InputGroup = "pay" | "profile" | "company" | "location";

export type InputValue = string | number | boolean;

export type InputOption = {
  readonly value: string;
  readonly label: string;
  /**
   * A compound choice can own several profile facts. This keeps dependent
   * values atomic: selecting Roma cannot leave Lombardia behind.
   */
  readonly assigns?: Readonly<Record<string, InputValue>>;
};

/** What the UI needs in order to render one input. Returned by the adapter. */
export type InputDescriptor = {
  readonly field: string;
  readonly label: string;
  readonly kind: "money" | "integer" | "decimal" | "select" | "boolean";
  readonly required: boolean;
  /**
   * `label` names the choice only. Rates, thresholds, consequences and other
   * teaching copy belong in the field's `help`, never inside a select value.
   */
  readonly options?: readonly InputOption[];
  readonly defaultValue?: InputValue;
  readonly help?: string;
  /** Concrete scenario shown in the shared field-information dialog. */
  readonly example?: string;
  /** Human-readable authority or document behind the field. */
  readonly source?: string;
  readonly group?: InputGroup;
  /** Collapsed behind "Parametri avanzati": true for what a default answers well. */
  readonly advanced?: boolean;
  /** Parsed and validated for compatibility, but not rendered as its own control. */
  readonly hidden?: boolean;
  /** A shorter label for dense contexts, where the full one would wrap. */
  readonly shortLabel?: string;
  /** Bounds for numeric inputs, so the control can refuse impossible values. */
  readonly min?: number;
  readonly max?: number;
};

export type ValidationIssue = {
  readonly field: string;
  readonly severity: "error" | "warning";
  readonly message: string;
};

export type ValidationResult = {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
};

export function currencyOf(profile: EmployeeProfile): Currency {
  return profile.grossAnnual.currency;
}

export function valid(): ValidationResult {
  return { ok: true, issues: [] };
}

export function invalid(issues: readonly ValidationIssue[]): ValidationResult {
  return { ok: issues.every((i) => i.severity !== "error"), issues };
}
