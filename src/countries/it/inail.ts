import type { InputOption } from "@engine/model/employee-profile.ts";
import { loadItalianRules } from "./rules/index.ts";

export const ITALIAN_INAIL_RISK_OPTIONS: readonly InputOption[] = [
  { value: "office", label: "Ufficio" },
  { value: "retail", label: "Commercio" },
  { value: "manufacturing", label: "Industria" },
  { value: "construction", label: "Edilizia" },
];

/**
 * Display the indicative class rate from the same legal rule consumed by the
 * engine. Missing data remains explicit rather than leaving an empty control.
 */
export function indicativeInailPercent(riskClass: string, taxYear: number): string {
  const config = loadItalianRules(taxYear)?.rules["IT.INAIL.PREMIUM"]?.config;
  if (config?.kind !== "lookup_table" || config.valueKind !== "rate") return "0";

  const rate = config.entries[riskClass] ??
    (config.defaultKey ? config.entries[config.defaultKey] : undefined);
  return rate === undefined ? "0" : decimalRateToPercent(rate);
}

function decimalRateToPercent(rate: string): string {
  const [integer = "0", fraction = ""] = rate.split(".");
  const shifted = `${integer}${fraction.padEnd(2, "0").slice(0, 2)}.${fraction.slice(2)}`
    .replace(/^0+(?=\d)/, "")
    .replace(/\.?0+$/, "")
    .replace(/\.$/, "");
  return shifted || "0";
}
