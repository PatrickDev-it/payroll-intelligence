import type { CalculationLine, PayrollCalculation } from "@engine/model/calculation.ts";
import type { RuleRef } from "@engine/model/rule.ts";
import { subtract } from "@engine/money/money.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { Chevron } from "./BreakdownRow.tsx";
import { euro, euroWhole, multiplier, percent } from "../_lib/format.ts";
import { useI18n } from "./I18nProvider.tsx";
import { localizeDomainText } from "../_lib/i18n.ts";

/**
 * The employer side, with equal weight to the employee side — and separated
 * from it by an explicit equation rather than by a heading.
 *
 * The confusion this card exists to kill: **the cost is not the RAL**. A
 * person evaluating €45.000 gross and a company budgeting for the same role are
 * looking at €45.000 and €61.833, and neither figure is wrong. Stating the
 * relation as an equation — RAL + oneri = costo — makes the gap a quantity
 * rather than a surprise.
 *
 * Four categories rather than one percentage, because they behave differently
 * as gross rises: contributions are capped, insurance is priced by risk, and
 * severance (where a country has it) is uncapped and proportional. Collapsing
 * them would hide the shape of the curve.
 */
export function EmployerCost({ result }: { result: PayrollCalculation }) {
  const { locale, t } = useI18n();
  const rules = new Map(result.meta.rulesApplied.map((ref) => [ref.id, ref]));
  const { employer } = result;
  const onTop = subtract(employer.totalCost, employer.gross);

  const groups = [
    { title: t("mandatoryContributions"), lines: employer.contributions },
    { title: t("mandatoryInsurance"), lines: employer.insurance },
    { title: t("deferredPay"), lines: employer.severanceAccrual },
    { title: t("otherCosts"), lines: employer.otherCosts },
  ].filter((group) => group.lines.length > 0);

  return (
    <section
      data-testid="employer-section"
      aria-labelledby="employer-title"
      className="product-card"
    >
      <header className="card-header border-b border-line">
        <h2 id="employer-title" className="type-title">
          {t("employerTitle")}
        </h2>
        <p className="type-meta mt-[var(--space-hairline)] text-ink-subtle">
          {t("employerIntro")}
        </p>
      </header>

      {/* The equation, before the detail. Three terms, aligned, so the reader
          sees the gap as arithmetic instead of inferring it. */}
      <dl className="card-header flex flex-wrap items-baseline gap-x-[var(--space-control)] gap-y-[var(--space-related)] border-b border-line bg-surface-sunken">
        <div className="min-w-0">
          <dt className="type-meta text-ink-subtle">RAL</dt>
          <dd className="tabular text-sm font-semibold">{euro(employer.gross, locale)}</dd>
        </div>
        <span className="text-ink-subtle" aria-hidden>
          +
        </span>
        <div className="min-w-0">
          <dt className="type-meta text-ink-subtle">{t("employerCharges")}</dt>
          <dd className="tabular text-sm font-semibold">{euro(onTop, locale)}</dd>
        </div>
        <span className="text-ink-subtle" aria-hidden>
          =
        </span>
        <div className="min-w-0">
          <dt className="type-meta text-employer">{t("annualTotalCost")}</dt>
          <dd
            data-testid="employer-total"
            className="tabular text-base font-semibold text-employer sm:text-lg"
          >
            {euro(employer.totalCost, locale)}
          </dd>
        </div>
        <p className="type-meta ml-auto text-ink-subtle">
          <span className="tabular font-medium text-employer">
            {multiplier(employer.costOverGross, locale)}
          </span>{" "}
          {t("grossRal")}
        </p>
      </dl>

      {groups.map((group) => (
        <div key={group.title} className="card-section border-b border-line last:border-0">
          <h3 className="type-eyebrow">{group.title}</h3>
          <ul className="mt-[var(--space-tight)] flex flex-col gap-[var(--space-hairline)]">
            {group.lines.map((line) => (
              <li key={line.id}>
                <CostRow line={line} rules={rules} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="card-footer type-meta border-t border-line text-ink-subtle">
        {t("employerShareSentence", {
          cost: euroWhole(employer.totalCost, locale),
          share: percent(result.employee.netAnnual.cents / employer.totalCost.cents, locale),
        })}
      </p>
    </section>
  );
}

function CostRow({ line, rules }: { line: CalculationLine; rules: Map<string, RuleRef> }) {
  const { locale } = useI18n();
  const ref = rules.get(line.ruleIds[0] ?? "");
  const isReduction = line.amount.cents < 0;

  return (
    <details data-testid={`employer-line-${line.id}`} className="group">
      <summary className="mx-[calc(var(--p)*-2)] flex cursor-pointer list-none items-center gap-[var(--space-control)] rounded-md px-[var(--space-related)] py-[calc(var(--p)*2.5)] transition-colors duration-150 hover:bg-surface-sunken">
        <Chevron />
        <span className="min-w-0 flex-1 text-sm">{localizeDomainText(locale, line.label)}</span>
        {ref && ref.confidence !== "verified" ? (
          <ConfidenceBadge tier={ref.confidence} size="sm" />
        ) : null}
        <span
          className={`tabular w-24 shrink-0 text-right text-sm font-medium sm:w-32 ${
            isReduction ? "text-accent-ink" : ""
          }`}
        >
          {euro(line.amount, locale)}
        </span>
      </summary>
      <div className="mb-[var(--space-related)] ml-[var(--space-card)] rounded-md border border-line bg-surface-sunken px-[var(--space-content)] py-[var(--space-control)]">
        <p className="tabular type-body wrap-break-word text-ink">
          {localizeDomainText(locale, line.formula)}
        </p>
        {ref ? (
          <p className="type-meta mt-[var(--space-related)] text-ink-subtle">
            <code className="rounded-xs bg-surface px-[var(--space-tight)] py-[var(--space-hairline)] font-mono break-all">{ref.id}</code>{" "}
            {ref.source.document}
          </p>
        ) : null}
      </div>
    </details>
  );
}
