import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { subtract } from "@engine/money/money.ts";
import { euro, euroWhole, multiplier, percent } from "../_lib/format.ts";
import { costSplit } from "../_lib/distribution.ts";
import { useI18n } from "./I18nProvider.tsx";

/**
 * The answer, in the order the question is asked.
 *
 * L1 — what lands in the account each instalment. It is the only number on the
 *      page at display size, because "with this gross, what do I get?" is the
 *      question and everything else is the explanation.
 * L2 — the annual net, and the 12-month equivalent. Both, always: with 14
 *      instalments the per-payslip figure and the monthly average differ by
 *      ~17%, and showing one without the other invites the wrong comparison.
 * L3 — gross, withheld, employer cost, tax wedge. A dense row, tabular, so the
 *      four can be read against each other rather than hunted for.
 *
 * The `data-testid` stays `net-hero` from the first build. Test ids are an API
 * between the app and its e2e suite; renaming one to match a refactor buys
 * nothing and breaks the assertions that prove the refactor was safe.
 */
export function ResultSummary({ result }: { result: PayrollCalculation }) {
  const { locale, t } = useI18n();
  const { employee, employer, rates } = result;
  const withheld = subtract(employee.gross, employee.netAnnual);
  const periods = result.input.payPeriods;

  // With 12 instalments the per-payslip figure and the 12-month average are the
  // same number, and printing it twice is noise. With 13 or 14 they differ by
  // ~17% and printing only one invites the wrong comparison.
  const monthlyDiffers = periods !== 12;

  return (
    <section
      data-testid="net-hero"
      aria-labelledby="net-hero-title"
      className="product-card result-hero"
    >
      <div className="hero-primary">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-related)]">
            <h1 id="net-hero-title" className="type-eyebrow">
              {monthlyDiffers ? t("netPerPeriod", { periods }) : t("netMonthly")}
            </h1>
            <a
              href="#methodology"
              data-testid="methodology-link"
              className="type-label rounded-full border border-line-strong px-[var(--space-control)] py-[var(--space-tight)] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {t("methodAndSources")}
            </a>
          </div>
          <p data-testid="net-per-period" className="type-display mt-[var(--space-control)] text-ink">
            {euro(employee.netPerPayPeriod, locale)}
          </p>
          <p className="type-body mt-[var(--space-related)] text-ink-muted">
            <span className="text-ink-subtle">{t("netAnnual")}</span>{" "}
            <span data-testid="net-annual" className="tabular font-semibold text-ink">
              {euro(employee.netAnnual, locale)}
            </span>
            {monthlyDiffers ? (
              <>
                <span className="mx-[var(--space-related)] text-ink-subtle" aria-hidden>
                  ·
                </span>
                <span className="text-ink-subtle">{t("twelveMonthAverage")}</span>{" "}
                <span className="tabular font-medium text-ink">
                  {euro(employee.netMonthlyEquivalent, locale)}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-[var(--space-card-block)] gap-y-[var(--space-card-block)] border-t border-line pt-[var(--space-card)] sm:grid-cols-4">
          <Metric
            testId="gross"
            label={t("grossRal")}
            value={euroWhole(employee.gross, locale)}
            note={t("contractFigure")}
          />
          <Metric
            testId="withheld"
            label={t("withholdings")}
            value={withheld.cents > 50 ? `−${euroWhole(withheld, locale)}` : euroWhole(withheld, locale)}
            note={t("employeeTaxesContributions")}
          />
          <Metric
            testId="employer-cost"
            label={t("employerCost")}
            value={euroWhole(employer.totalCost, locale)}
            note={t("ralMultiplier", { value: multiplier(employer.costOverGross, locale) })}
            tone="employer"
          />
          <Metric
            testId="tax-wedge"
            label={t("taxWedge")}
            value={percent(rates.taxWedge, locale)}
            note={t("wedgeHint")}
          />
        </dl>
      </div>

      <CostBar result={result} />
    </section>
  );
}

function Metric({
  testId,
  label,
  value,
  note,
  tone,
}: {
  testId: string;
  label: string;
  value: string;
  note: string;
  tone?: "employer";
}) {
  return (
    <div className="min-w-0">
      <dt className="type-meta text-ink-subtle">{label}</dt>
      <dd
        data-testid={testId}
        className={`tabular mt-[var(--space-hairline)] text-sm font-semibold ${tone === "employer" ? "text-employer" : "text-ink"}`}
      >
        {value}
      </dd>
      <p className="type-meta mt-[var(--space-hairline)] text-ink-subtle">{note}</p>
    </div>
  );
}

/**
 * Where every euro the company spends actually goes.
 *
 * The denominator is stated in the heading, and it is the EMPLOYER COST — not
 * the gross. Mixing the two is the most common way a chart like this lies:
 * "contributions 6.5%" against gross and "employer 32%" against cost are not
 * comparable numbers, and putting them in one bar without saying so invites
 * exactly that reading. Every segment here divides by the same total, and the
 * total is written above the bar.
 */
function CostBar({ result }: { result: PayrollCalculation }) {
  const { locale, t } = useI18n();
  const split = costSplit(result);
  const labels = {
    net: t("splitNet"),
    contrib: t("splitContributions"),
    tax: t("splitTaxes"),
    employer: t("splitEmployer"),
  } as const;

  return (
    <div className="hero-secondary border-t border-line bg-surface-sunken">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-content)] gap-y-[var(--space-label)]">
        <h2 className="type-eyebrow">{t("costSplitTitle")}</h2>
        <p className="type-meta text-ink-subtle">
          {t("oneHundredOf", { value: euroWhole(result.employer.totalCost, locale) })}
        </p>
      </div>

      <div
        className="mt-[calc(var(--p)*2.5)] flex h-2.5 w-full overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={t("costSplitAria", {
          value: euroWhole(result.employer.totalCost, locale),
          segments: split.map((segment) => `${labels[segment.key]} ${percent(segment.share, locale)}`).join(", "),
        })}
      >
        {split.map((segment) => (
          <div
            key={segment.key}
            className={segment.className}
            style={{ width: `${segment.share * 100}%` }}
          />
        ))}
      </div>

      {/* The legend carries the numbers as text, so the chart is readable with
          colour perception removed entirely — not merely "colour-blind safe". */}
      <ul className="mt-[var(--space-control)] grid grid-cols-1 gap-x-[var(--space-card-block)] gap-y-[var(--space-tight)] min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
        {split.map((segment) => (
          <li key={segment.key} className="type-meta flex min-w-0 items-center gap-[var(--space-tight)] text-ink-muted">
            <span className={`size-2 shrink-0 rounded-full ${segment.className}`} aria-hidden />
            <span className="min-w-0">{labels[segment.key]}</span>
            <span className="tabular font-semibold text-ink">{percent(segment.share, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
