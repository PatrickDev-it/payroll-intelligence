import type { CalculationLine, PayrollCalculation } from "@engine/model/calculation.ts";
import type { RuleRef } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import { LineRow, TotalRow } from "./BreakdownRow.tsx";
import { useI18n } from "./I18nProvider.tsx";

/**
 * The breakdown IS the product.
 *
 * The order on screen is the order in the law: contributions come off first,
 * the taxable base falls out of that, tax applies to it, and the cash
 * supplements are added afterwards under their own heading — because they are
 * transfers, not reductions of tax. Presenting them as negative tax would give
 * the right net and the wrong story.
 *
 * It reads as a descent, not as a ledger: gross at the top in full weight, two
 * subtractions with their own sub-rows, a subtotal where the law defines one
 * (`imponibile fiscale` is a legal quantity, not a UI convenience), and the net
 * at the bottom. The eye should be able to follow one column of figures from
 * the first to the last without deciding what to compare.
 *
 * Every line here is EMPLOYEE-side. What the company pays on top is a separate
 * card on purpose: merging the two into one list is the single most common way
 * a gross-to-net calculator confuses the two, and the confusion is expensive —
 * it is the difference between €45.000 and €61.833.
 */
export function Breakdown({ result }: { result: PayrollCalculation }) {
  const { t } = useI18n();
  const rules = new Map(result.meta.rulesApplied.map((ref) => [ref.id, ref]));
  const { employee } = result;

  return (
    <section
      data-testid="breakdown"
      aria-labelledby="breakdown-title"
      className="product-card"
    >
      <header className="card-header flex flex-wrap items-baseline justify-between gap-x-[var(--space-content)] gap-y-[var(--space-label)] border-b border-line">
        <h2 id="breakdown-title" className="type-title">
          {t("grossToNet")}
        </h2>
        <p className="type-meta text-ink-subtle">
          {t("breakdownHint")}
        </p>
      </header>

      <div className="divide-y divide-line">
        <TotalRow label={t("annualGross")} amount={employee.gross} emphasis />

        <Group
          step={1}
          title={t("socialContributions")}
          note={t("socialNote")}
          lines={employee.socialSecurity}
          gross={employee.gross}
          rules={rules}
        />

        <TotalRow
          label={t("taxableIncome")}
          amount={employee.taxableIncome}
          muted
          note={t("taxableNote")}
        />

        <Group
          step={2}
          title={t("taxes")}
          lines={employee.taxes}
          gross={employee.gross}
          rules={rules}
        />

        <Group
          step={3}
          title={t("cashCredits")}
          note={t("cashCreditsNote")}
          lines={employee.credits}
          gross={employee.gross}
          rules={rules}
        />

        <TotalRow label={t("netAnnual")} amount={employee.netAnnual} emphasis accent />
      </div>
    </section>
  );
}

function Group({
  step,
  title,
  note,
  lines,
  gross,
  rules,
}: {
  step: number;
  title: string;
  note?: string;
  lines: readonly CalculationLine[];
  gross: Money;
  rules: Map<string, RuleRef>;
}) {
  if (lines.length === 0) return null;

  return (
    <div className="card-section">
      <div className="flex items-baseline gap-[var(--space-related)]">
        <span
          className="type-meta flex size-4.5 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-semibold text-ink-muted"
          aria-hidden
        >
          {step}
        </span>
        <h3 className="type-eyebrow">{title}</h3>
      </div>
      {note ? <p className="type-meta mt-[var(--space-label)] pl-[var(--space-card)] text-ink-subtle">{note}</p> : null}
      <ul className="mt-[var(--space-related)] flex flex-col">
        {lines.map((line) => (
          <li key={line.id}>
            <LineRow line={line} gross={gross} rules={rules} />
          </li>
        ))}
      </ul>
    </div>
  );
}
