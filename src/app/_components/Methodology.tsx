import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { CountryEntry } from "@countries/catalog.ts";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { useI18n } from "./I18nProvider.tsx";
import { localizeDomainText, localizeNotes } from "../_lib/i18n.ts";

/**
 * The trust layer, and the section a reviewer should be able to reach in one
 * click.
 *
 * The claim this product makes is not "these numbers are right". It is: here is
 * where each one came from, here is what was deliberately left out, here is how
 * wrong it can be, and here is the arithmetic discipline underneath. A
 * calculator that cannot say what it excluded is indistinguishable from one
 * that forgot.
 *
 * Everything on this card is derived from the result itself — the rules
 * applied, their verification dates, the country's own notes — rather than
 * written as marketing copy that could drift away from the engine.
 */
export function Methodology({
  result,
  entry,
}: {
  result: PayrollCalculation;
  entry: CountryEntry | undefined;
}) {
  const { locale, localeTag, t } = useI18n();
  const rules = result.meta.rulesApplied;
  const dates = rules
    .map((rule) => rule.verifiedAt)
    .filter((date): date is string => Boolean(date))
    .sort();
  const lastVerified = dates.at(-1);
  const weakest = rules.filter((rule) => rule.confidence === "experimental");

  return (
    <section
      id="methodology"
      data-testid="methodology"
      aria-labelledby="methodology-title"
      className="product-card scroll-mt-[var(--space-anchor)]"
    >
      <header className="card-header flex flex-wrap items-baseline justify-between gap-x-[var(--space-content)] gap-y-[var(--space-label)] border-b border-line">
        <h2 id="methodology-title" className="type-title">
          {t("methodologyTitle")}
        </h2>
        <p className="type-meta text-ink-subtle">
          {t("taxYearVerified", {
            year: result.input.taxYear,
            date: lastVerified ? t("verifiedOn", { date: formatDate(lastVerified, localeTag) }) : "",
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="card-header flex flex-col gap-[var(--space-control)]">
          <h3 className="type-eyebrow">{t("howNumbers")}</h3>
          <ol className="flex flex-col gap-[var(--space-related)]">
            {[
              [t("primaryLaw"), t("primaryLawHelp")],
              [t("administrativeSource"), t("administrativeSourceHelp")],
              [t("taxBase"), t("taxBaseHelp")],
              [t("thresholds"), t("thresholdsHelp")],
              [t("boundaryTests"), t("boundaryTestsHelp")],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-[calc(var(--p)*2.5)]">
                <span
                  className="type-meta mt-[var(--space-hairline)] flex size-4.5 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-semibold text-ink-muted"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <p className="type-meta text-ink-muted">
                  <span className="font-semibold text-ink">{title}.</span> {body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="card-header flex flex-col gap-[var(--space-control)]">
          <h3 className="type-eyebrow">{t("exclusions")}</h3>
          <ul className="flex flex-col gap-[var(--space-tight)]">
            {localizeNotes(locale, result.input.country, result.meta.notes).map((note) => (
              <li key={note} className="type-meta flex gap-[var(--space-related)] text-ink-muted">
                <span className="mt-[var(--space-tight)] size-1 shrink-0 rounded-full bg-ink-subtle" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
          </ul>
          <p className="type-meta text-ink-subtle">
            {t("simplifications")}{" "}
            <code className="rounded-xs bg-surface-sunken px-[var(--space-tight)] py-[var(--space-hairline)] font-mono text-[0.6875rem]">
              docs/06-simplifications.md
            </code>
            .
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-line border-t border-line md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="card-header flex flex-col gap-[var(--space-control)]">
          <h3 className="type-eyebrow">{t("precision")}</h3>
          <p className="type-meta text-ink-muted">
            {t("precisionBody")}
          </p>
          <p className="type-meta text-ink-muted">
            {t("deterministic")}
          </p>
        </div>

        <div className="card-header flex flex-col gap-[var(--space-control)]">
          <h3 className="type-eyebrow">{t("confidenceLevels")}</h3>
          <dl className="flex flex-col gap-[var(--space-related)]">
            <TierRow tier="verified" text={t("verifiedTierHelp")} />
            <TierRow tier="supported" text={t("supportedTierHelp")} />
            <TierRow tier="experimental" text={t("experimentalTierHelp")} />
          </dl>
          <p className="type-meta text-ink-muted">
            {t("weakestConfidence")}
            {weakest.length > 0 ? (
              <>
                {" "}
                ({weakest.length}/{rules.length}):{" "}
                <span className="text-ink">{weakest.map((rule) => localizeDomainText(locale, rule.label)).join(", ")}</span>.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {entry ? (
        <p className="card-footer type-meta border-t border-line bg-surface-sunken text-ink-subtle">
          {t("countryResearch")}:{" "}
          <code className="rounded-xs bg-surface px-[var(--space-tight)] py-[var(--space-hairline)] font-mono">
            docs/countries/{entry.code}/README.md
          </code>
        </p>
      ) : null}
    </section>
  );
}

function TierRow({ tier, text }: { tier: "verified" | "supported" | "experimental"; text: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[var(--space-related)] gap-y-[var(--space-label)]">
      <dt className="shrink-0">
        <ConfidenceBadge tier={tier} size="sm" />
      </dt>
      <dd className="type-meta min-w-0 flex-1 text-ink-muted">{text}</dd>
    </div>
  );
}

/** "8 agosto 2026" — a date a reader parses, not an ISO string. */
function formatDate(iso: string, localeTag: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
