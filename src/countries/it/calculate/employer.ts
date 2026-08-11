/**
 * Italian employer cost — four categories, kept separate because they behave
 * differently as gross rises (docs/03-employer-cost.md §1).
 *
 *   ① statutory contributions   capped at the massimale, so regressive at the top
 *   ② mandatory insurance       priced by RISK, not by income
 *   ③ deferred compensation     TFR: real annual cost, paid at termination
 *   ④ other mandatory costs     CCNL funds
 *
 * The trap this file exists to avoid: TFR's 0.50% guarantee-fund contribution is
 * charged inside ① and DEDUCTED from ③. Adding 7.41% + 0.50% is the classic
 * double-count and overstates cost by half a point of gross.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { add, sum } from "@engine/money/money.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import { applyDeclaredPercentageRule, applyRule } from "@engine/pipeline/helpers.ts";
import { isContributionCeilingApplicable } from "../profile.ts";


export type { EmployerComputation };

const DEFAULT_INAIL_RISK_CLASS = "office";

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  // ① Statutory contributions.
  const inps = applyRule(
    rules,
    isContributionCeilingApplicable(profile)
      ? "IT.INPS.EMPLOYER.TOTAL"
      : "IT.INPS.EMPLOYER.TOTAL.UNCAPPED",
    gross,
    { sign: 1 },
  );

  // ② Mandatory insurance. The risk class is an explicit input because the real
  //    range is 0.4 to 130 per mille and no honest default exists.
  const declaredInail = Number(profile.countryOptions?.["inailRatePercent"]);
  const inail = Number.isFinite(declaredInail)
    ? applyDeclaredPercentageRule(rules, "IT.INAIL.PREMIUM.DECLARED", gross, declaredInail, {
        sign: 1,
      })
    : applyRule(rules, "IT.INAIL.PREMIUM", gross, {
        sign: 1,
        key: riskClassOf(profile),
      });

  // ③ Deferred compensation.
  const tfr = applyRule(rules, "IT.TFR.ACCRUAL", gross, { sign: 1 });

  // ④ CCNL funds.
  const ccnlFund = applyRule(rules, "IT.CCNL.FONDO_SANITARIO", gross, {
    sign: 1,
    key: profile.collectiveAgreement ?? "NESSUNO",
  });

  const contributions = [inps.line];
  const insurance = [inail.line];
  const severanceAccrual = [tfr.line];
  const otherCosts = ccnlFund.amount.cents > 0 ? [ccnlFund.line] : [];

  const onTop = sum([inps.amount, inail.amount, tfr.amount, ccnlFund.amount], currency);
  const totalCost = add(gross, onTop);

  return {
    gross,
    contributions,
    insurance,
    severanceAccrual,
    otherCosts,
    totalCost,
    costOverGross: gross.cents === 0 ? 0 : totalCost.cents / gross.cents,
  };
}

function riskClassOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["inailRiskClass"];
  return typeof value === "string" ? value : DEFAULT_INAIL_RISK_CLASS;
}
