/**
 * Country registration.
 *
 * One call, listing exactly what is implemented. The remaining member states
 * are documented in docs/countries/ but have no adapter, so resolveAdapter()
 * throws UnsupportedCountryError for them — a documented state, not a bug.
 */

import { registerGermany } from "./de/index.ts";
import { registerItaly } from "./it/index.ts";
import { registerFrance } from "./fr/index.ts";
import { registerSpain } from "./es/index.ts";

export function registerAllCountries(): void {
  registerItaly();
  registerGermany();
  registerSpain();
  registerFrance();
}

export { registerGermany } from "./de/index.ts";
export { registerItaly } from "./it/index.ts";
export { registerSpain } from "./es/index.ts";
export { registerFrance } from "./fr/index.ts";
