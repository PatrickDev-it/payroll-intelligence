/**
 * Italian closed forms — primitive 9.
 *
 * Registered by name so the rule file references `"formulaId": "IT.TFR.DIVISOR"`
 * and still contains no executable content.
 */

import { compare, moneyFromDecimal, rate, toMoney, toPrecise, zero } from "@engine/money/money.ts";
import { registerFormula } from "@engine/primitives/lookup.ts";
import { MINUS, TIMES, amt, num } from "@engine/primitives/format.ts";

const PPB = 1_000_000_000n;

/**
 * TFR — art. 2120 Codice Civile.
 *
 *     accrual = gross / 13.5  -  gross x 0.50%
 *
 * The divisor is why this is a formula and not a flat rate: 1/13.5 is a
 * repeating decimal, so storing it as "0.074074074" would silently truncate the
 * statute. Dividing exactly is both simpler and closer to what art. 2120 says.
 *
 * The 0.50% guarantee-fund contribution is DEDUCTED here, not added: it is
 * already charged inside the INPS employer table. Adding 7.41% + 0.50% is the
 * classic double-count and overstates employer cost by half a point of gross.
 */
registerFormula("IT.TFR.DIVISOR", (base, params) => {
  const divisorDecimal = params["divisor"];
  const guaranteeDecimal = params["guaranteeFundRate"];
  if (divisorDecimal === undefined || guaranteeDecimal === undefined) {
    throw new TypeError("IT.TFR.DIVISOR needs params.divisor and params.guaranteeFundRate");
  }

  const divisor = rate(divisorDecimal).ppb;
  const guarantee = rate(guaranteeDecimal);

  const gross = toPrecise(base);
  const accrual = (gross * PPB) / divisor;
  const guaranteeShare = (gross * guarantee.ppb) / PPB;

  return {
    amount: toMoney(accrual - guaranteeShare, base.currency),
    formula:
      `${amt(base)} / ${num(divisorDecimal)} ${MINUS} ${amt(base)} ${TIMES} ` +
      `${num(guaranteeDecimal)} (fondo di garanzia, gia\u0300 nella tabella INPS)`,
  };
});

/**
 * Trattamento integrativo — art. 1 D.L. 3/2020. This returns the band CAP only.
 *
 * The rule is genuinely relational: below EUR 15,000 the EUR 1,200 is due only
 * if gross IRPEF exceeds the art. 13 credit (the `capienza` test), and between
 * EUR 15,000 and EUR 28,000 the amount IS the excess of total credits over gross
 * IRPEF. Neither can be evaluated from one base and a parameter set, so the cap
 * and the thresholds live here as data and the comparison lives in the pipeline
 * that has both quantities — see ./calculate/employee.ts.
 */
registerFormula("IT.TRATTAMENTO_INTEGRATIVO.CAP", (base, params) => {
  const amount = params["amount"];
  const upper = params["upperThreshold"];
  if (amount === undefined || upper === undefined) {
    throw new TypeError("IT.TRATTAMENTO_INTEGRATIVO.CAP needs params.amount and params.upperThreshold");
  }

  const cap = moneyFromDecimal(amount, base.currency);
  const ceiling = moneyFromDecimal(upper, base.currency);

  if (compare(base, ceiling) > 0) {
    return { amount: zero(base.currency), formula: `${amt(base)} > ${amt(ceiling)} \u2192 0,00` };
  }
  return { amount: cap, formula: `massimo ${amt(cap)} fino a ${amt(ceiling)}, soggetto a capienza` };
});

/** Importing this module registers the formulas. Nothing else to call. */
export const IT_FORMULAS = ["IT.TFR.DIVISOR", "IT.TRATTAMENTO_INTEGRATIVO.CAP"] as const;
