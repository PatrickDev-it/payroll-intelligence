"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_TAG, message, type Locale } from "../_lib/i18n.ts";

type I18nValue = {
  locale: Locale;
  localeTag: string;
  t: (key: Parameters<typeof message>[1], vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ locale, localeTag: LOCALE_TAG[locale], t: (key, vars) => message(locale, key, vars) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
