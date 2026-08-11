import type { ConfidenceTier } from "@engine/model/confidence.ts";
import { useI18n } from "./I18nProvider.tsx";

/**
 * Italian wording for the UI. The engine keeps the canonical English in
 * CONFIDENCE_LABEL for API consumers; what a person reads is presentation, and
 * presentation belongs here.
 */
/**
 * The tier, in the words the methodology fixed. "Experimental — indicative
 * only" is never softened: a result the user cannot tell apart from a verified
 * one is the failure this whole product is arranged to avoid.
 */

const STYLES: Record<ConfidenceTier, string> = {
  verified: "bg-accent-soft text-accent-ink border-accent/25",
  supported: "bg-surface-sunken text-ink-muted border-line-strong",
  experimental: "bg-warn-soft text-warn border-warn-border",
};

const DOT: Record<ConfidenceTier, string> = {
  verified: "bg-accent",
  supported: "bg-ink-subtle",
  experimental: "bg-warn",
};

export function ConfidenceBadge({
  tier,
  size = "md",
}: {
  tier: ConfidenceTier;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const label = {
    verified: t("confidenceVerified"),
    supported: t("confidenceSupported"),
    experimental: t("confidenceExperimental"),
  }[tier];
  const short = {
    verified: t("confidenceVerifiedShort"),
    supported: t("confidenceSupportedShort"),
    experimental: t("confidenceExperimentalShort"),
  }[tier];
  return (
    <span
      data-testid="confidence-badge"
      data-tier={tier}
      title={label}
      className={[
        "inline-flex shrink-0 items-center gap-[var(--space-tight)] rounded-full border font-medium whitespace-nowrap",
        size === "sm"
          ? "px-[var(--space-related)] py-[var(--space-hairline)] text-[11px]"
          : "px-[calc(var(--p)*2.5)] py-[var(--space-label)] text-xs",
        STYLES[tier],
      ].join(" ")}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${DOT[tier]}`} aria-hidden />
      {size === "sm" ? (
        <>
          {short}
          <span className="sr-only"> — {label}</span>
        </>
      ) : (
        <>
          {/* One element, two lengths: the full sentence needs ~230px, which on a
              390px header would push the title out. Responsive text rather than
              two badges, so there is still exactly one node to assert on. */}
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
          <span className="sr-only sm:hidden"> — {label}</span>
        </>
      )}
    </span>
  );
}
