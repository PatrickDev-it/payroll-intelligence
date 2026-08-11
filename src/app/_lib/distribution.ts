/**
 * The one place that decides how the employer's euro is divided, and against
 * which denominator.
 *
 * It lives outside the component because two different places show it — the bar
 * in the summary and the sentence under the employer card — and two derivations
 * of the same split would eventually disagree by a rounding step. It divides by
 * `employer.totalCost` and by nothing else: a chart whose slices use different
 * denominators is not a simplification, it is a wrong picture.
 *
 * `employerSide` is computed as the residual rather than by re-summing the
 * employer lines, so the four segments add to exactly 100% by construction. If
 * a country ever produced an employer cost below the net plus withholdings, the
 * clamp keeps the bar from inverting — and the number that would reveal it is
 * the total, which is displayed beside the bar.
 */

import type { PayrollCalculation } from "@engine/model/calculation.ts";

export type CostSegment = {
  readonly key: "net" | "contrib" | "tax" | "employer";
  readonly label: string;
  readonly cents: number;
  readonly share: number;
  readonly className: string;
};

export function costSplit(result: PayrollCalculation): readonly CostSegment[] {
  const total = result.employer.totalCost.cents;
  if (total <= 0) return [];

  const net = result.employee.netAnnual.cents;
  const contributions = result.employee.socialSecurity.reduce((sum, line) => sum - line.amount.cents, 0);
  const taxes = result.employee.taxes.reduce((sum, line) => sum - line.amount.cents, 0);
  const employerSide = Math.max(0, total - net - contributions - taxes);

  const segments: readonly Omit<CostSegment, "share">[] = [
    { key: "net", label: "Netto al dipendente", cents: net, className: "bg-accent" },
    { key: "contrib", label: "Contributi dipendente", cents: contributions, className: "bg-ink-subtle" },
    { key: "tax", label: "Imposte", cents: taxes, className: "bg-ink-muted" },
    { key: "employer", label: "Oneri a carico azienda", cents: employerSide, className: "bg-employer" },
  ];

  return segments
    .filter((segment) => segment.cents > 0)
    .map((segment) => ({ ...segment, share: segment.cents / total }));
}
