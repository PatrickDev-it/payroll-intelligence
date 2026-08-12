/**
 * Shared runtime validation for the profile shape every country receives.
 *
 * TypeScript types disappear at the API boundary.  The country descriptor is
 * the authoritative list of fields and options, so validation consumes that
 * same declaration instead of maintaining a second, drifting schema.
 */

import type {
  EUCountry,
  EmployeeProfile,
  InputDescriptor,
  ValidationIssue,
} from "../model/employee-profile.ts";

export function validateProfileBoundary(
  profile: EmployeeProfile,
  country: EUCountry,
  inputs: readonly InputDescriptor[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (profile.country !== country) {
    issues.push(error("country", `Il profilo ${profile.country} non può essere calcolato con le regole ${country}`));
  }
  if (profile.grossAnnual.currency !== "EUR") {
    issues.push(error("grossAnnual.currency", "I quattro adattatori disponibili accettano soltanto importi in EUR"));
  }
  if (!Number.isSafeInteger(profile.grossAnnual.cents) || profile.grossAnnual.cents <= 0) {
    issues.push(error("grossAnnual", "Il lordo deve essere positivo ed espresso in centesimi interi"));
  }
  if (profile.employmentType !== "employee") {
    issues.push(error("employmentType", `Il tipo di impiego "${profile.employmentType}" non è ancora modellato`));
  }
  if (
    !Number.isFinite(profile.workingTimePercent) ||
    profile.workingTimePercent <= 0 ||
    profile.workingTimePercent > 100
  ) {
    issues.push(error("workingTimePercent", "La percentuale di lavoro deve essere maggiore di 0 e non superiore a 100"));
  }

  for (const input of inputs) validateDeclaredInput(profile, input, issues);
  validateCountryOptionKeys(profile, inputs, issues);

  return issues;
}

function validateDeclaredInput(
  profile: EmployeeProfile,
  input: InputDescriptor,
  issues: ValidationIssue[],
): void {
  const compoundOptions = input.options?.filter((option) => option.assigns);
  if (compoundOptions?.length) {
    const matched = compoundOptions.some((option) =>
      Object.entries(option.assigns ?? {}).every(
        ([field, expected]) => String(valueAt(profile, field)) === String(expected),
      ),
    );
    if (input.required && !matched) {
      issues.push(error(input.field, `Il campo "${input.label}" non corrisponde a una località ammessa`));
    }
    return;
  }

  const value = valueAt(profile, input.field);
  if (value === undefined || value === null || value === "") {
    if (input.required) issues.push(error(input.field, `Il campo "${input.label}" è obbligatorio`));
    return;
  }

  if (input.kind === "select") {
    const allowed = input.options?.some((option) => String(option.value) === String(value)) ?? false;
    if (!allowed) issues.push(error(input.field, `Valore non ammesso per "${input.label}": "${String(value)}"`));
    return;
  }

  if (input.kind === "boolean") {
    if (typeof value !== "boolean") issues.push(error(input.field, `"${input.label}" deve essere vero o falso`));
    return;
  }

  if (input.kind === "decimal") {
    const text = String(value);
    const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
    const maximumDecimalPlaces = 6;
    if (!match || (match[2]?.length ?? 0) > maximumDecimalPlaces) {
      issues.push(
        error(
          input.field,
          `"${input.label}" deve essere un decimale ordinario con al massimo ${maximumDecimalPlaces} cifre decimali`,
        ),
      );
      return;
    }
  }

  const numeric = input.kind === "money" ? profile.grossAnnual.cents / 100 : Number(value);
  if (!Number.isFinite(numeric)) {
    issues.push(error(input.field, `"${input.label}" deve essere un numero finito`));
    return;
  }
  if (input.kind === "integer" && !Number.isInteger(numeric)) {
    issues.push(error(input.field, `"${input.label}" deve essere un numero intero`));
  }
  if (input.min !== undefined && numeric < input.min) {
    issues.push(error(input.field, `"${input.label}" non può essere inferiore a ${input.min}`));
  }
  if (input.max !== undefined && numeric > input.max) {
    issues.push(error(input.field, `"${input.label}" non può essere superiore a ${input.max}`));
  }
}

function validateCountryOptionKeys(
  profile: EmployeeProfile,
  inputs: readonly InputDescriptor[],
  issues: ValidationIssue[],
): void {
  const declared = new Set(
    inputs
      .map((input) => input.field)
      .filter((field) => field.startsWith("countryOptions."))
      .map((field) => field.slice("countryOptions.".length)),
  );

  for (const key of Object.keys(profile.countryOptions ?? {})) {
    if (!declared.has(key)) {
      issues.push(error(`countryOptions.${key}`, `Parametro paese non riconosciuto: "${key}"`));
    }
  }
}

function valueAt(profile: EmployeeProfile, field: string): unknown {
  if (field.startsWith("countryOptions.")) {
    return profile.countryOptions?.[field.slice("countryOptions.".length)];
  }
  return profile[field as keyof EmployeeProfile];
}

function error(field: string, message: string): ValidationIssue {
  return { field, severity: "error", message };
}
