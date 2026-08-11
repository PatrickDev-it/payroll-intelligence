import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { useI18n } from "./I18nProvider.tsx";
import { localizeDomainText } from "../_lib/i18n.ts";
import { RELEASE_ID } from "../_lib/release.ts";

/**
 * Every rule that produced this result, with the document it came from.
 *
 * The claim on the page is not "trust us": it is "here are the N rules and the
 * sources behind them, and here is what each one is worth". A figure whose
 * provenance is inspectable is a different object from one that is not.
 */
export function Provenance({ result }: { result: PayrollCalculation }) {
  const { locale, t } = useI18n();
  const rules = [...result.meta.rulesApplied].sort((a, b) => a.id.localeCompare(b.id));
  const authorities = new Set(rules.map((r) => r.source.authority));

  return (
    <section
      data-testid="provenance"
      aria-labelledby="provenance-title"
      className="product-card"
    >
      <header className="card-header border-b border-line">
        <h2 id="provenance-title" className="type-title">
          {t("provenanceTitle", { count: result.meta.rulesApplied.length })}
        </h2>
        <p className="type-meta mt-[var(--space-label)] text-ink-muted">
          <span data-testid="rule-count" className="font-medium text-ink">
            {t("provenanceSummary", { rules: rules.length, sources: authorities.size })}
          </span>{" "}
          · ruleset{" "}
          <code className="font-mono text-[11px]">{result.meta.rulesetVersion}</code> · engine{" "}
          <code className="font-mono text-[11px]">{result.meta.engineVersion}</code> · build{" "}
          <code data-testid="release-id" className="font-mono text-[11px]">
            {RELEASE_ID.slice(0, 12)}
          </code>
        </p>
      </header>

      <ul className="divide-y divide-line">
        {rules.map((rule) => (
          <li key={rule.id} className="card-section flex min-w-0 flex-col gap-[var(--space-tight)]">
            <div className="flex flex-wrap items-center gap-x-[calc(var(--p)*2.5)] gap-y-[var(--space-label)]">
              <code className="type-meta rounded-xs bg-surface-sunken px-[var(--space-tight)] py-[var(--space-hairline)] font-mono break-all text-ink-muted">
                {rule.id}
              </code>
              <span className="type-body">{localizeDomainText(locale, rule.label)}</span>
              <ConfidenceBadge tier={rule.confidence} size="sm" />
            </div>
            <p className="type-meta wrap-break-word text-ink-muted">
              <span className="text-ink-subtle">{rule.source.authority}</span> — {rule.source.document}
              {rule.source.article ? <span className="text-ink-subtle"> · {rule.source.article}</span> : null}
            </p>
            {rule.source.url ? (
              <a
                href={rule.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="type-meta w-fit max-w-full truncate text-accent underline-offset-2 hover:underline"
              >
                {new URL(rule.source.url).hostname}
              </a>
            ) : null}
          </li>
        ))}
      </ul>


    </section>
  );
}
