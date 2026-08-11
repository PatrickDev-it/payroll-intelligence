# Security policy

## Supported release

Only the latest immutable image digest published from `main` is supported. The mutable
`latest` tag is a convenience pointer, never a rollback identifier.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for this repository, or open a private draft security
advisory with the maintainers. Do not open a public issue containing credentials, salary data,
employee attributes or exploit details. Include the release SHA, endpoint, impact and a minimal
redacted reproduction.

Target response times:

- acknowledgement: 2 business days;
- initial severity and containment decision: 5 business days;
- critical exposure: immediate credential rotation or rollback.

## Data-handling boundary

The application does not require a database. Browser profile state is tab-scoped `sessionStorage`, not a
URL. API bodies may contain compensation data and must be excluded from access logs, traces and
error payload capture. Application audit events use a closed metadata-only schema.

Never commit `.env` files, tokens, profiles from real people or production request payloads.

## Deployment requirements

- terminate TLS at the platform edge;
- keep `/api/calculate` same-origin or protect it with the selected enterprise identity layer;
- configure distributed rate limiting at the gateway, not in process memory;
- retain immutable container digests and SBOMs;
- alert on `/api/health` failures and unexpected `5xx` responses;
- redact query strings and request bodies in proxy/APM configuration.

The repository supplies CSP, anti-framing, no-referrer and no-store headers. SSO, gateway rate
limits and an external telemetry exporter remain deployment-specific because no provider has
been selected.
