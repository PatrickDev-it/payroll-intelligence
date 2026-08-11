/**
 * POST /api/calculate — the engine over HTTP.
 *
 * The page does not need this: it renders server-side from the URL. The route
 * exists because the engine is a product surface in its own right, and because
 * the failure modes are worth exercising over a real transport — an unsupported
 * country and a missing tax year must come back as distinguishable, documented
 * states rather than as a 500.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import {
  InvalidProfileError,
  MissingRuleSetError,
  UnsupportedCountryError,
} from "@engine/errors.ts";
import { EU_COUNTRIES } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";
import { profileFromParams, type RawParams } from "../../_lib/profile.ts";
import { paramNameOf } from "../../_lib/fields.ts";
import { attachRelease, releaseHeaders } from "../../_lib/release.ts";
import { writeAuditEvent, type CalculationRequestEvent } from "../../_lib/observability.ts";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * The body is `country`, `taxYear`, `grossAnnual` and then whatever THAT
 * country's adapter declares — `region`, `steuerklasse`, `foyer`. The route
 * does not enumerate those: it hands the rest of the body to the same
 * descriptor-driven reader the page uses, so a new country needs no change
 * here. Anything the adapter does not recognise is ignored rather than
 * rejected, and anything it recognises but cannot accept comes back as an
 * `invalid_profile`.
 */
const requestSchema = z
  .object({
    country: z.enum(EU_COUNTRIES).default("IT"),
    taxYear: z.number().int().min(2000).max(2100).default(2026),
    grossAnnual: z.number().int().positive().max(100_000_000),
  })
  .passthrough();

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  let country: string | undefined;
  let taxYear: number | undefined;
  const finish = (
    response: NextResponse,
    outcome: CalculationRequestEvent["outcome"],
    errorName?: string,
  ): NextResponse => {
    for (const [name, value] of Object.entries(releaseHeaders(requestId))) {
      response.headers.set(name, value);
    }
    writeAuditEvent({
      event: "calculation_request",
      requestId,
      outcome,
      status: response.status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      ...(country ? { country } : {}),
      ...(taxYear ? { taxYear } : {}),
      ...(errorName ? { errorName } : {}),
    });
    return response;
  };

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return finish(problem(413, "payload_too_large", "Request body exceeds 64 KiB"), "payload_too_large");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return finish(problem(400, "malformed_json", "Request body is not valid JSON"), "malformed_json");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return finish(
      problem(400, "invalid_request", "Request failed validation", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
      "invalid_request",
    );
  }

  const input = parsed.data;
  country = input.country;
  taxYear = input.taxYear;

  const unknown = unknownRequestFields(input);
  if (unknown.length > 0) {
    return finish(
      problem(400, "invalid_request", "Request contains fields outside the country contract", {
        issues: unknown.map((field) => ({ path: field, message: "Unknown payroll input" })),
      }),
      "invalid_request",
    );
  }

  try {
    const adapter = resolveAdapter(input.country);
    const rules = resolveRuleSet(input.country, input.taxYear);

    const result = adapter.calculate(
      {
        ...profileFromParams(paramsOf(input)),
        taxYear: input.taxYear,
        grossAnnual: money(input.grossAnnual, "EUR"),
      },
      rules,
    );

    return finish(NextResponse.json(attachRelease(result)), "success");
  } catch (error) {
    // Each of these is a documented state, not a crash. Distinguishing them is
    // the point: "we do not model Hungary yet" is a different answer from
    // "something went wrong".
    if (error instanceof UnsupportedCountryError) {
      return finish(
        problem(501, "country_not_implemented", error.message, { supported: error.supported }),
        "country_not_implemented",
      );
    }
    if (error instanceof MissingRuleSetError) {
      return finish(
        problem(422, "tax_year_not_available", error.message, { available: error.available }),
        "tax_year_not_available",
      );
    }
    if (error instanceof InvalidProfileError) {
      return finish(
        problem(422, "invalid_profile", error.message, {
          issues: error.issues,
          expectedInputs: adapterInputs(input.country),
        }),
        "invalid_profile",
      );
    }
    return finish(
      problem(500, "internal_error", `Unexpected calculation failure. Reference: ${requestId}`),
      "unexpected_error",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

function unknownRequestFields(input: Record<string, unknown>): string[] {
  const allowed = new Set(["country", "taxYear", "grossAnnual"]);
  for (const descriptor of resolveAdapter(input["country"] as (typeof EU_COUNTRIES)[number]).requiredInputs()) {
    if (descriptor.field !== "grossAnnual") allowed.add(paramNameOf(descriptor.field));
  }
  return Object.keys(input).filter((field) => !allowed.has(field));
}

function problem(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

/** The JSON body as the search-param shape the descriptor reader expects. */
function paramsOf(input: Record<string, unknown>): RawParams {
  const params: RawParams = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) params[key] = String(value);
  }
  params["gross"] = String(input["grossAnnual"]);
  return params;
}

/** What this country actually accepts — returned with a rejection, not guessed at. */
function adapterInputs(country: (typeof EU_COUNTRIES)[number]): unknown {
  return resolveAdapter(country)
    .requiredInputs()
    .map((descriptor) => ({
      field: descriptor.field,
      kind: descriptor.kind,
      required: descriptor.required,
      ...(descriptor.options ? { options: descriptor.options.map((o) => o.value) } : {}),
    }));
}
