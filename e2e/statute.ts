/**
 * An INDEPENDENT reimplementation of the Italian 2026 statute, written longhand
 * from the articles.
 *
 * It deliberately imports nothing from `src/`. Not the engine, not the rule
 * files, not the fixtures. If it shared a line of code with what it checks, it
 * would be checking that the code agrees with itself.
 *
 * Structure differs on purpose too: no primitives, no rule objects, no integer
 * cents — plain arithmetic in euros with rounding applied where the statute
 * says. Two implementations built differently and agreeing to the cent is a far
 * stronger claim than one implementation and a snapshot.
 *
 * What this proves and what it does not:
 *   ✓ the figure on screen is what the LAW AS DOCUMENTED prescribes
 *   ✗ that the documented law is current — that is the verification step in
 *     docs/00-methodology.md §3, done against the sources, not by a test
 *
 * ── The articles encoded here ────────────────────────────────────────────────
 *   art. 11 TUIR, as amended by L. 199/2025 art. 1 c. 3   IRPEF brackets
 *   art. 13 TUIR                                          employment credit
 *   art. 51 c. 2 lett. a TUIR                             contributions deductible
 *   L. 335/1995 art. 2 c. 18                              contributory ceiling
 *   L. 438/1992 art. 3-ter                                additional 1% IVS
 *   L. 207/2024 art. 1 cc. 4-9                            cuneo fiscale measures
 *   D.L. 3/2020 art. 1                                    trattamento integrativo
 *   L.R. Lombardia 10/2003 art. 72                        regional surtax, per slice
 *   D.Lgs. 360/1998 + Milan resolution                    municipal surtax, 0.80% over 23,000
 *   art. 2120 Codice Civile                               TFR = gross / 13.5
 */

import { MUNICIPAL, REGIONAL, type Place } from "./statute-places.ts";

export { MUNICIPAL, REGIONAL } from "./statute-places.ts";
export type { Place } from "./statute-places.ts";

/** Half-up to the cent. */
const cents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Half-up to the whole euro — art. 11 c. 4 TUIR. */
const euros = (value: number): number => Math.round(value + Number.EPSILON);

export type StatuteResult = {
  contributions: number;
  taxableIncome: number;
  irpefGross: number;
  employmentCredit: number;
  bonus65: number;
  cuneoCredit: number;
  irpefNet: number;
  regionalSurtax: number;
  municipalSurtax: number;
  trattamentoIntegrativo: number;
  sommaIntegrativa: number;
  netAnnual: number;
  netPerPeriod: number;
  employerCost: number;
  taxWedge: number;
};

export function fromStatute(gross: number, payPeriods = 14, place: Place = {}): StatuteResult {
  // ── Employee contributions ────────────────────────────────────────────────
  // L. 335/1995 art. 2 c. 18: no IVS above the massimale, for post-1996 entrants.
  const MASSIMALE = 122_295;
  const FIRST_BAND = 56_224;
  const contributoryBase = Math.min(gross, MASSIMALE);
  const ivs = contributoryBase * 0.0919;
  // L. 438/1992 art. 3-ter: +1% on the slice above the first pensionable band.
  const additional = Math.max(0, contributoryBase - FIRST_BAND) * 0.01;
  const contributions = cents(ivs + additional);

  // art. 51 c. 2 lett. a TUIR: contributions never enter employment income.
  const taxableIncome = cents(gross - contributions);
  const t = taxableIncome;

  // ── art. 11 TUIR: 23% / 33% / 43%, per slice ──────────────────────────────
  const irpefGross = cents(
    Math.min(t, 28_000) * 0.23 +
      Math.min(Math.max(t - 28_000, 0), 22_000) * 0.33 +
      Math.max(t - 50_000, 0) * 0.43,
  );

  // ── art. 13 TUIR: employment credit ───────────────────────────────────────
  let employmentCredit: number;
  if (t <= 15_000) employmentCredit = 1_955;
  else if (t <= 28_000) employmentCredit = 1_910 + (1_190 * (28_000 - t)) / 13_000;
  else if (t <= 50_000) employmentCredit = (1_910 * (50_000 - t)) / 22_000;
  else employmentCredit = 0;
  employmentCredit = cents(employmentCredit);

  const bonus65 = t > 25_000 && t <= 35_000 ? 65 : 0;

  // ── L. 207/2024 art. 1 cc. 6-9: ulteriore detrazione ──────────────────────
  let cuneoCredit: number;
  if (t <= 20_000) cuneoCredit = 0;
  else if (t <= 32_000) cuneoCredit = 1_000;
  else if (t <= 40_000) cuneoCredit = (1_000 * (40_000 - t)) / 8_000;
  else cuneoCredit = 0;
  cuneoCredit = cents(cuneoCredit);

  const totalCredits = cents(employmentCredit + bonus65 + cuneoCredit);

  // art. 11 c. 4 TUIR: the final tax, rounded to the euro. Never below zero.
  const irpefNet = euros(Math.max(0, irpefGross - totalCredits));

  // ── Regional surtax, on the taxable base ──────────────────────────────────
  const region = REGIONAL[place.region ?? "LOMBARDIA"];
  if (!region) throw new Error(`No statute encoded for region ${place.region}`);
  const regionalSurtax = cents(
    region.mode === "slice"
      ? region.bands.reduce(
          (total, [from, to, rate]) =>
            total + Math.max(0, Math.min(t, to ?? t) - from) * rate,
          0,
        )
      : t * (region.bands.find(([from, to]) => t >= from && (to === null || t <= to))?.[2] ?? 0),
  );

  // ── Municipal surtax: exempt below the threshold, then on the WHOLE base ──
  const comune = MUNICIPAL[place.municipality ?? "MILANO"];
  if (!comune) throw new Error(`No statute encoded for comune ${place.municipality}`);
  const municipalSurtax = t <= comune.threshold ? 0 : cents(t * comune.rate);

  // ── D.L. 3/2020 art. 1: trattamento integrativo, capienza test ────────────
  let trattamentoIntegrativo = 0;
  if (t <= 15_000) {
    trattamentoIntegrativo = irpefGross > employmentCredit ? 1_200 : 0;
  } else if (t <= 28_000) {
    trattamentoIntegrativo = cents(Math.min(1_200, Math.max(0, totalCredits - irpefGross)));
  }

  // ── L. 207/2024 art. 1 cc. 4-5: somma integrativa, whole base by band ─────
  let sommaIntegrativa = 0;
  if (t <= 8_500) sommaIntegrativa = cents(t * 0.071);
  else if (t <= 15_000) sommaIntegrativa = cents(t * 0.053);
  else if (t <= 20_000) sommaIntegrativa = cents(t * 0.048);

  const netAnnual = cents(
    gross -
      contributions -
      irpefNet -
      regionalSurtax -
      municipalSurtax +
      trattamentoIntegrativo +
      sommaIntegrativa,
  );

  const netPerPeriod = cents(Math.round(netAnnual * 100) / payPeriods / 100);

  // ── Employer ──────────────────────────────────────────────────────────────
  const inpsEmployer = cents(Math.min(gross, MASSIMALE) * 0.2978);
  const inail = cents(gross * 0.004);
  // art. 2120 c.c., less the 0.50% guarantee fund already charged in the INPS table.
  const tfr = cents(gross / 13.5 - gross * 0.005);
  const fondoEst = 144;
  const employerCost = cents(gross + inpsEmployer + inail + tfr + fondoEst);

  return {
    contributions,
    taxableIncome,
    irpefGross,
    employmentCredit,
    bonus65,
    cuneoCredit,
    irpefNet,
    regionalSurtax,
    municipalSurtax,
    trattamentoIntegrativo,
    sommaIntegrativa,
    netAnnual,
    netPerPeriod,
    employerCost,
    taxWedge: (employerCost - netAnnual) / employerCost,
  };
}

/** "30.034,41 €" -> 30034.41 */
export function parseEuro(text: string): number {
  const digits = text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(digits);
}

/** "51,4%" -> 0.514 */
export function parsePercent(text: string): number {
  return Number.parseFloat(text.replace(/[^\d,.-]/g, "").replace(",", ".")) / 100;
}
