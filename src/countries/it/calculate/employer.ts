/**
 * Italian employer cost — four categories, kept separate because they behave
 * differently as gross rises (docs/03-employer-cost.md §1).
 *
 *   ① statutory contributions   IVS capped; the other bases remain uncapped
 *   ② mandatory insurance       priced by RISK, not by income
 *   ③ deferred compensation     TFR: real annual cost, paid at termination
 *   ④ other mandatory costs     CCNL funds
 *
 * The 0.50% quota deducted from TFR under art. 3 L. 297/1982 is not the
 * separate 0.20% employer contribution to the guarantee fund exposed in ①.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { add, applyRate, rate, sum, toMoney, toPrecise } from "@engine/money/money.ts";
import type { EmployerComputation } from "@engine/pipeline/assemble.ts";
import {
  applyDeclaredPercentageRule,
  applyRule,
  ruleOf,
  type Applied,
} from "@engine/pipeline/helpers.ts";
import { italianContributionRuleIds } from "../contributions.ts";


export type { EmployerComputation };

const DEFAULT_INAIL_RISK_CLASS = "office";

export function computeEmployer(profile: EmployeeProfile, rules: RuleSet): EmployerComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  // ① Statutory contributions.
  const contributionRules = italianContributionRuleIds(profile);
  const ivs = applyRule(rules, contributionRules.employerIvs, gross, { sign: 1 });
  const ordinaryContributions = [
    "IT.INPS.EMPLOYER.CUAF",
    "IT.INPS.EMPLOYER.MATERNITY",
    "IT.INPS.EMPLOYER.SICKNESS",
    "IT.INPS.EMPLOYER.NASPI_ORDINARY",
    "IT.INPS.EMPLOYER.FONDO_GARANZIA_TFR",
  ].map((id) => applyRule(rules, id, gross, { sign: 1 }));
  const fis = applyRule(rules, contributionRules.employerFis, gross, { sign: 1 });
  const additionalNaspi = fixedTermNaspi(profile, rules);

  // ② Mandatory insurance. The risk class is an explicit input because the real
  //    range is 0.4 to 130 per mille and no honest default exists.
  const declaredInail = profile.countryOptions?.["inailRatePercent"];
  const inail = typeof declaredInail === "string" || typeof declaredInail === "number"
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

  const contributionAmounts = [
    ivs.amount,
    ...ordinaryContributions.map((item) => item.amount),
    fis.amount,
    ...additionalNaspi.map((item) => item.amount),
  ];
  const contributions = [
    ivs.line,
    ...ordinaryContributions.map((item) => item.line),
    fis.line,
    ...additionalNaspi.map((item) => item.line),
  ];
  const insurance = [inail.line];
  const severanceAccrual = [tfr.line];
  const otherCosts = ccnlFund.amount.cents > 0 ? [ccnlFund.line] : [];

  const onTop = sum(
    [...contributionAmounts, inail.amount, tfr.amount, ccnlFund.amount],
    currency,
  );
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

function fixedTermNaspi(profile: EmployeeProfile, rules: RuleSet): readonly Applied[] {
  if (
    profile.contractType !== "fixed_term" ||
    profile.countryOptions?.["naspiApplicability"] !== "ordinary"
  ) {
    return [];
  }

  const base = applyRule(rules, "IT.NASPI.ADDITIONAL.FIXED_TERM", profile.grossAnnual, {
    sign: 1,
  });
  const renewals = Number(profile.countryOptions?.["naspiRenewalCount"] ?? 0);
  if (renewals === 0) return [base];

  const renewalRuleId = "IT.NASPI.ADDITIONAL.RENEWALS";
  const perRenewal = applyRule(rules, renewalRuleId, profile.grossAnnual, {
    sign: 1,
  });
  const renewalRule = ruleOf(rules, renewalRuleId);
  if (renewalRule.config.kind !== "flat_rate") {
    throw new TypeError(`${renewalRuleId} must be a flat rate`);
  }
  const aggregateRate = {
    ppb: rate(renewalRule.config.rate).ppb * BigInt(renewals),
  };
  const amount = toMoney(
    applyRate(toPrecise(profile.grossAnnual), aggregateRate),
    profile.grossAnnual.currency,
  );
  const renewalTotal: Applied = {
    amount,
    line: {
      ...perRenewal.line,
      amount,
      formula: `${perRenewal.line.formula} × ${renewals} rinnovi`,
    },
  };
  return [base, renewalTotal];
}

function riskClassOf(profile: EmployeeProfile): string {
  const value = profile.countryOptions?.["inailRiskClass"];
  return typeof value === "string" ? value : DEFAULT_INAIL_RISK_CLASS;
}
