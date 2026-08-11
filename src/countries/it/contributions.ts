import type { EmployeeProfile } from "@engine/model/employee-profile.ts";

import { isContributionCeilingApplicable } from "./profile.ts";

export type ItalianContributionRuleIds = {
  readonly employeeIvs: string;
  readonly employeeAdditionalIvs: string;
  readonly employerIvs: string;
  readonly employeeFis: string;
  readonly employerFis: string;
};

/** One resolver owns every profile-dependent Italian contribution branch. */
export function italianContributionRuleIds(
  profile: EmployeeProfile,
): ItalianContributionRuleIds {
  const ceilingApplies = isContributionCeilingApplicable(profile);
  const fisBand = fisRuleSuffix(profile);

  return {
    employeeIvs: ceilingApplies
      ? "IT.INPS.EMPLOYEE.IVS"
      : "IT.INPS.EMPLOYEE.IVS.UNCAPPED",
    employeeAdditionalIvs: ceilingApplies
      ? "IT.INPS.EMPLOYEE.ADDITIONAL_1PCT"
      : "IT.INPS.EMPLOYEE.ADDITIONAL_1PCT.UNCAPPED",
    employerIvs: ceilingApplies
      ? "IT.INPS.EMPLOYER.IVS"
      : "IT.INPS.EMPLOYER.IVS.UNCAPPED",
    employeeFis: `IT.FIS.EMPLOYEE.${fisBand}`,
    employerFis: `IT.FIS.EMPLOYER.${fisBand}`,
  };
}

function fisRuleSuffix(profile: EmployeeProfile): string {
  if ((profile.companySize ?? 0) > 5) return "LARGE";
  return profile.countryOptions?.["fisReducedRateEligible"] === "eligible"
    ? "SMALL.REDUCED"
    : "SMALL.STANDARD";
}
