"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supportedCountries } from "@engine/adapter/registry.ts";
import { PROFILE_STORAGE_KEY } from "../_lib/application.ts";
import { computePageState } from "../_lib/calculate.ts";
import { euro } from "../_lib/format.ts";
import { localizeInput, message, type Locale } from "../_lib/i18n.ts";
import { paramNameOf } from "../_lib/fields.ts";
import { formValuesOf, grossIssue, profileFromParams } from "../_lib/profile.ts";
import { AppShell } from "./AppShell.tsx";
import { Breakdown } from "./Breakdown.tsx";
import { EmployerCost } from "./EmployerCost.tsx";
import { EmptyResult } from "./EmptyResult.tsx";
import { Methodology } from "./Methodology.tsx";
import { Notice } from "./Notice.tsx";
import { PreferenceDock } from "./PreferenceDock.tsx";
import { ProfileForm } from "./ProfileForm.tsx";
import { Provenance } from "./Provenance.tsx";
import { RatesPanel } from "./RatesPanel.tsx";
import { ResultSummary } from "./ResultSummary.tsx";
import { I18nProvider } from "./I18nProvider.tsx";

/**
 * The calculator, live.
 *
 * **Why the figure updates as you type.** The engine is integer arithmetic
 * running in this bundle: a full four-country calculation is sub-millisecond,
 * so there is no round trip to wait for and a spinner or explicit submit action
 * would be theatre. Recomputing on every change removes the stale-result
 * problem entirely: the result can never disagree with the inputs above it.
 *
 * The same update is exposed through one polite live region. Keyboard and
 * screen-reader users therefore receive the new net figure without needing a
 * separate action that sighted pointer users do not need.
 *
 * Profile fields stay in tab-scoped session storage, never in the URL where
 * browser history, reverse proxies and referrers could retain salary data.
 */
export function Calculator({
  initialRaw,
  initialLocale,
  hasExplicitProfile,
}: {
  initialRaw: Record<string, string>;
  initialLocale: Locale;
  hasExplicitProfile: boolean;
}) {
  const [raw, setRaw] = useState(initialRaw);
  const [locale, setLocale] = useState(initialLocale);
  const acceptsFieldChanges = useRef(hasExplicitProfile);
  const supported = useMemo(() => supportedCountries(), []);

  const profile = useMemo(() => profileFromParams(raw), [raw]);
  const page = useMemo(() => computePageState(profile), [profile]);
  const issue = grossIssue(raw, locale);
  const t = (key: Parameters<typeof message>[1], vars?: Record<string, string | number>) =>
    message(locale, key, vars);

  // The form shows what was TYPED, not what the engine was given. The two differ by
  // design: the profile clamps an empty or impossible gross so the engine keeps
  // its guarantee of totality, while the field keeps the user's own characters.
  const formValues = useMemo(
    () => ({ ...formValuesOf(profile), ...(raw["gross"] !== undefined ? { gross: raw["gross"] } : {}) }),
    [profile, raw],
  );

  useLayoutEffect(() => {
    if (hasExplicitProfile) {
      window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(initialRaw));
      return;
    }
    acceptsFieldChanges.current = false;
    const stored = storedProfile(window.sessionStorage.getItem(PROFILE_STORAGE_KEY));
    if (stored) setRaw(stored);
    // Some controlled select primitives announce their mounted value. Those
    // callbacks must not be mistaken for user input while the stored profile is
    // replacing the server-rendered default.
    const enableChanges = window.requestAnimationFrame(() => {
      acceptsFieldChanges.current = true;
    });
    return () => window.cancelAnimationFrame(enableChanges);
  }, [hasExplicitProfile]);

  useEffect(() => {
    const params = new URLSearchParams({ lang: locale });
    window.history.replaceState(null, "", `?${params.toString()}`);
    document.documentElement.lang = locale;
    document.title = t("grossToNet");
  }, [locale]);

  function handleFieldChange(field: string, value: string) {
    if (!acceptsFieldChanges.current) return;
    // Round-tripping through the profile is the whole cascade mechanism: any
    // value the adapter no longer offers (a CCNL level that does not exist in
    // the newly chosen agreement, an Italian comune after switching to Spain)
    // comes back as that field's declared default. No country-specific branch,
    // and switching country cannot leave a stale field behind.
    const next = { ...raw, [field]: value };
    const sanitised = formValuesOf(profileFromParams(next));
    // The raw gross is kept verbatim: an in-progress or empty entry must not
    // be rewritten under the cursor. The profile clamps it for the engine,
    // the interface reports it as an error.
    const committed = field === "gross" ? { ...sanitised, gross: value } : sanitised;
    window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(committed));
    setRaw(committed);
  }

  const { entry, available, adapter, validation, result, threshold, thresholdLabel, nearCliff } =
    page;
  const announcement =
    result && !issue
      ? t("resultAnnouncement", {
          period: euro(result.employee.netPerPayPeriod, locale),
          annual: euro(result.employee.netAnnual, locale),
        })
      : t("noResultAnnouncement");

  return (
    <I18nProvider locale={locale}>
      <AppShell
        preferences={<PreferenceDock locale={locale} onLocaleChange={setLocale} />}
        parameters={
          <ProfileForm
            country={profile.country}
            inputs={adapter?.requiredInputs(profile) ?? []}
            values={formValues}
            supported={supported}
            taxYear={profile.taxYear}
            {...(issue ? { grossError: issue } : {})}
            onFieldChange={handleFieldChange}
            locale={locale}
          />
        }
      >
        {/* A single compact announcement follows the same live calculation as
          the visible result, without moving focus on every keystroke. */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </p>

        <div className="result-stack scroll-mt-[var(--space-anchor)]">
          {validation && validation.issues.length > 0 ? (
            <Notice
              testId="validation-notice"
              tone={validation.ok ? "info" : "warn"}
              title={validation.ok ? t("validationInfo") : t("validationError")}
            >
              <ul className="flex flex-col gap-[var(--space-hairline)]">
                {validation.issues.map((item) => (
                  <li key={`${item.field}-${item.message}`}>{item.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          {available && issue ? <EmptyResult message={issue} /> : null}

          {result && !issue ? (
            <>
              <ResultSummary result={result} />

              {nearCliff && threshold ? (
                <Notice testId="cliff-notice" title={t("nearThreshold", { label: thresholdLabel ?? "" })}>
                  {t("thresholdBody", {
                    threshold: euro(threshold, locale),
                    taxable: euro(result.employee.taxableIncome, locale),
                  })}
                </Notice>
              ) : null}

              <Breakdown result={result} />
              <RatesPanel result={result} />
              <EmployerCost result={result} />
              <Methodology result={result} entry={entry} />
              <Provenance result={result} />
            </>
          ) : null}
        </div>

        <footer className="type-meta border-t border-line pt-[var(--space-content)] text-ink-subtle">
          <p>
            {t("footer")} {available && adapter ? <>{t("profile")}: {profileSummary(adapter, profile, locale)}. </> : null}
            {t("simplificationsDocumented")}{" "}
            <code className="font-mono">docs/06-simplifications.md</code>.
          </p>
        </footer>
      </AppShell>
    </I18nProvider>
  );
}

function storedProfile(serialized: string | null): Record<string, string> | undefined {
  if (!serialized || serialized.length > 16_384) return undefined;
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
    const entries = Object.entries(candidate);
    if (entries.length > 64 || entries.some(([, value]) => typeof value !== "string" || value.length > 256)) {
      return undefined;
    }
    return Object.fromEntries(entries) as Record<string, string>;
  } catch {
    return undefined;
  }
}

/**
 * The selected options in one line, read back from the adapter's own
 * descriptors — so a German profile reads "Steuerklasse I, Berlin" without this
 * component knowing that either exists.
 */
function profileSummary(
  adapter: NonNullable<ReturnType<typeof computePageState>["adapter"]>,
  profile: Parameters<typeof formValuesOf>[0],
  locale: Locale,
): string {
  const values = formValuesOf(profile);
  return adapter
    .requiredInputs(profile)
    .filter((input) => !input.hidden)
    .map((input) => localizeInput(locale, profile.country, input))
    // Advanced parameters are excluded: they are defaults the user did not
    // choose, and listing them here would bury the two or three that matter.
    .filter((input) => !input.advanced && input.kind === "select" && input.options)
    .map((input) => {
      const value = values[paramNameOf(input.field)];
      const option = input.options?.find((candidate) => candidate.value === value);
      return option ? (input.shortLabel ? `${input.shortLabel} ${option.label}` : option.label) : undefined;
    })
    .filter((label): label is string => Boolean(label))
    .join(", ");
}
