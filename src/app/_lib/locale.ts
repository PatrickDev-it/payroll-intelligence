export const LOCALES = ["it", "en", "de", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_TAG: Record<Locale, string> = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

export function localeFrom(value: string | string[] | null | undefined): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return LOCALES.includes(candidate as Locale) ? (candidate as Locale) : "it";
}
