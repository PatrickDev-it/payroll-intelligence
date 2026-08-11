"use client";

/**
 * The salary input. It is the one field the whole product turns on, so it gets
 * its own component rather than being a `<input type="number">` like the rest.
 *
 * Three decisions worth defending:
 *
 * 1. **`type="text"` with `inputMode="numeric"`, not `type="number"`.** A number
 *    input cannot display grouped thousands — and "45000" versus "45.000" is
 *    exactly the misreading this product exists to prevent. It also brings a
 *    spinner nobody wants on a salary, and silently swallows non-numeric input
 *    so the field can end up empty with no event fired. The trade is that ARIA
 *    has to say what the type no longer does: `role="spinbutton"` with
 *    `aria-valuemin`/`max`/`now`, which is what a screen reader announces.
 *
 * 2. **Formatting on every keystroke, with the caret pinned to the right.** The
 *    value is digits only; separators are presentation. Caret-preserving
 *    re-formatting mid-string is a well-known source of cursor jumps, so this
 *    only guarantees the common case — typing and deleting at the end — and
 *    accepts that an edit in the middle moves the caret to the end. Stated,
 *    rather than half-solved with a fragile selection heuristic.
 *
 * 3. **Bounds are enforced on blur, not while typing.** Clamping mid-keystroke
 *    means typing "5" into a field with a minimum of 1,000 rewrites it to
 *    "1.000" before the user reaches the second digit. The error message shows
 *    immediately; the correction waits until they have finished.
 */

import { useId } from "react";
import { LOCALE_TAG, type Locale } from "../_lib/i18n.ts";

export function formatGrouped(digits: string, locale: Locale = "it"): string {
  if (digits === "") return "";
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value)
    ? new Intl.NumberFormat(LOCALE_TAG[locale], { maximumFractionDigits: 0 }).format(value)
    : "";
}

/** Everything that is not a digit is a separator the user did not have to type. */
export function digitsOf(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function MoneyInput({
  id,
  value,
  onChange,
  min = 1,
  max = 1_000_000,
  invalid,
  describedBy,
  autoFocus,
  locale = "it",
}: {
  id: string;
  /** Digits only, no separators. */
  value: string;
  onChange: (digits: string) => void;
  min?: number | undefined;
  max?: number | undefined;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  autoFocus?: boolean | undefined;
  locale?: Locale | undefined;
}) {
  const symbolId = useId();
  const numeric = Number.parseInt(value, 10);

  return (
    <div className="relative">
      {/* The symbol trails the figure, as it does in every output on this page
          and on an Italian payslip. A leading € would be the only place in the
          product where the convention flips. */}
      <span
        id={symbolId}
        className="pointer-events-none absolute inset-y-0 right-[var(--space-control)] flex items-center text-base font-medium text-ink-subtle"
        aria-hidden
      >
        €
      </span>
      <input
        id={id}
        data-control="money"
        name={id.replace(/^field-/, "")}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        // The type no longer carries the semantics, so ARIA does.
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(numeric) ? numeric : undefined}
        aria-valuetext={Number.isFinite(numeric) ? `${formatGrouped(value, locale)} euro` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        autoFocus={autoFocus}
        value={formatGrouped(value, locale)}
        onChange={(event) => onChange(digitsOf(event.target.value))}
        onBlur={(event) => {
          const digits = digitsOf(event.target.value);
          if (digits === "") return;
          const parsed = Number.parseInt(digits, 10);
          const clamped = Math.min(max, Math.max(min, parsed));
          if (clamped !== parsed) onChange(String(clamped));
        }}
        onKeyDown={(event) => {
          // A salary field should still behave like a number field for the
          // keys people expect to work on one.
          const step = event.shiftKey ? 5_000 : 1_000;
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          const current = Number.parseInt(value, 10);
          const base = Number.isFinite(current) ? current : 0;
          const next = event.key === "ArrowUp" ? base + step : base - step;
          onChange(String(Math.min(max, Math.max(min, next))));
        }}
        className={[
          "tabular h-10 w-full min-w-0 rounded-md border bg-surface pr-[calc(var(--p)*12)] pl-[var(--space-control)]",
          "text-sm font-semibold tracking-tight text-ink",
          "transition-colors duration-150 focus:outline-none",
          invalid
            ? "border-danger focus:border-danger"
            : "border-line-strong hover:border-ink-subtle focus:border-accent",
        ].join(" ")}
      />
    </div>
  );
}
