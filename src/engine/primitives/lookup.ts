/**
 * Primitives 8 and 9 — the two escape hatches, both of which keep rule data
 * free of code.
 */

import type { Money } from "../money/money.ts";
import { applyRate, moneyFromDecimal, rate, toMoney, toPrecise } from "../money/money.ts";
import { TIMES, amt, pct } from "./format.ts";
import type { Decimal, PrimitiveResult } from "./types.ts";

export class UnknownLookupKeyError extends Error {
  constructor(key: string, available: readonly string[]) {
    super(
      `No entry for key "${key}". Known keys: ${available.join(", ") || "(none)"}. ` +
        `Refusing rather than substituting a default.`,
    );
    this.name = "UnknownLookupKeyError";
  }
}

export class UnknownFormulaError extends Error {
  constructor(formulaId: string, available: readonly string[]) {
    super(
      `No implementation registered for formula "${formulaId}". ` +
        `Registered: ${available.join(", ") || "(none)"}.`,
    );
    this.name = "UnknownFormulaError";
  }
}

/**
 * 8. lookup_table — a discrete value chosen by key: INAIL risk class, German
 * church tax by Land, Dutch Whk by sector.
 *
 * An unknown key throws. These are exactly the parameters with no honest
 * default — INAIL spans 0.4 to 130 per mille — so guessing one would produce a
 * confident wrong employer cost.
 */
export function lookupTable(
  base: Money,
  valueKind: "rate" | "amount",
  entries: Readonly<Record<string, Decimal>>,
  key: string | undefined,
  defaultKey: string | undefined,
): PrimitiveResult {
  const resolved = key ?? defaultKey;
  if (resolved === undefined || entries[resolved] === undefined) {
    throw new UnknownLookupKeyError(resolved ?? "(none supplied)", Object.keys(entries));
  }
  const value = entries[resolved] as Decimal;

  if (valueKind === "amount") {
    const amount = moneyFromDecimal(value, base.currency);
    return { amount, formula: `${amt(amount)} (${resolved})` };
  }
  const r = rate(value);
  return {
    amount: toMoney(applyRate(toPrecise(base), r), base.currency),
    formula: `${amt(base)} ${TIMES} ${pct(r)} (${resolved})`,
  };
}

/**
 * 9. formula — a closed form the other eight cannot express.
 *
 * German Einkommensteuer is the case that forces this to exist: §32a EStG is a
 * piecewise polynomial whose marginal rate rises continuously from 14% to 42%,
 * so a bracket table is not an approximation of it, it is a different function.
 *
 * Implementations are registered by name and rule data references the name, so
 * the data still contains no executable content.
 */
export type FormulaImpl = (base: Money, params: Readonly<Record<string, Decimal>>) => PrimitiveResult;

const REGISTRY = new Map<string, FormulaImpl>();

export function registerFormula(formulaId: string, impl: FormulaImpl): void {
  REGISTRY.set(formulaId, impl);
}

export function applyFormula(
  base: Money,
  formulaId: string,
  params: Readonly<Record<string, Decimal>>,
): PrimitiveResult {
  const impl = REGISTRY.get(formulaId);
  if (!impl) throw new UnknownFormulaError(formulaId, [...REGISTRY.keys()]);
  return impl(base, params);
}

/** Test seam. Not for production paths. */
export function registeredFormulas(): readonly string[] {
  return [...REGISTRY.keys()];
}
