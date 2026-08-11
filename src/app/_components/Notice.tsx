/**
 * Warnings the user must see before they trust the number: a validation issue,
 * or a cliff they are standing next to.
 *
 * The Milan case is why this exists. Taxable income of EUR 23,000 pays no
 * municipal surtax and EUR 23,001 pays EUR 184.01 on the whole base, so an
 * employee near the threshold can earn a euro more and take home EUR 183 less.
 * Unexplained, that reads as a broken calculator rather than as the law.
 */

export function Notice({
  tone = "warn",
  title,
  children,
  testId,
}: {
  tone?: "warn" | "info";
  title: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const styles =
    tone === "warn"
      ? "border-warn-border bg-warn-soft text-warn"
      : "border-line bg-surface-sunken text-ink-muted";

  return (
    <div
      data-testid={testId}
      role="note"
      className={`notice-panel flex rounded-xl border ${styles}`}
    >
      <svg viewBox="0 0 16 16" className="mt-[var(--space-hairline)] size-4 shrink-0" fill="currentColor" aria-hidden>
        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 4.5h1.5v5h-1.5v-5zm0 6.25h1.5v1.5h-1.5v-1.5z" />
      </svg>
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="font-semibold">{title}</p>
        <div className="mt-[var(--space-hairline)] opacity-90">{children}</div>
      </div>
    </div>
  );
}
