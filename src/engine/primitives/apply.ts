/**
 * The dispatcher. The ONLY place the engine switches on anything.
 *
 * Note what it does not switch on: country. It switches on the shape of the
 * rule, which is finite and legally motivated. `if (country === "IT")` is cheap
 * the first time and a rewrite by the twenty-seventh.
 */

import { bandedRate, progressiveBrackets } from "./brackets.ts";
import { taperedCredit } from "./credits.ts";
import { applyFormula, lookupTable } from "./lookup.ts";
import { cappedRate, flatRate, flooredRate, thresholdExemption } from "./rates.ts";
import type { PrimitiveConfig, PrimitiveInput, PrimitiveResult } from "./types.ts";

export function applyPrimitive(
  config: PrimitiveConfig,
  input: PrimitiveInput,
): PrimitiveResult {
  const { base, key } = input;

  switch (config.kind) {
    case "progressive_brackets":
      return progressiveBrackets(base, config.brackets);
    case "flat_rate":
      return flatRate(base, config.rate);
    case "capped_rate":
      return cappedRate(base, config.rate, config.ceiling);
    case "floored_rate":
      return flooredRate(base, config.rate, config.floor);
    case "banded_rate":
      return bandedRate(base, config.bands);
    case "tapered_credit":
      return taperedCredit(base, config.segments);
    case "threshold_exemption":
      return thresholdExemption(base, config.threshold, config.rate);
    case "lookup_table":
      return lookupTable(base, config.valueKind, config.entries, key, config.defaultKey);
    case "formula":
      return applyFormula(base, config.formulaId, config.params);
  }
}
