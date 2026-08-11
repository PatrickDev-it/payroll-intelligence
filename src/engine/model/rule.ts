/**
 * A rule is DATA: a legal parameter with its provenance and its validity dates.
 * Code holds the shapes (see ../primitives); this holds the values and where
 * they came from. A tax change is therefore a data commit whose diff a lawyer
 * can read.
 *
 * Schema of record: docs/00-methodology.md §2.
 */

import type { ConfidenceTier } from "./confidence.ts";
import type { PrimitiveConfig } from "../primitives/types.ts";

export type IsoDate = string; // YYYY-MM-DD

export type RuleId = string; // "IT.IRPEF.BRACKETS"

/**
 * What the rate applies TO. Required, and required to be explicit: the most
 * common wrong number in payroll is the right rate on the wrong base.
 */
export type RuleBasis =
  | "gross"
  | "social_security_base"
  | "taxable_income"
  | "total_income"
  | "gross_tax"
  | "employment_income";

export type RuleSource = {
  readonly authority: string;
  readonly type: "legislation" | "authority_publication" | "collective_agreement" | "secondary";
  readonly document: string;
  readonly article?: string;
  readonly url?: string;
};

export type RuleVerification = {
  readonly status: ConfidenceTier;
  readonly verifiedAt?: IsoDate;
  readonly method?: string;
  readonly crossCheckedAgainst?: readonly string[];
};

export type Rule = {
  readonly id: RuleId;
  readonly country: string;
  readonly taxYear: number;
  readonly label: string;
  readonly basis: RuleBasis;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
  readonly config: PrimitiveConfig;
  readonly source: RuleSource;
  readonly verification: RuleVerification;
  readonly version: number;
  readonly supersedes?: RuleId;
};

/** All rules for one (country, taxYear), addressable by id. */
export type RuleSet = {
  readonly country: string;
  readonly taxYear: number;
  readonly version: string;
  readonly rules: Readonly<Record<RuleId, Rule>>;
};

/** A citation carried on an output line, so the UI can explain it. */
export type RuleRef = {
  readonly id: RuleId;
  readonly label: string;
  readonly source: RuleSource;
  readonly confidence: ConfidenceTier;
  /**
   * When this parameter was last read from its source. Carried on the ref, not
   * looked up later, so the interface can answer "how old is this number?"
   * without reaching back into the rule set — and so the answer is the date of
   * THIS rule rather than of the file it happens to live in.
   */
  readonly verifiedAt?: IsoDate;
};

export function toRuleRef(rule: Rule): RuleRef {
  return {
    id: rule.id,
    label: rule.label,
    source: rule.source,
    confidence: rule.verification.status,
    ...(rule.verification.verifiedAt ? { verifiedAt: rule.verification.verifiedAt } : {}),
  };
}

/** True when `on` falls inside the rule's validity window. */
export function isEffectiveOn(rule: Rule, on: IsoDate): boolean {
  if (on < rule.effectiveFrom) return false;
  return rule.effectiveTo === null || on <= rule.effectiveTo;
}
