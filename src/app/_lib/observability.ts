import "server-only";
import { SERVICE_NAME } from "./application.ts";
import { RELEASE_ID } from "./release.ts";

type RequestOutcome =
  | "success"
  | "malformed_json"
  | "payload_too_large"
  | "invalid_request"
  | "country_not_implemented"
  | "tax_year_not_available"
  | "invalid_profile"
  | "unexpected_error";

export type CalculationRequestEvent = {
  readonly event: "calculation_request";
  readonly requestId: string;
  readonly outcome: RequestOutcome;
  readonly status: number;
  readonly durationMs: number;
  readonly country?: string;
  readonly taxYear?: number;
  readonly errorName?: string;
};

export type HealthEvent = {
  readonly event: "health_canary";
  readonly status: "ok" | "degraded";
  readonly durationMs: number;
  readonly failedCountries?: readonly string[];
  readonly errorName?: string;
};

/**
 * JSON logs with an intentionally closed schema. Salary and profile fields
 * cannot be passed without changing this type in review.
 */
export function writeAuditEvent(event: CalculationRequestEvent | HealthEvent): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    releaseId: RELEASE_ID,
    ...event,
  });
  if (
    (event.event === "calculation_request" && event.outcome === "unexpected_error") ||
    (event.event === "health_canary" && event.status === "degraded")
  ) {
    console.error(record);
  } else {
    console.info(record);
  }
}
