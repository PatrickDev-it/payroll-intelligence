## Change

Describe the user or operational outcome and its blast radius.

## Evidence

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] Relevant Playwright projects
- [ ] No salary, profile or token was added to logs, URLs or fixtures

## Payroll truth gate

Complete when engine, adapter, rule or country documentation changes.

- [ ] Primary source and effective date recorded
- [ ] Rule confidence remains honest
- [ ] Boundary immediately below/at/above the change is covered
- [ ] CI payroll-output diff reviewed, including unchanged countries
- [ ] Previous tax-year calculation remains available or exclusion is documented

## Release

- [ ] Rollback digest or predecessor identified
- [ ] Post-deploy canary to inspect: `/api/health`
