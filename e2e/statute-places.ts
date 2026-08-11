/**
 * Regional and municipal surtaxes, read off the regional laws and the municipal
 * resolutions. Part of the INDEPENDENT statute: nothing here is imported from
 * `src/`, so agreement with the engine is evidence rather than tautology.
 *
 * `slice` applies each rate to its own portion; `whole` applies the matching
 * band's rate to the entire base. Confusing the two is a systematic error, so
 * the mode is explicit here as it is in the rule data.
 */

export const REGIONAL: Record<
  string,
  { mode: "slice" | "whole"; bands: [number, number | null, number][] }
> = {
  LOMBARDIA: {
    mode: "slice",
    bands: [
      [0, 15_000, 0.0123],
      [15_000, 28_000, 0.0158],
      [28_000, 50_000, 0.0172],
      [50_000, null, 0.0173],
    ],
  },
  CAMPANIA: {
    mode: "slice",
    bands: [
      [0, 15_000, 0.0173],
      [15_000, 28_000, 0.0296],
      [28_000, 50_000, 0.032],
      [50_000, null, 0.0333],
    ],
  },
  VENETO: { mode: "whole", bands: [[0, null, 0.0123]] },
  LAZIO: {
    mode: "slice",
    bands: [
      [0, 28_000, 0.0173],
      [28_000, null, 0.0333],
    ],
  },
  TOSCANA: {
    mode: "slice",
    bands: [
      [0, 15_000, 0.0142],
      [15_000, 28_000, 0.0143],
      [28_000, 50_000, 0.0332],
      [50_000, null, 0.0333],
    ],
  },
  FRIULI_VENEZIA_GIULIA: {
    mode: "whole",
    bands: [
      [0, 15_000, 0.007],
      [15_000, null, 0.0123],
    ],
  },
};

/** Rate, and the exemption below which nothing is due. */
export const MUNICIPAL: Record<string, { rate: number; threshold: number }> = {
  MILANO: { rate: 0.008, threshold: 23_000 },
  ROMA: { rate: 0.009, threshold: 14_000 },
  NAPOLI: { rate: 0.01, threshold: 12_000 },
  FIRENZE: { rate: 0.002, threshold: 25_000 },
  NESSUNA: { rate: 0, threshold: 0 },
};

export type Place = { region?: string; municipality?: string };
