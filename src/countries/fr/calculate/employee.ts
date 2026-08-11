/**
 * The French employee pipeline.
 *
 * The structural oddity, and the reason `taxableIncome` had to be an
 * adapter-computed quantity in the common model rather than a fixed formula:
 * **CSG is only partly deductible.** Of the 9,70% withheld as CSG/CRDS, 6,80
 * points come off the income-tax base and 2,90 points do not. So the French tax
 * base is neither the gross nor the gross minus contributions — it is
 * `gross − deductible contributions`, then reduced by a 10% professional
 * allowance.
 *
 *   brut
 *   − cotisations salariales déductibles (y compris CSG déductible 6,80 %)
 *   = net imposable
 *   − abattement de 10 %
 *   = revenu net imposable            ← the barème applies to THIS, per part
 *
 * And the barème is applied per `part`: the same €45.000 is taxed very
 * differently by a single filer and by a couple with two children.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import type { EmployeeComputation } from "@engine/pipeline/assemble.ts";
import { applyRule, derivedLine, formulaParam, ruleOf } from "@engine/pipeline/helpers.ts";
import {
  add,
  clampAtZero,
  fromCents,
  max,
  min,
  moneyFromDecimal,
  negate,
  subtract,
  sum,
  zero,
} from "@engine/money/money.ts";
import { applyPrimitive } from "@engine/primitives/apply.ts";
import { MINUS, TIMES, amt } from "@engine/primitives/format.ts";
import {
  basePartsOf,
  healthRegimeKey,
  householdOf,
  isCadre,
  partsOf,
} from "../profile.ts";

export type { EmployeeComputation };

export function computeEmployee(profile: EmployeeProfile, rules: RuleSet): EmployeeComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;
  const cadre = isCadre(profile);

  // ① Contributions, banded against the PASS.
  const deductible: CalculationLine[] = [];
  const applied: Money[] = [];

  const push = (id: string, options: Parameters<typeof applyRule>[3] = {}) => {
    const result = applyRule(rules, id, gross, options);
    if (result.amount.cents !== 0) {
      deductible.push(result.line);
      applied.push(result.amount);
    }
    return result.amount;
  };

  push("FR.SAL.VIEILLESSE.PLAFONNEE");
  push("FR.SAL.VIEILLESSE.DEPLAFONNEE");
  push("FR.SAL.MALADIE.ALSACE_MOSELLE", { key: healthRegimeKey(profile) });
  push("FR.SAL.RETRAITE.T1");
  push("FR.SAL.CEG.T1");
  push("FR.SAL.RETRAITE.T2");
  push("FR.SAL.CEG.T2");
  if (aboveCeiling(rules, gross)) push("FR.SAL.CET");
  if (cadre) push("FR.SAL.APEC");

  const deductibleContributions = sum(applied, currency);

  // ② CSG and CRDS, on 98,25% of the gross up to 4 PASS and 100% above it.
  const csgBase = csgAssiette(rules, gross);
  const csgDeductible = applyRule(rules, "FR.CSG.DEDUCTIBLE", csgBase);
  const csgNonDeductible = applyRule(rules, "FR.CSG.NON_DEDUCTIBLE", csgBase);
  const crds = applyRule(rules, "FR.CRDS", csgBase);

  const socialSecurity = [
    ...deductible,
    csgDeductible.line,
    csgNonDeductible.line,
    crds.line,
  ];
  const totalContributions = sum(
    [deductibleContributions, csgDeductible.amount, csgNonDeductible.amount, crds.amount],
    currency,
  );

  // ③ The tax base — everything except the 2,90 points that are not deductible.
  const netImposable = clampAtZero(
    subtract(subtract(gross, deductibleContributions), csgDeductible.amount),
  );
  const abattement = professionalAllowance(rules, netImposable);
  const revenuImposable = clampAtZero(subtract(netImposable, abattement.amount));

  // ④ The barème, per part, with the half-part benefit capped.
  const tax = incomeTax(profile, rules, revenuImposable);

  return {
    gross,
    socialSecurity,
    totalContributions,
    taxableIncome: revenuImposable,
    taxes: [tax.line],
    totalTaxes: tax.amount,
    credits: [],
    totalCredits: zero(currency),
    netAnnual: subtract(subtract(gross, totalContributions), tax.amount),
  };
}

function aboveCeiling(rules: RuleSet, gross: Money): boolean {
  const pass = moneyFromDecimal(formulaParam(ruleOf(rules, "FR.PASS"), "annual"), gross.currency);
  return gross.cents > pass.cents;
}

/** art. L136-2 CSS: 98,25% of the gross up to 4 PASS, 100% of the excess. */
function csgAssiette(rules: RuleSet, gross: Money): Money {
  const rule = ruleOf(rules, "FR.CSG.ASSIETTE");
  const currency = gross.currency;
  const ceiling = moneyFromDecimal(formulaParam(rule, "ceiling"), currency);
  const reduced = applyPrimitive(
    { kind: "capped_rate", rate: formulaParam(rule, "rate"), ceiling: formulaParam(rule, "ceiling") },
    { base: gross },
  ).amount;
  const excess = clampAtZero(subtract(gross, ceiling));
  return add(reduced, excess);
}

type Applied = { readonly amount: Money; readonly line: CalculationLine };

/** art. 83-3° CGI: 10% of the taxable salary, floored and capped. */
function professionalAllowance(rules: RuleSet, netImposable: Money): Applied {
  const rule = ruleOf(rules, "FR.IR.ABATTEMENT");
  const currency = netImposable.currency;
  const raw = applyPrimitive(
    { kind: "flat_rate", rate: formulaParam(rule, "rate") },
    { base: netImposable },
  ).amount;
  const floor = moneyFromDecimal(formulaParam(rule, "floor"), currency);
  const ceiling = moneyFromDecimal(formulaParam(rule, "ceiling"), currency);
  const amount = min(max(min(raw, netImposable), min(floor, netImposable)), ceiling);

  return {
    amount,
    line: derivedLine(
      rule.id,
      rule.label,
      negate(amount),
      `${amt(netImposable)} ${TIMES} 10% (plancher ${amt(floor)}, plafond ${amt(ceiling)})`,
      [rule.id],
      rule.verification.status,
    ),
  };
}

/**
 * art. 197 I CGI, in the order the code sets out:
 *
 *   1. divide the income by the number of parts, apply the scale, multiply back
 *   2. cap the benefit of each half-part beyond the household's base parts
 *   3. apply the décote, which erases small liabilities entirely
 *
 * Step 2 is what stops the quotient familial from being an unlimited subsidy,
 * and step 3 is why a low earner with a computed tax of €700 pays nothing.
 */
function incomeTax(profile: EmployeeProfile, rules: RuleSet, revenu: Money): Applied {
  const currency = revenu.currency;
  const bareme = ruleOf(rules, "FR.IR.BAREME");
  const parts = partsOf(profile);
  const baseParts = basePartsOf(profile);

  const withParts = scaled(bareme.config, revenu, parts, currency);
  const withoutParts = scaled(bareme.config, revenu, baseParts, currency);

  const quotientRule = ruleOf(rules, "FR.IR.QUOTIENT");
  const capPerHalfPart = moneyFromDecimal(formulaParam(quotientRule, "capPerHalfPart"), currency);
  const halfParts = Math.round((parts - baseParts) / 0.5);
  const cap = fromCents(capPerHalfPart.cents * halfParts, currency);
  const advantage = clampAtZero(subtract(withoutParts, withParts));
  const capped = halfParts > 0 && advantage.cents > cap.cents;
  const beforeDecote = capped ? subtract(withoutParts, cap) : withParts;

  const decoteRule = ruleOf(rules, "FR.IR.DECOTE");
  const threshold = moneyFromDecimal(
    formulaParam(decoteRule, householdOf(profile) === "couple" ? "couple" : "single"),
    currency,
  );
  const share = applyPrimitive(
    { kind: "flat_rate", rate: formulaParam(decoteRule, "rate") },
    { base: beforeDecote },
  ).amount;
  const decote = min(clampAtZero(subtract(threshold, share)), beforeDecote);
  const amount = clampAtZero(subtract(beforeDecote, decote));

  const children: CalculationLine[] = [];
  if (capped) {
    children.push(
      derivedLine(
        quotientRule.id,
        quotientRule.label,
        negate(cap),
        `avantage plafonné à ${amt(capPerHalfPart)} par demi-part (${halfParts} demi-part(s))`,
        [quotientRule.id],
        quotientRule.verification.status,
      ),
    );
  }
  if (decote.cents > 0) {
    children.push(
      derivedLine(
        decoteRule.id,
        decoteRule.label,
        decote,
        `${amt(threshold)} ${MINUS} 45,25% ${TIMES} ${amt(beforeDecote)}`,
        [decoteRule.id],
        decoteRule.verification.status,
      ),
    );
  }

  return {
    amount,
    line: derivedLine(
      "FR.IR",
      "Impôt sur le revenu",
      negate(amount),
      `barème sur ${amt(revenu)} / ${formatParts(parts)} part(s), puis ${TIMES} ${formatParts(parts)}`,
      [bareme.id, quotientRule.id, decoteRule.id],
      bareme.verification.status,
      children.length > 0 ? children : undefined,
    ),
  };
}

/** Scale applied to income ÷ parts, multiplied back by parts. */
function scaled(
  config: Parameters<typeof applyPrimitive>[0],
  revenu: Money,
  parts: number,
  currency: Money["currency"],
): Money {
  const perPart = fromCents(Math.round(revenu.cents / parts), currency);
  const tax = applyPrimitive(config, { base: perPart }).amount;
  return fromCents(Math.round(tax.cents * parts), currency);
}

function formatParts(parts: number): string {
  return parts.toFixed(1).replace(".", ",").replace(",0", "");
}
