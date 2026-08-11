# Privacy and data flow

## Classification

Gross compensation, geography, family status, religion-related tax choices and employer-specific
rates may be personal or confidential business data. Treat a complete profile as confidential
even when it does not contain a name.

## Browser

The calculator runs locally in the browser. The active profile is stored in `sessionStorage`
under `payroll.profile.v1`, scoped to the current origin and tab. It is removed when the tab's
session is discarded. New interactions write only the interface language to the URL.

Legacy query links are accepted for compatibility, then the visible URL is immediately reduced
to `?lang=`. Do not use legacy profile URLs for real employee data.

## Server API

`POST /api/calculate` accepts a profile in the request body. The application does not persist
the request and emits only request id, release id, country, tax year, duration, status and
outcome. Gross salary and profile fields are excluded from the logger's type.

Infrastructure must also redact bodies and query strings. Application redaction cannot control
CDN, reverse-proxy, browser-extension or third-party APM defaults.

## Retention

The application has no database and defines no server-side profile retention. CI fixtures are
synthetic. Operational metadata retention belongs to the deployment platform and should be
documented before production, with the shortest period compatible with incident response.

## Sharing and support

Support reproductions must use synthetic profiles. If a real case is unavoidable, transfer it
through an approved encrypted channel and delete it under the organization's retention policy.
Never paste tokens or profiles into GitHub issues, chat transcripts or CI variables.
