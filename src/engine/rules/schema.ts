/**
 * Rule data is validated at load, not trusted. Shared by every country: the
 * nine primitive shapes, the source block and the verification block are the
 * engine's vocabulary, not any one jurisdiction's.
 *
 * The schema is deliberately strict about two things the rest of the system
 * depends on: every numeric value is an exact DECIMAL STRING (so no threshold
 * arrives already approximated by IEEE 754), and every rule carries a source
 * and a verification status (so no value can enter the engine anonymously).
 */

import { z } from "zod";
import type { Rule, RuleSet } from "../model/rule.ts";

const DECIMAL = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "must be an exact decimal string, e.g. \"0.0919\"");

const band = z.object({
  from: DECIMAL,
  to: DECIMAL.nullable(),
  rate: DECIMAL,
});

const taperSegment = z.object({
  from: DECIMAL,
  to: DECIMAL.nullable(),
  max: DECIMAL,
  floor: DECIMAL,
});

const primitiveConfig = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("progressive_brackets"), brackets: z.array(band).min(1) }),
  z.object({ kind: z.literal("flat_rate"), rate: DECIMAL }),
  z.object({ kind: z.literal("capped_rate"), rate: DECIMAL, ceiling: DECIMAL }),
  z.object({ kind: z.literal("floored_rate"), rate: DECIMAL, floor: DECIMAL }),
  z.object({ kind: z.literal("banded_rate"), bands: z.array(band).min(1) }),
  z.object({ kind: z.literal("tapered_credit"), segments: z.array(taperSegment).min(1) }),
  z.object({ kind: z.literal("threshold_exemption"), threshold: DECIMAL, rate: DECIMAL }),
  z.object({
    kind: z.literal("lookup_table"),
    valueKind: z.enum(["rate", "amount"]),
    entries: z.record(DECIMAL),
    defaultKey: z.string().optional(),
  }),
  z.object({
    kind: z.literal("formula"),
    formulaId: z.string().min(1),
    params: z.record(DECIMAL),
  }),
]);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

const ruleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  basis: z.enum([
    "gross",
    "social_security_base",
    "taxable_income",
    "total_income",
    "gross_tax",
    "employment_income",
  ]),
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable(),
  config: primitiveConfig,
  source: z.object({
    authority: z.string().min(1),
    type: z.enum(["legislation", "authority_publication", "collective_agreement", "secondary"]),
    document: z.string().min(1),
    article: z.string().optional(),
    url: z.string().url().optional(),
  }),
  verification: z.object({
    status: z.enum(["experimental", "supported", "verified"]),
    verifiedAt: isoDate.optional(),
    method: z.string().optional(),
    crossCheckedAgainst: z.array(z.string()).optional(),
  }),
  version: z.number().int().positive(),
  supersedes: z.string().optional(),
});

export const ruleSetSchema = z.object({
  country: z.string().length(2),
  taxYear: z.number().int(),
  version: z.string().min(1),
  rules: z.record(ruleSchema),
});

export class RuleSetValidationError extends Error {
  constructor(country: string, taxYear: number, issues: string) {
    super(`Rule set ${country} ${taxYear} failed validation:\n${issues}`);
    this.name = "RuleSetValidationError";
  }
}

/**
 * Parse and freeze. `country` and `taxYear` live once at the set level and are
 * stamped onto each rule here, so the data file cannot disagree with itself.
 */
export function parseRuleSet(raw: unknown): RuleSet {
  const parsed = ruleSetSchema.safeParse(raw);
  if (!parsed.success) {
    const preview = raw as { country?: string; taxYear?: number };
    throw new RuleSetValidationError(
      preview.country ?? "??",
      preview.taxYear ?? 0,
      parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }

  const { country, taxYear, version, rules } = parsed.data;
  const stamped: Record<string, Rule> = {};
  for (const [id, rule] of Object.entries(rules)) {
    stamped[id] = { ...rule, country, taxYear } as Rule;
  }
  return Object.freeze({ country, taxYear, version, rules: Object.freeze(stamped) });
}
