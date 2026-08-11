/**
 * Regions and municipalities, derived FROM THE RULE SET.
 *
 * The dropdown is built by reading the rule ids, not by maintaining a parallel
 * list. So a region can never appear in the form without a rule behind it, and
 * a rule can never be added without becoming selectable — the two cannot drift.
 */

import type { ConfidenceTier } from "@engine/model/confidence.ts";
import { loadItalianRules } from "./rules/index.ts";

const REGIONAL_PREFIX = "IT.ADDIZIONALE.REGIONALE.";
const MUNICIPAL_PREFIX = "IT.ADDIZIONALE.COMUNALE.";

export type Place = {
  /** The rule-id suffix: "LOMBARDIA", "MILANO". This is what the profile stores. */
  readonly key: string;
  readonly label: string;
  readonly ruleId: string;
  readonly confidence: ConfidenceTier;
};

export type Location = {
  /** Stable URL value. Both facts are present, so it cannot be ambiguous. */
  readonly key: string;
  readonly label: string;
  readonly regionKey: string;
  readonly municipalityKey: string;
};

function placesWith(prefix: string): readonly Place[] {
  const rules = loadItalianRules(2026);
  if (!rules) return [];

  return Object.values(rules.rules)
    .filter((rule) => rule.id.startsWith(prefix))
    .map((rule) => ({
      key: rule.id.slice(prefix.length),
      // "Addizionale regionale — Lombardia" -> "Lombardia"
      label: compactPlaceLabel(rule.label.split("—").at(-1)?.trim() ?? rule.id),
      ruleId: rule.id,
      confidence: rule.verification.status,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "it"));
}

function compactPlaceLabel(label: string): string {
  return label.replace(/^Provincia autonoma di /, "P.A. di ");
}

export const REGIONS: readonly Place[] = placesWith(REGIONAL_PREFIX);
export const MUNICIPALITIES: readonly Place[] = placesWith(MUNICIPAL_PREFIX);

export const DEFAULT_REGION = "LOMBARDIA";
export const DEFAULT_MUNICIPALITY = "MILANO";

/**
 * Every municipality for which a rule is modelled has one real region. The
 * sentinel NESSUNA is deliberately omitted: it is valid in every region and
 * means "apply only the regional surcharge".
 */
const MUNICIPALITY_REGIONS: Readonly<Record<string, string>> = {
  MILANO: "LOMBARDIA",
  ROMA: "LAZIO",
  NAPOLI: "CAMPANIA",
  FIRENZE: "TOSCANA",
  TORINO: "PIEMONTE",
  BOLOGNA: "EMILIA_ROMAGNA",
  TRENTO: "TRENTO",
  BOLZANO: "BOLZANO",
};

export const LOCATIONS: readonly Location[] = buildLocations();
export const DEFAULT_LOCATION = `${DEFAULT_REGION}:${DEFAULT_MUNICIPALITY}`;

function buildLocations(): readonly Location[] {
  const places: Location[] = [];

  for (const municipality of MUNICIPALITIES) {
    if (municipality.key === "NESSUNA") continue;
    const regionKey = MUNICIPALITY_REGIONS[municipality.key];
    const region = REGIONS.find((candidate) => candidate.key === regionKey);
    if (!region) {
      throw new Error(`Il comune ${municipality.key} non ha una regione modellata valida`);
    }
    places.push({
      key: `${region.key}:${municipality.key}`,
      label: `${region.label} · ${municipality.label}`,
      regionKey: region.key,
      municipalityKey: municipality.key,
    });
  }

  const none = MUNICIPALITIES.find((municipality) => municipality.key === "NESSUNA");
  if (!none) throw new Error("La regola comunale NESSUNA è obbligatoria");
  for (const region of REGIONS) {
    places.push({
      key: `${region.key}:${none.key}`,
      label: `${region.label} · ${none.label}`,
      regionKey: region.key,
      municipalityKey: none.key,
    });
  }

  return places.sort((a, b) => {
    const byRegion = regionLabel(a.regionKey).localeCompare(regionLabel(b.regionKey), "it");
    if (byRegion !== 0) return byRegion;
    if (a.municipalityKey === "NESSUNA") return 1;
    if (b.municipalityKey === "NESSUNA") return -1;
    return municipalityLabel(a.municipalityKey).localeCompare(
      municipalityLabel(b.municipalityKey),
      "it",
    );
  });
}

export function regionKeyForMunicipality(key: string): string | undefined {
  return MUNICIPALITY_REGIONS[key];
}

export function regionRuleId(key: string): string {
  return `${REGIONAL_PREFIX}${key}`;
}

export function municipalityRuleId(key: string): string {
  return `${MUNICIPAL_PREFIX}${key}`;
}

export function isKnownRegion(key: string): boolean {
  return REGIONS.some((r) => r.key === key);
}

export function isKnownMunicipality(key: string): boolean {
  return MUNICIPALITIES.some((m) => m.key === key);
}

export function regionLabel(key: string): string {
  return REGIONS.find((r) => r.key === key)?.label ?? key;
}

export function municipalityLabel(key: string): string {
  return MUNICIPALITIES.find((m) => m.key === key)?.label ?? key;
}
