# Deployment Automation and Secrets

This document describes the automated CI and deployment steps and lists required secrets for Vercel, Supabase, and external services.

## GitHub Actions
- Workflow: `.github/workflows/ci-and-deploy.yml`
- Runs on pushes and PRs to `main`.
- Steps: checkout, install pnpm, install dependencies, `pnpm build`.
- Optional: deploy to Vercel when `VERCEL_TOKEN` is set in repository secrets.

## Required Repository Secrets (GitHub)
- `VERCEL_TOKEN` — Vercel personal token for the project (used by CLI).
- `VERCEL_ORG_ID` — Vercel organization id.
- `VERCEL_PROJECT_ID` — Vercel project id.
- `SUPABASE_URL` — Supabase project URL (if using CI to run migrations).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for server migrations).

Note: Do NOT commit secret values to the repo. Use GitHub → Settings → Secrets.

## Vercel Environment Variables (Add in Vercel Dashboard)
Set the following in the Vercel project settings (Environment Variables):

- `POSTGRES_URL`
- `REDIS_URL`
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `PI_API_KEY` / `PI_INTERNAL_API_KEY`
- `NODE_ENV=production`

Refer to `COMPLETE_DEPLOYMENT_STATUS.md` for the full list and descriptions.

## Supabase
- Create the project in Supabase.
- Add service role key to GitHub secrets if CI will run migrations.
- Run migrations locally or via Docker Compose:

```bash
docker-compose up -d postgres
pnpm db:migrate
```

## Pi App Studio / Domain Validation
- Ensure `validation-key.txt` content in `/app/validation-key.txt` matches Pi App Studio's required token.
- Confirm domain ownership via Pi App Studio dashboard.

## Next Steps
1. Add the required secrets to GitHub and Vercel.
2. Push a commit to trigger CI. The `build` job will run and fail fast if configuration is missing.
3. If you want, provide Vercel token and I will enable the deploy step and verify logs.
