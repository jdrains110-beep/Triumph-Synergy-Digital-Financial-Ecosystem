<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Migrations, CI, and Vercel deployment

Long-term migration strategy (recommended):

- Migrations must be run from CI or an administrative job before deploying the app.
- Do NOT run migrations automatically during Vercel builds. Instead, run them from GitHub Actions or another controlled environment where secrets are available.

How it works in this repository:

- The build script runs `scripts/run-migrations-if-present.ts` before `next build`.
- That script will only run migrations when the environment variable `RUN_MIGRATIONS` is set to `true`.
- If `RUN_MIGRATIONS=true` but `POSTGRES_URL` is missing, the build will fail — this is intentional to avoid silent misconfiguration.

Local development:

1. Copy `.env.local.example` to `.env.local` and fill in `POSTGRES_URL`.
2. To run migrations locally before build (explicit):

```powershell
# Windows PowerShell
$env:RUN_MIGRATIONS="true"
$env:POSTGRES_URL="postgres://user:pass@localhost:5432/db"
pnpm run build
```

Or run migrations directly:

```powershell
npx tsx lib/db/migrate.ts
```

CI (GitHub Actions):

- Add a repository secret `POSTGRES_URL` with the connection string.
- Add a repository secret `RUN_MIGRATIONS` set to `true` to enable the migrations step in the provided workflow `.github/workflows/build-and-migrate.yml`.
- The workflow will fail if `RUN_MIGRATIONS=true` and `POSTGRES_URL` is not set.

Vercel deployment guidance:

- Prefer running migrations in CI (GitHub Actions) prior to triggering a Vercel deploy.
- If you must run migrations from Vercel, use a protected deployment hook or an external job that sets `RUN_MIGRATIONS=true` and provides `POSTGRES_URL` securely.

Security note:

- Never commit real DB credentials. Use repository/project-level secrets in CI/Vercel.


## Pi Node Configuration

To configure Pi nodes for communication, ensure the following TCP/IP ports are open and configured:

- 31400
- 31401
- 31402
- 31403
- 31404
- 31405
- 31406
- 31407
- 31408
- 31409
