"use client";

import { useI18n } from "./I18nProvider.tsx";

/**
 * What the results column shows when there is nothing honest to put in it.
 *
 * Not a blank area and not a stale figure left over from the last valid input:
 * a calculator that keeps showing €2.145 while the salary field is empty is
 * asserting something it cannot support. The state says what is missing and
 * what to do about it, and nothing else.
 */
export function EmptyResult({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <section
      data-testid="empty-result"
      aria-labelledby="empty-result-title"
      className="empty-panel rounded-xl border border-dashed border-line-strong bg-surface text-center"
    >
      <h2 id="empty-result-title" className="type-title text-ink">
        {t("emptyTitle")}
      </h2>
      <p className="type-body mx-auto mt-[var(--space-tight)] max-w-md text-ink-muted">{message}</p>
    </section>
  );
}
