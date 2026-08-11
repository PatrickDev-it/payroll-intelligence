/**
 * The Explain drawer's data, built the same way in every country.
 *
 * There is nothing national about it: a line already carries its derivation and
 * its rule ids, and the rule refs already travelled with the result. This only
 * joins the two. Four copies of that join would be four chances for one country
 * to quietly show a rule id where another shows a document title.
 */

import type { Explanation } from "../adapter/contract.ts";
import type { CalculationLine, PayrollCalculation } from "../model/calculation.ts";

export function explainLine(
  result: PayrollCalculation,
  lines: readonly CalculationLine[],
  lineId: string,
): Explanation | undefined {
  const line = lines.find((candidate) => candidate.id === lineId);
  if (!line) return undefined;

  return {
    lineId: line.id,
    label: line.label,
    derivation: line.formula,
    rules: line.ruleIds.map((id) => {
      const ref = result.meta.rulesApplied.find((candidate) => candidate.id === id);
      return {
        id,
        label: ref?.label ?? id,
        document: ref?.source.document ?? "(unknown)",
        ...(ref?.source.url ? { url: ref.source.url } : {}),
        confidence: ref?.confidence ?? "experimental",
      };
    }),
  };
}
