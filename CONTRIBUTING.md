# Contributing

The calculator handles money under law. A plausible result is not enough: every change must be
reproducible, reviewable and reversible.

## Local verification

Use Node and npm versions declared by `.node-version` and `packageManager`.

```bash
npm ci --ignore-scripts
npm run check
npm run build
npm run test:e2e
```

`npm run rules:matrix` exports the deterministic four-country review matrix used by CI.

## Pull requests

- Keep one behavioural change per PR.
- Name the affected countries, profiles and salary boundaries.
- Add a failing fixture before fixing a wrong number.
- Do not update a golden value without explaining the legal reason.
- Review the CI payroll-output diff even when the expected country is the only one changed.
- Do not put salary or profile data in URLs, logs, screenshots or issue descriptions.

## Rule changes

Every rule needs an effective date, basis, primary source, verification date, honest confidence
and boundary coverage. `verified` requires an official or independent calculator cross-check.
The previous tax year remains resolvable; rules are superseded rather than overwritten.

## Release

Only CI publishes images. The commit SHA and OCI digest are the release and rollback handles.
After promotion, verify `/api/health` and one named breakdown at €45,000 before closing the
change.
