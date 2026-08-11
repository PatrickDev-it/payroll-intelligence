import type { CalculationLine } from "@engine/model/calculation.ts";
import type { RuleRef } from "@engine/model/rule.ts";
import type { Money } from "@engine/money/money.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { euro, euroSigned, percent, shareOf } from "../_lib/format.ts";
import { useI18n } from "./I18nProvider.tsx";
import { localizeDomainText } from "../_lib/i18n.ts";

/**
 * One row of the breakdown, and its derivation.
 *
 * A <details> element: no JavaScript, keyboard-accessible for free, and it
 * still opens on a page with the runtime switched off. The content is read
 * straight off `CalculationLine` — `formula` and `ruleIds` are built where the
 * arithmetic happens, so this cannot disagree with the number it explains.
 */
export function LineRow({
  line,
  gross,
  rules,
  depth = 0,
}: {
  line: CalculationLine;
  gross: Money;
  rules: Map<string, RuleRef>;
  depth?: number;
}) {
  const { locale, t } = useI18n();
  const positive = line.amount.cents > 0;

  return (
    <details data-testid={`line-${line.id}`} className="group border-b border-line/60 last:border-0">
      <summary
        className="mx-[calc(var(--p)*-2)] flex cursor-pointer list-none items-center gap-[var(--space-control)] rounded-md px-[var(--space-related)] py-[var(--space-control)] transition-colors hover:bg-surface-sunken"
        style={depth > 0 ? { paddingLeft: `calc(var(--p) * ${depth * 3.5})` } : undefined}
      >
        <Chevron />

        <span className={`min-w-0 flex-1 text-sm ${depth > 0 ? "text-ink-muted" : "text-ink"}`}>
          {localizeDomainText(locale, line.label)}
        </span>

        <span className="hidden w-24 shrink-0 sm:block" aria-hidden>
          <span className="block h-1 w-full overflow-hidden rounded-full bg-line">
            <span
              className={`block h-full rounded-full ${positive ? "bg-accent" : "bg-ink-subtle"}`}
              style={{ width: `${shareOf(line.amount, gross) * 100}%` }}
            />
          </span>
        </span>

        <span
          data-testid={`amount-${line.id}`}
          className={[
            "tabular w-24 shrink-0 text-right text-sm font-medium sm:w-32",
            positive ? "text-accent-ink" : "text-ink",
          ].join(" ")}
        >
          {euroSigned(line.amount, locale)}
        </span>
      </summary>

      <div className="mb-[var(--space-control)] ml-[var(--space-card)] rounded-lg border border-line bg-surface-sunken p-[var(--space-content)]">
        <dl className="flex flex-col gap-[calc(var(--p)*2.5)]">
          {line.basis ? (
            <div className="flex flex-wrap items-baseline gap-x-[var(--space-related)]">
              <dt className="type-meta text-ink-subtle">{t("calculationBasis")}</dt>
              <dd className="tabular type-body font-medium">{euro(line.basis, locale)}</dd>
              <dd className="type-meta text-ink-subtle">
                = {t("ofThisBasis", { value: percent(shareOf(line.amount, line.basis), locale) })}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="type-meta text-ink-subtle">{t("calculation")}</dt>
            <dd className="tabular type-body mt-[var(--space-hairline)] wrap-break-word text-ink">
              {localizeDomainText(locale, line.formula)}
            </dd>
          </div>
          <div>
            <dt className="type-meta text-ink-subtle">{t("appliedRule")}</dt>
            <dd className="mt-[var(--space-label)] flex flex-col gap-[var(--space-tight)]">
              {line.ruleIds.map((id) => (
                <RuleCitation key={id} id={id} ref_={rules.get(id)} />
              ))}
            </dd>
          </div>
        </dl>

        {line.children && line.children.length > 0 ? (
          <ul className="mt-[var(--space-control)] border-t border-line pt-[var(--space-label)]">
            {line.children.map((child) => (
              <li key={child.id}>
                <LineRow line={child} gross={gross} rules={rules} depth={depth + 1} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

function RuleCitation({ id, ref_ }: { id: string; ref_: RuleRef | undefined }) {
  return (
    <span className="flex flex-wrap items-center gap-x-[var(--space-related)] gap-y-[var(--space-label)]">
      <code className="rounded-xs bg-surface px-[var(--space-tight)] py-[var(--space-hairline)] font-mono text-[10px] break-all text-ink-muted">
        {id}
      </code>
      {ref_ ? (
        <>
          <span className="type-meta text-ink-muted">{ref_.source.document}</span>
          <ConfidenceBadge tier={ref_.confidence} size="sm" />
        </>
      ) : null}
    </span>
  );
}

export function TotalRow({
  label,
  amount,
  note,
  emphasis = false,
  muted = false,
  accent = false,
}: {
  label: string;
  amount: Money;
  note?: string;
  emphasis?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  const { locale } = useI18n();
  return (
    <div
      className={[
        "card-section flex items-baseline justify-between gap-[var(--space-content)]",
        muted ? "bg-surface-sunken" : "",
        accent ? "bg-accent-soft" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p
          className={[
            "text-sm",
            emphasis ? "font-semibold text-ink" : "text-ink-muted",
            accent ? "text-accent-ink" : "",
          ].join(" ")}
        >
          {label}
        </p>
        {note ? <p className="type-meta mt-[var(--space-hairline)] text-ink-subtle">{note}</p> : null}
      </div>
      <span
        className={[
          "tabular shrink-0 text-right font-semibold",
          emphasis ? "text-base sm:text-lg" : "text-sm",
          accent ? "text-accent-ink" : "",
        ].join(" ")}
      >
        {euro(amount, locale)}
      </span>
    </div>
  );
}

export function Chevron() {
  return (
    <svg
      className="size-3 shrink-0 text-ink-subtle transition-transform group-open:rotate-90"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
