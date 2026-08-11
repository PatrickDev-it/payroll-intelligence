import type { EmployeeProfile } from "@engine/model/employee-profile.ts";

export const PENSION_CEILING_STATUSES = ["unknown", "subject", "not_subject"] as const;
export type PensionCeilingStatus = (typeof PENSION_CEILING_STATUSES)[number];

/**
 * L. 335/1995 art. 2 c. 18 applies the annual ceiling only to workers whose
 * first compulsory pension registration is after 31 December 1995 (or who
 * validly opted into the contributory system).  Salary cannot reveal that
 * fact, so it is an explicit payroll input.
 */
export function pensionCeilingStatusOf(profile: EmployeeProfile): PensionCeilingStatus {
  const value = profile.countryOptions?.["pensionCeilingStatus"];
  return PENSION_CEILING_STATUSES.includes(value as PensionCeilingStatus)
    ? (value as PensionCeilingStatus)
    : "unknown";
}

export function isContributionCeilingApplicable(profile: EmployeeProfile): boolean {
  return pensionCeilingStatusOf(profile) !== "not_subject";
}
