# `src/app/` — the web layer

**Empty on purpose.** This is a placeholder, not scaffolding that half-works.

Next.js is not yet a dependency: everything shipped so far compiles and passes
tests with TypeScript and Vitest alone, and adding a framework before there is a
result to render would have meant claiming a web layer that does not run.

## What goes here

The App Router tree, once the Italian `calculate()` is implemented and its five
fixtures pass:

```
src/app/
├── layout.tsx
├── page.tsx                   the calculator
├── api/calculate/route.ts     POST profile -> PayrollCalculation
└── _components/
    ├── ProfileForm.tsx        built from adapter.requiredInputs() — no country logic
    ├── Breakdown.tsx          the signed CalculationLine tree
    ├── ExplainDrawer.tsx      one line's derivation, rules and sources
    ├── EmployerCost.tsx       total cost, cost/gross, tax wedge
    └── ConfidenceBadge.tsx    the tier, in the words of CONFIDENCE_LABEL
```

## The rules this layer inherits

- **Render only what the adapter declares.** The form is generated from
  `requiredInputs()`. A conditional on `country` in a component is the same
  mistake as one in the engine.
- **The breakdown is the product**, not the net figure. Every line drills through
  to its rule, its source and the date it was last verified.
- **Show the tier.** `CONFIDENCE_LABEL` has the wording; never soften
  "Experimental — indicative only".
- **Show the marginal rate**, not only the effective one. At €45,000 in Italy the
  two are 24 % and 49 %, and only the second answers "what do I keep from a raise?".
- **Warn near a cliff.** Taxable income close to Milan's €23,000 threshold is a
  real discontinuity; unexplained, it reads as a broken tool.

Full guidance: [`practices/interface-and-explanation.md`](../../practices/interface-and-explanation.md).

## The boundary

`src/engine/` must never import from here. That direction is enforced by
[`src/engine/boundary.test.ts`](../engine/boundary.test.ts) — countries and the
web layer import the engine; the engine imports neither.
