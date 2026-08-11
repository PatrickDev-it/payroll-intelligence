import { NextResponse } from "next/server";
import { registerAllCountries } from "@countries/index.ts";
import { resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import { ENGINE_VERSION } from "@engine/version.ts";
import { SERVICE_NAME } from "../../_lib/application.ts";
import { profileFromParams } from "../../_lib/profile.ts";
import { RELEASE_ID, releaseHeaders } from "../../_lib/release.ts";
import { writeAuditEvent } from "../../_lib/observability.ts";

registerAllCountries();

const CANARIES = [
  { country: "IT", params: { country: "IT", gross: "45000" }, netAnnual: 3_003_441 },
  { country: "DE", params: { country: "DE", gross: "45000" }, netAnnual: 2_964_250 },
  {
    country: "ES",
    params: { country: "ES", gross: "45000", aeatWithholdingRate: "21.05" },
    netAnnual: 3_260_250,
  },
  { country: "FR", params: { country: "FR", gross: "45000" }, netAnnual: 3_255_381 },
] as const;

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const startedAt = performance.now();
  try {
    const checks = CANARIES.map((canary) => {
      const profile = profileFromParams(canary.params);
      const adapter = resolveAdapter(profile.country);
      const result = adapter.calculate(profile, resolveRuleSet(profile.country, profile.taxYear));
      return {
        country: canary.country,
        rulesetVersion: result.meta.rulesetVersion,
        ok: result.employee.netAnnual.cents === canary.netAnnual,
      };
    });
    const failedCountries = checks.filter((check) => !check.ok).map((check) => check.country);
    const status = failedCountries.length === 0 ? "ok" : "degraded";
    writeAuditEvent({
      event: "health_canary",
      status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      ...(failedCountries.length > 0 ? { failedCountries } : {}),
    });
    return NextResponse.json(
      { status, service: SERVICE_NAME, releaseId: RELEASE_ID, engineVersion: ENGINE_VERSION, checks },
      { status: status === "ok" ? 200 : 503, headers: releaseHeaders() },
    );
  } catch (error) {
    writeAuditEvent({
      event: "health_canary",
      status: "degraded",
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { status: "degraded", service: SERVICE_NAME, releaseId: RELEASE_ID },
      { status: 503, headers: releaseHeaders() },
    );
  }
}
