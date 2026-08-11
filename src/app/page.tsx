import { Calculator } from "./_components/Calculator.tsx";
import { formValuesOf, profileFromParams, type RawParams } from "./_lib/profile.ts";
import { localeFrom } from "./_lib/i18n.ts";

/**
 * Server entry point. Reads the URL once, for the first paint and for
 * JavaScript-disabled visitors — every recalculation after that happens in
 * the browser, inside `Calculator`. See `_lib/calculate.ts` for why the two
 * share one computation function rather than growing apart.
 */
export default async function Home({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;

  // The RAW gross is preserved rather than normalised. `profileFromParams`
  // clamps it so the engine always receives a valid profile, but "?gross=" must
  // still reach the interface as an EMPTY field — otherwise the server would
  // answer a question nobody asked with a €45.000 default and present it as the
  // user's own input.
  const raw = params["gross"];
  const rawGross = Array.isArray(raw) ? raw[0] : raw;
  const initialRaw = {
    ...formValuesOf(profileFromParams(params)),
    ...(rawGross !== undefined ? { gross: rawGross } : {}),
  };

  const hasExplicitProfile = Object.keys(params).some((key) => key !== "lang");
  return (
    <Calculator
      initialRaw={initialRaw}
      initialLocale={localeFrom(params["lang"])}
      hasExplicitProfile={hasExplicitProfile}
    />
  );
}
