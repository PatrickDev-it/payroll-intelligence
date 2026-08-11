/**
 * The German employee pipeline.
 *
 * The one thing to understand before reading it: **the taxable base is not
 * gross minus contributions.** Germany deducts a NOTIONAL approximation of the
 * contributions — the `Vorsorgepauschale` of § 39b Abs. 2 Satz 5 Nr. 3 EStG —
 * in which health insurance enters at the *reduced* rate of 7,0% rather than
 * the rate actually paid, and unemployment insurance enters only insofar as it
 * fits under a €1.900 cap that the health and care parts have usually already
 * consumed. At €45.000 the difference between "gross minus contributions" and
 * the real base is about €1.400 of base and roughly €400 of tax.
 *
 *   gross
 *   − Arbeitnehmer-Pauschbetrag        1.230 (§ 9a)
 *   − Sonderausgaben-Pauschbetrag         36 (§ 10c)
 *   − Entlastungsbetrag                4.260 + 240 je weiterem Kind (§ 24b, Klasse II)
 *   − Vorsorgepauschale                (§ 39b Abs. 2 Satz 5 Nr. 3)
 *   = zu versteuerndes Einkommen
 *
 * Then § 32a on that base — as a polynomial, never as brackets — with the
 * Splitting tariff for Steuerklasse III, and Soli and Kirchensteuer on the tax
 * itself rather than on income.
 */

import type { CalculationLine } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import type { EmployeeComputation } from "@engine/pipeline/assemble.ts";
import {
  applyDeclaredPercentageRule,
  applyRule,
  derivedLine,
  formulaParam,
  ruleOf,
} from "@engine/pipeline/helpers.ts";
import {
  add,
  clampAtZero,
  compare,
  fromCents,
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
  careInsuranceKey,
  childrenOf,
  churchKey,
  isSplittingClass,
  steuerklasseOf,
  zusatzbeitragKey,
} from "../profile.ts";

export type { EmployeeComputation };

export function computeEmployee(profile: EmployeeProfile, rules: RuleSet): EmployeeComputation {
  const currency = profile.grossAnnual.currency;
  const gross = profile.grossAnnual;

  // ① Sozialversicherung. Four branches, two different ceilings — 101.400 for
  //    pension and unemployment, 69.750 for health and care.
  const rv = applyRule(rules, "DE.RV.EMPLOYEE", gross);
  const av = applyRule(rules, "DE.AV.EMPLOYEE", gross);
  const kvBase = applyRule(rules, "DE.KV.EMPLOYEE.BASE", gross);
  const healthBase = min(gross, healthCeiling(rules));
  const declaredZusatz = Number(profile.countryOptions?.["zusatzbeitragRatePercent"]);
  const kvZusatz = Number.isFinite(declaredZusatz)
    ? applyDeclaredPercentageRule(
        rules,
        "DE.KV.ZUSATZBEITRAG.DECLARED",
        healthBase,
        declaredZusatz / 2,
      )
    : applyRule(rules, "DE.KV.EMPLOYEE.ZUSATZBEITRAG", healthBase, {
        key: zusatzbeitragKey(profile),
      });
  const pv = applyRule(rules, "DE.PV.EMPLOYEE", healthBase, {
    key: careInsuranceKey(profile),
  });

  const socialSecurity = [rv.line, av.line, kvBase.line, kvZusatz.line, pv.line];
  const totalContributions = sum(
    [rv.amount, av.amount, kvBase.amount, kvZusatz.amount, pv.amount],
    currency,
  );

  // ② The taxable base — notional, not actual (see the file docstring).
  const pauschbetraege = pauschbetraegeOf(profile, rules);
  const vorsorge = vorsorgepauschale(profile, rules, gross);
  const taxableIncome = clampAtZero(subtract(subtract(gross, pauschbetraege.amount), vorsorge.amount));

  // ③ Lohnsteuer. Steuerklasse III applies the Splitting tariff: the tax on
  //    half the base, doubled (§ 32a Abs. 5) — worth thousands to a
  //    single-earner couple, and the largest family effect in the EU.
  const tariff = ruleOf(rules, "DE.LOHNSTEUER.TARIF");
  const splitting = isSplittingClass(profile);
  const half = fromCents(Math.floor(taxableIncome.cents / 2), currency);
  const applied = applyPrimitive(tariff.config, { base: splitting ? half : taxableIncome });
  const lohnsteuer = splitting
    ? fromCents(applied.amount.cents * 2, currency)
    : applied.amount;

  const lohnsteuerLine = derivedLine(
    tariff.id,
    splitting ? "Lohnsteuer (Splittingtarif, § 32a Abs. 5)" : tariff.label,
    negate(lohnsteuer),
    splitting
      ? `2 ${TIMES} [${applied.formula}] auf ${amt(half)}`
      : applied.formula,
    [tariff.id, "DE.LOHNSTEUER.PAUSCHBETRAEGE", "DE.LOHNSTEUER.VORSORGEPAUSCHALE"],
    tariff.verification.status,
    [pauschbetraege.line, vorsorge.line],
  );

  // ④ Two surcharges ON THE TAX, not on income.
  const soli = solidaritaetszuschlag(rules, lohnsteuer, splitting);
  const church = applyRule(rules, "DE.KIRCHENSTEUER", lohnsteuer, { key: churchKey(profile) });

  const taxes: CalculationLine[] = [lohnsteuerLine];
  if (soli.amount.cents > 0) taxes.push(soli.line);
  if (church.amount.cents > 0) taxes.push(church.line);

  const totalTaxes = sum([lohnsteuer, soli.amount, church.amount], currency);

  // Germany pays no cash supplement through payroll — Kindergeld is paid by the
  // Familienkasse, outside the payslip, so it is correctly absent here.
  const credits: readonly CalculationLine[] = [];

  return {
    gross,
    socialSecurity,
    totalContributions,
    taxableIncome,
    taxes,
    totalTaxes,
    credits,
    totalCredits: zero(currency),
    netAnnual: subtract(subtract(gross, totalContributions), totalTaxes),
  };
}

/** The health/care ceiling, read from the KV rule so there is one copy of 69.750. */
function healthCeiling(rules: RuleSet): Money {
  const config = ruleOf(rules, "DE.KV.EMPLOYEE.BASE").config;
  if (config.kind !== "capped_rate") {
    throw new TypeError("DE.KV.EMPLOYEE.BASE must be a capped_rate — its ceiling is the KV/PV BBG");
  }
  return moneyFromDecimal(config.ceiling, "EUR");
}

type Deduction = { readonly amount: Money; readonly line: CalculationLine };

/**
 * § 9a, § 10c and — for Steuerklasse II — § 24b. Flat amounts, so they are read
 * from the rule as parameters and summed here, where the profile is known.
 */
function pauschbetraegeOf(profile: EmployeeProfile, rules: RuleSet): Deduction {
  const rule = ruleOf(rules, "DE.LOHNSTEUER.PAUSCHBETRAEGE");
  const currency = profile.grossAnnual.currency;

  const werbungskosten = moneyFromDecimal(formulaParam(rule, "werbungskosten"), currency);
  const sonderausgaben = moneyFromDecimal(formulaParam(rule, "sonderausgaben"), currency);
  let amount = add(werbungskosten, sonderausgaben);
  let formula = `${amt(werbungskosten)} (§ 9a) + ${amt(sonderausgaben)} (§ 10c)`;

  if (steuerklasseOf(profile) === "II") {
    const base = moneyFromDecimal(formulaParam(rule, "entlastungsbetragAlleinerziehende"), currency);
    const perChild = moneyFromDecimal(formulaParam(rule, "entlastungsbetragJeWeiteresKind"), currency);
    const extra = Math.max(0, childrenOf(profile) - 1);
    const entlastung = fromCents(base.cents + perChild.cents * extra, currency);
    amount = add(amount, entlastung);
    formula += ` + ${amt(entlastung)} (§ 24b, Entlastungsbetrag für Alleinerziehende)`;
  }

  return {
    amount,
    line: derivedLine(rule.id, rule.label, negate(amount), formula, [rule.id], rule.verification.status),
  };
}

/**
 * § 39b Abs. 2 Satz 5 Nr. 3, in the version in force from 2026.
 *
 *   a) pension:      9,3% of wage up to 101.400, fully deductible since 2023
 *   b) health:       7,0% (the REDUCED rate, not the 7,3% actually paid) plus
 *                    half the fund's Zusatzbeitrag, up to 69.750
 *   c) care:         the employee's actual care rate, up to 69.750
 *   e) unemployment: 1,3% up to 101.400, but only insofar as b + c + e stays
 *                    under €1.900 — which at any normal salary means zero
 *
 * The minimum Vorsorgepauschale was abolished for 2026, so there is no floor.
 */
function vorsorgepauschale(profile: EmployeeProfile, rules: RuleSet, gross: Money): Deduction {
  const rule = ruleOf(rules, "DE.LOHNSTEUER.VORSORGEPAUSCHALE");
  const currency = gross.currency;

  const pension = applyPrimitive(
    {
      kind: "capped_rate",
      rate: formulaParam(rule, "rentenRate"),
      ceiling: formulaParam(rule, "rentenCeiling"),
    },
    { base: gross },
  ).amount;

  const healthCap = moneyFromDecimal(formulaParam(rule, "krankenCeiling"), currency);
  const healthBase = min(gross, healthCap);
  const healthReduced = applyPrimitive(
    { kind: "flat_rate", rate: formulaParam(rule, "krankenErmaessigtRate") },
    { base: healthBase },
  ).amount;
  const declaredZusatz = Number(profile.countryOptions?.["zusatzbeitragRatePercent"]);
  const zusatzHalf = Number.isFinite(declaredZusatz)
    ? applyDeclaredPercentageRule(
        rules,
        "DE.KV.ZUSATZBEITRAG.DECLARED",
        healthBase,
        declaredZusatz / 2,
      ).amount
    : applyPrimitive(ruleOf(rules, "DE.KV.EMPLOYEE.ZUSATZBEITRAG").config, {
        base: healthBase,
        key: zusatzbeitragKey(profile),
      }).amount;
  const care = applyPrimitive(ruleOf(rules, "DE.PV.EMPLOYEE").config, {
    base: healthBase,
    key: careInsuranceKey(profile),
  }).amount;

  const healthAndCare = sum([healthReduced, zusatzHalf, care], currency);

  // The €1.900 cap is on b + c + e together, and e is what gets cut.
  const cap = moneyFromDecimal(formulaParam(rule, "arbeitslosCombinedCap"), currency);
  const room = clampAtZero(subtract(cap, healthAndCare));
  const unemployment = applyPrimitive(
    {
      kind: "capped_rate",
      rate: formulaParam(rule, "arbeitslosRate"),
      ceiling: formulaParam(rule, "arbeitslosCeiling"),
    },
    { base: gross },
  ).amount;
  const unemploymentAllowed = compare(room, unemployment) < 0 ? room : unemployment;

  const amount = add(pension, add(healthAndCare, unemploymentAllowed));

  return {
    amount,
    line: derivedLine(
      rule.id,
      rule.label,
      negate(amount),
      `${amt(pension)} (Rente) + ${amt(healthAndCare)} (Kranken/Pflege, ermäßigter Satz)` +
        (unemploymentAllowed.cents > 0
          ? ` + ${amt(unemploymentAllowed)} (Arbeitslosigkeit)`
          : ` + 0,00 (Arbeitslosigkeit: ${amt(cap)}-Grenze bereits ausgeschöpft)`),
      [rule.id],
      rule.verification.status,
    ),
  };
}

/**
 * SolZG 1995 §§ 3-4: nothing up to a Freigrenze of €20.350 of Lohnsteuer
 * (doubled under the Splitting tariff), then a Milderungszone capping the
 * surcharge at 11,9% of the excess, then the full 5,5%.
 *
 * The Freigrenze is a cliff mitigated by the Milderungszone — which is exactly
 * why it cannot be modelled as a threshold_exemption: the transition is
 * gradual, and a reader standing in the zone needs to see why.
 */
function solidaritaetszuschlag(
  rules: RuleSet,
  lohnsteuer: Money,
  splitting: boolean,
): Deduction {
  const rule = ruleOf(rules, "DE.SOLIDARITAETSZUSCHLAG");
  const currency = lohnsteuer.currency;

  const single = moneyFromDecimal(formulaParam(rule, "freigrenze"), currency);
  const freigrenze = splitting ? fromCents(single.cents * 2, currency) : single;

  if (compare(lohnsteuer, freigrenze) <= 0) {
    return {
      amount: zero(currency),
      line: derivedLine(
        rule.id,
        rule.label,
        zero(currency),
        `${amt(lohnsteuer)} ≤ ${amt(freigrenze)} (Freigrenze) → 0,00`,
        [rule.id],
        rule.verification.status,
      ),
    };
  }

  const full = applyPrimitive({ kind: "flat_rate", rate: formulaParam(rule, "rate") }, { base: lohnsteuer })
    .amount;
  const excess = subtract(lohnsteuer, freigrenze);
  const mitigated = applyPrimitive(
    { kind: "flat_rate", rate: formulaParam(rule, "milderungszoneRate") },
    { base: excess },
  ).amount;
  const amount = min(full, mitigated);
  const inZone = compare(mitigated, full) < 0;

  return {
    amount,
    line: derivedLine(
      rule.id,
      rule.label,
      negate(amount),
      inZone
        ? `${amt(excess)} ${TIMES} 11,9% (Milderungszone) ${MINUS} statt 5,5% von ${amt(lohnsteuer)}`
        : `${amt(lohnsteuer)} ${TIMES} 5,5%`,
      [rule.id],
      rule.verification.status,
    ),
  };
}
