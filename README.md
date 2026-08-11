# Payroll Intelligence

A deterministic gross-to-net and employer-cost calculator for Italy, Germany, Spain and
France. It gives individuals and organisations the same view of a compensation scenario:
net pay, payroll deductions, employer charges, total employment cost and the rules behind
each amount.

The application is a full-year payroll projection for the 2026 tax year. Its public country
catalogue matches the engines that can actually calculate a result; unsupported countries,
years and profiles are rejected instead of being approximated.

## What it provides

- Live gross-to-net calculations with no submit step.
- Net per pay period, annual net and twelve-month equivalent.
- Employer cost, cost-to-gross ratio and tax wedge.
- Employee deductions and employer charges grouped by purpose.
- Rule-level formulas, legal or administrative sources and verification dates.
- Explicit confidence levels and a documented register of simplifications.
- Country-specific inputs that only appear when the selected calculation requires them.
- Responsive single-scroll UI in Italian, English, German, French and Spanish.
- JSON calculation and health endpoints for integration and operations.

## Why the model is different

The engine treats payroll as versioned arithmetic under law rather than a collection of UI
formulas:

- Money is represented in integer cents.
- Rounding is applied at the step defined by the relevant rule.
- Tax brackets, capped rates and tapered credits are shared primitives.
- Country rules are dated data; adapters define each country's inputs and calculation flow.
- Every output line references the rule that produced it.
- The result inherits the lowest confidence level among the rules it uses.
- Identical inputs and rule versions produce identical outputs.
- Missing or impossible inputs fail at the boundary instead of falling back silently.

This structure keeps the calculation engine framework-independent and makes legal changes
reviewable as rule and output diffs rather than opaque UI edits.

## Current coverage

| Country | Employee side | Employer side | Important boundary |
| --- | --- | --- | --- |
| Italy | INPS, IRPEF, deductions, regional and municipal surtaxes | INPS, INAIL, TFR and contractual funds | IVS ceiling applicability must be confirmed above €122,295 |
| Germany | Social insurance and modelled BMF wage-tax classes | Social insurance and declared company rates | Classes V/VI and private health insurance are outside the current model |
| Spain | Social security and employer-supplied AEAT withholding | Social security and declared AT/EP rate | Annual IRPF estimate is explanatory and separate from payroll withholding |
| France | Employee contributions and declared PAS withholding | Employer contributions, AT/MP and declared mobility rate | Final 2026 income-tax parameters remain subject to year-end legislation |

Country documentation, sources and model limits are available in [`docs/`](docs/README.md).

## Product workflow

1. Select a country and enter annual gross compensation.
2. Complete only the profile and employer parameters required for that country.
3. Review the live net-pay and employer-cost summary.
4. Open any line to inspect its base, formula, rule identifier and source.
5. Use **Method and sources** to review scope, confidence and exclusions.

The calculator does not generate tax filings, contribution reports or a legally transmissible
payslip. Operational use requires verifying the rule date and supplying the exact company-level
rates requested by the selected country model.

## Architecture

```text
src/engine/       money types, shared primitives, pipeline and public contracts
src/countries/    country adapters, dated rules, fixtures and calculation modules
src/app/          responsive product UI, API routes and localization
e2e/              browser, accessibility, veracity and responsive behaviour tests
docs/             methodology, country scope, sources and operational guidance
```

Adding a country means adding its rules, adapter, inputs, official fixtures, adversarial tests
and catalogue entry. The shared engine does not contain country switches.

## Run locally

Requirements: Node `22.x` and npm `10.x` (the repository pins npm `10.9.7`).

```bash
npm ci --ignore-scripts
npm run dev
```

Open `http://localhost:3000`.

## Vercel

The repository is ready for Vercel's Next.js preset. `vercel.json` keeps installation
reproducible with `npm ci --ignore-scripts`; no custom Build Command or Output Directory is
required. Keep Node.js `22.x` selected and enable **Automatically expose System Environment
Variables** so `VERCEL_GIT_COMMIT_SHA` becomes the release identity shown by the app and API.

## Verification

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run rules:matrix
```

`rules:matrix` produces a deterministic multi-country output matrix for numerical review. CI
also verifies type safety, unit and browser tests, the production build, dependency security
and immutable container output.

## Container and operations

```bash
docker compose up --build
curl http://localhost:3000/api/health
```

Build identity is exposed in the UI, API result and response headers. Application logs use a
closed metadata-only schema and exclude salary or profile values. Browser profile state is
tab-scoped and is not persisted in the URL.

See the [operations runbook](docs/operations/runbook.md), [privacy boundary](docs/privacy.md),
[contribution guide](CONTRIBUTING.md) and [security policy](SECURITY.md).
