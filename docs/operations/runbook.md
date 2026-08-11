# Operations runbook

## Release identity

Every production build uses the full Git commit SHA from `PAYROLL_RELEASE` or Vercel's
`VERCEL_GIT_COMMIT_SHA`. The UI, API response header `X-Payroll-Release`, API result
`meta.releaseId` and health response expose that identity.
The engine and rule-set versions answer different questions and must not be substituted for it.

## Health

`GET /api/health` executes one synthetic cent-level canary for IT, DE, ES and FR. Healthy is
HTTP 200 with every check `ok: true`; any mismatch or exception is HTTP 503. Monitor it at least
once per minute after deployment and periodically thereafter.

The Docker health check calls this same endpoint. A failed canary is a correctness incident,
not merely an availability warning.

## Release and rollback

1. Merge only after Quality, Browser E2E and Payroll output diff gates pass.
2. CI publishes `ghcr.io/<owner>/<repository>:sha-<commit>` plus an OCI digest.
3. Promote the digest tested in staging; never rebuild for production.
4. Verify `/api/health`, release SHA and the €45,000 reference breakdown.
5. Roll back by deploying the predecessor digest recorded in the last successful workflow.

Do not roll back only the rule file. Engine, UI and rules are one tested artifact even though
their versions remain independently visible.

## Incident triage

Start with request id, release id, country, tax year and error code. Do not request salary data
until metadata has ruled out a release-wide problem.

1. Check health canaries and `5xx` rate.
2. Compare the disputed release SHA and OCI digest with the deployment record.
3. Reproduce with a synthetic fixture on the same image digest.
4. Bisect contribution, taxable base, gross tax, credits and surtaxes.
5. If the first divergent stage is unknown, roll back before researching.
6. Add the reproduction as a failing fixture before a fix.

## Structured logs

`calculation_request` records outcome, status, duration, country and tax year. `health_canary`
records only failed countries. Unexpected errors include the error class but never its message,
request body or stack in the JSON event. The platform may capture stderr stacks separately only
if body and query capture are disabled.

## Platform responsibilities

Before production, the chosen platform must provide TLS, SSO where required, distributed rate
limiting, log retention, alert routing and secret management. In-process implementations are
deliberately absent because they would not coordinate across replicas.
