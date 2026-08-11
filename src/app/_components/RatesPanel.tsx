import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { percent } from "../_lib/format.ts";
import { useI18n } from "./I18nProvider.tsx";

/**
 * The rates, with the marginal one given the room it deserves.
 *
 * At EUR 45,000 in Italy the effective rate is ~24% and the marginal rate on
 * gross is ~49%: the credit taper destroys EUR 0.087 of credit per extra euro
 * of income, on top of the nominal 33%. A user deciding about a raise needs the
 * second number, and no headline bracket rate reveals it — which is exactly why
 * it is here and not buried.
 */
export function RatesPanel({ result }: { result: PayrollCalculation }) {
  const { locale, t } = useI18n();
  const { rates } = result;

  const items = [
    {
      key: "effective",
      label: t("effectiveRate"),
      value: rates.totalEffectiveRate,
      hint: t("effectiveRateHint"),
    },
    {
      key: "tax",
      label: t("taxOnly"),
      value: rates.effectiveTaxRate,
      hint: t("taxOnlyHint"),
    },
    {
      key: "social",
      label: t("contributionsOnly"),
      value: rates.effectiveSocialRate,
      hint: t("contributionsOnlyHint"),
    },
  ];

  return (
    <section
      data-testid="rates"
      aria-labelledby="rates-title"
      className="product-card"
    >
      <header className="card-header flex flex-wrap items-baseline justify-between gap-x-[var(--space-content)] gap-y-[var(--space-label)] border-b border-line">
        <h2 id="rates-title" className="type-title">
          {t("effectiveRates")}
        </h2>
        <p className="type-meta text-ink-subtle">{t("ratesBasis")}</p>
      </header>

      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div key={item.key} className="card-header">
            <p className="type-meta text-ink-subtle">{item.label}</p>
            <p data-testid={`rate-${item.key}`} className="type-figure mt-[var(--space-label)] text-ink">
              {percent(item.value, locale)}
            </p>
            <p className="type-meta mt-[var(--space-label)] text-ink-subtle">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="card-header border-t border-line bg-accent-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-content)] gap-y-[var(--space-label)]">
          <p className="type-label text-accent-ink">{t("marginalRate")}</p>
          <p data-testid="marginal-rate" className="type-figure text-accent-ink">
            {percent(rates.marginalRate, locale)}
          </p>
        </div>
        <p className="type-meta mt-[var(--space-tight)] text-accent-ink">
          {t("marginalRateHelp")}
        </p>
      </div>
    </section>
  );
}
