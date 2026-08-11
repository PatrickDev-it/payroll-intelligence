import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { RELEASE_HEADER } from "./application.ts";

const RELEASE_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const candidate = process.env.NEXT_PUBLIC_PAYROLL_RELEASE;

/** Immutable deployment identity, inlined from CI or the hosting provider at build time. */
export const RELEASE_ID = candidate && RELEASE_PATTERN.test(candidate) ? candidate : "local";

export type ReleasedCalculation = PayrollCalculation & {
  readonly meta: PayrollCalculation["meta"] & { readonly releaseId: string };
};

/** Deployment metadata is attached outside the framework-free payroll engine. */
export function attachRelease(result: PayrollCalculation): ReleasedCalculation {
  return { ...result, meta: { ...result.meta, releaseId: RELEASE_ID } };
}

export function releaseHeaders(requestId?: string): Record<string, string> {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    [RELEASE_HEADER]: RELEASE_ID,
    ...(requestId ? { "X-Request-ID": requestId } : {}),
  };
}
