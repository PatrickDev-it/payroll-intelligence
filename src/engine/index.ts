/**
 * The engine's public surface.
 *
 * Framework-agnostic by construction: nothing under src/engine/ imports React,
 * next/*, or anything from src/app/. That boundary is checked by a test
 * (boundary.test.ts), not merely intended — it is what lets this directory move
 * to a worker, a Fastify service or another repo without a formula changing.
 */

export { ENGINE_VERSION } from "./version.ts";

// Money
export type { Currency, Money, Precise, Rate, Rounding } from "./money/money.ts";
export {
  CurrencyMismatchError,
  InvalidRateError,
  add,
  applyRate,
  clampAtZero,
  compare,
  equals,
  format,
  fromCents,
  isNegative,
  isZero,
  max,
  min,
  money,
  moneyFromDecimal,
  negate,
  rate,
  ratePercent,
  roundToUnit,
  subtract,
  sum,
  toMajorNumber,
  toMoney,
  toPrecise,
  zero,
} from "./money/money.ts";

// Model
export type { ConfidenceTier } from "./model/confidence.ts";
export { CONFIDENCE_LABEL, CONFIDENCE_TIERS, isAtLeast, lowestConfidence } from "./model/confidence.ts";
export type {
  CalculationLine,
  CalculationMeta,
  EmployeeResult,
  EmployerResult,
  PayrollCalculation,
  Rates,
} from "./model/calculation.ts";
export { UncitedLineError, allLines, assertCitable } from "./model/calculation.ts";
export type {
  ContractType,
  Dependants,
  EUCountry,
  EmployeeProfile,
  EmploymentType,
  InputDescriptor,
  InputGroup,
  ValidationIssue,
  ValidationResult,
} from "./model/employee-profile.ts";
export { EU_COUNTRIES, currencyOf, invalid, valid } from "./model/employee-profile.ts";
export type { IsoDate, Rule, RuleBasis, RuleId, RuleRef, RuleSet, RuleSource, RuleVerification } from "./model/rule.ts";
export { isEffectiveOn, toRuleRef } from "./model/rule.ts";

// Primitives
export * from "./primitives/index.ts";

// Adapters
export type { CountryPayrollAdapter, Explanation } from "./adapter/contract.ts";
export type { RuleSetLoader } from "./adapter/registry.ts";
export {
  clearRegistry,
  isSupported,
  registerAdapter,
  resolveAdapter,
  resolveRuleSet,
  supportedCountries,
} from "./adapter/registry.ts";

// Rule data
export { RuleSetValidationError, parseRuleSet, ruleSetSchema } from "./rules/schema.ts";

// Pipeline
export type { Applied, ApplyOptions, Sign } from "./pipeline/helpers.ts";
export { applyRule, derivedLine, formulaParam, ruleOf } from "./pipeline/helpers.ts";
export type { Assembly, EmployeeComputation, EmployerComputation } from "./pipeline/assemble.ts";
export { assembleCalculation, reconciles, withheld } from "./pipeline/assemble.ts";
export { explainLine } from "./pipeline/explain.ts";

// Errors
export {
  EngineError,
  InvalidProfileError,
  MissingRuleError,
  MissingRuleSetError,
  NotImplementedError,
  UnsupportedCountryError,
} from "./errors.ts";
