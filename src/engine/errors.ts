/**
 * Typed failures.
 *
 * The distinction that matters: "not supported" is an expected, documented
 * state with its own response — a future adapter may be absent without making
 * the registry inconsistent. An error is something that
 * should not have happened. Collapsing the two makes the honest case look like
 * a crash and the crash look routine.
 *
 * What none of these do is fall back. A silent substitution — last year's
 * brackets, a neighbouring region's rate, zero for a missing contribution —
 * produces a confident wrong number, and that is the one failure this product
 * cannot survive.
 */

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The country has no registered adapter. */
export class UnsupportedCountryError extends EngineError {
  constructor(
    readonly country: string,
    readonly supported: readonly string[],
  ) {
    super(
      `No adapter for ${country}. Implemented: ${supported.join(", ") || "(none)"}.`,
    );
  }
}

/** There is an adapter but no rule set for that year. Never fall back a year. */
export class MissingRuleSetError extends EngineError {
  constructor(
    readonly country: string,
    readonly taxYear: number,
    readonly available: readonly number[],
  ) {
    super(
      `No rule set for ${country} ${taxYear}. Available: ${available.join(", ") || "(none)"}. ` +
        `Refusing rather than reusing another year's parameters.`,
    );
  }
}

/** A rule the adapter asked for is not in the loaded set. */
export class MissingRuleError extends EngineError {
  constructor(
    readonly ruleId: string,
    readonly country: string,
    readonly taxYear: number,
  ) {
    super(`Rule "${ruleId}" is not in the ${country} ${taxYear} rule set.`);
  }
}

/** The profile cannot be computed — unknown region, impossible input. */
export class InvalidProfileError extends EngineError {
  constructor(readonly issues: readonly { field: string; message: string }[]) {
    super(
      `Profile rejected: ${issues.map((i) => `${i.field}: ${i.message}`).join("; ")}`,
    );
  }
}

/** Scaffolding that has a contract but no body yet. Loud on purpose. */
export class NotImplementedError extends EngineError {
  constructor(what: string) {
    super(`${what} is not implemented yet.`);
  }
}
