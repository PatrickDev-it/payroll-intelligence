/**
 * The German sub-national discriminants — and there are exactly two, neither of
 * them an income tax.
 *
 *   1. `Kirchensteuer`, 8% in Bayern and Baden-Württemberg, 9% everywhere else,
 *      and only for a registered church member. Opt-in by affiliation, not by
 *      residence — which is why the Land alone does not determine it.
 *   2. `Pflegeversicherung` in Sachsen, where the employee carries one point
 *      more than the employer because the Land kept its Buß- und Bettag.
 *
 * Germany has no regional or municipal income tax. The list is derived from the
 * church-tax rule's own lookup table, so a Land cannot appear in the form
 * without a rate behind it.
 */

import { loadGermanRules } from "./rules/index.ts";

export type Land = {
  /** ISO 3166-2:DE subdivision code, minus the `DE-` prefix. */
  readonly code: string;
  readonly label: string;
};

const LABELS: Readonly<Record<string, string>> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

export const SAXONY = "SN";
export const DEFAULT_LAND = "BE";

function landsFromRules(): readonly Land[] {
  const rules = loadGermanRules(2026);
  const config = rules?.rules["DE.KIRCHENSTEUER"]?.config;
  if (config?.kind !== "lookup_table") return [];

  return Object.keys(config.entries)
    .filter((key) => key !== "none")
    .map((code) => ({ code, label: LABELS[code] ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export const LAENDER: readonly Land[] = landsFromRules();

export function isKnownLand(code: string): boolean {
  return LAENDER.some((land) => land.code === code);
}

export function landLabel(code: string): string {
  return LAENDER.find((land) => land.code === code)?.label ?? code;
}
