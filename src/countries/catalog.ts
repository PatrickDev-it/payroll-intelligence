/** Public product catalogue. Only executable countries belong here. */

import type { ConfidenceTier } from "@engine/model/confidence.ts";
import type { EUCountry } from "@engine/model/employee-profile.ts";

export type CountryEntry = {
  readonly code: EUCountry;
  readonly name: string;
  readonly flag: string;
  readonly docTier: ConfidenceTier;
  readonly headline: string;
  readonly needs: string;
};

/**
 * Adding a country remains additive — adapter, rules, tests, documentation and
 * one catalogue row — but roadmap countries are never presented as capability.
 */
export const EU_CATALOG: readonly CountryEntry[] = [
  {
    code: "IT",
    name: "Italia",
    flag: "🇮🇹",
    docTier: "supported",
    headline: "IRPEF, addizionali, contributi e costo azienda con massimale IVS esplicito.",
    needs: "Aliquote aziendali e comune devono appartenere al perimetro dichiarato.",
  },
  {
    code: "DE",
    name: "Germania",
    flag: "🇩🇪",
    docTier: "supported",
    headline: "Lohnsteuer 2026 riconciliata con il Programmablaufplan ufficiale BMF.",
    needs: "Classi V/VI, PKV e parametri specifici della cassa restano fuori perimetro.",
  },
  {
    code: "ES",
    name: "Spagna",
    flag: "🇪🇸",
    docTier: "supported",
    headline: "Il netto usa la ritenuta AEAT; il debito IRPF annuale resta separato.",
    needs: "Serve l'aliquota AEAT del lavoratore; i territori forali non sono sostituiti.",
  },
  {
    code: "FR",
    name: "Francia",
    flag: "🇫🇷",
    docTier: "supported",
    headline: "Contributi e RGDU 2026 con SMIC al 1° gennaio e riproporzione part-time.",
    needs: "Barème sui redditi 2026 provvisorio fino alla legge di bilancio definitiva.",
  },
];

export function countryEntry(code: string): CountryEntry | undefined {
  return EU_CATALOG.find((country) => country.code === code);
}
