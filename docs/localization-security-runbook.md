# Localization + Security + Docker Hardening Runbook

## Localization and Language Detection
- Middleware inspects `Accept-Language`, geo country, and existing `ts-locale` cookie to pick one of `en, es, fr, pt, hi, zh`. Fallback: `en`.
- Middleware sets `ts-locale` cookie (30 days, sameSite=lax) and `x-ts-locale` header for observability.
- `app/layout.tsx` reads the request locale on the server and sets `<html lang>` accordingly; UI is wrapped with `LocaleProvider` for per-page translations.
- Dictionaries live in `lib/i18n/locales/*.ts` and resolve via `getDictionary(locale)`.

## Security Headers (middleware)
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `referrer-policy: strict-origin-when-cross-origin`
- `permissions-policy: accelerometer=(), geolocation=(), microphone=(), camera=(), gyroscope=(), payment=(self)`
- `cross-origin-resource-policy: same-site`

## Health and Observability
- Health endpoint: `/api/health` returns JSON status; used by container health checks.
- Locale surfaced via `x-ts-locale` for logging/tracing.

## Docker Hardening
- Dockerfile uses multi-stage build, runs as non-root `nextjs`, installs `tini` for PID 1, enables source maps, adds healthcheck hitting `/api/health`.
- docker-compose: `no-new-privileges` on app service, healthcheck for app, nginx waits for healthy app.

## Deployment Notes
- Ensure `VERCEL_TOKEN` optional path is still respected (workflow already conditional).
- For further hardening: integrate image signing (cosign), SBOM generation, and runtime seccomp/apparmor profiles.
