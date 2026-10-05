# Listora

Upload 1–4 photos of a product → get 1–3 Meesho-ready images and every listing field, ready to copy.

- **Listing details** — OpenAI (`gpt-6.1-sol`, Structured Outputs) reads the photo and fills title, description, Meesho fields, measurements and keywords. Rules come from [`docs/MEESHO_PRODUCT_LISTING_SKILL.md`](docs/MEESHO_PRODUCT_LISTING_SKILL.md).
- **Images** — the seller picks one of the newest image models at upload (Gemini Nano Banana Pro / 2 / 2 Lite; OpenAI GPT Image 2.5 Sunburst / 2.5 Flare). Only that model runs; any image can get extra versions from any other model. The model list is in `src/lib/ai/models.ts`, prices in `src/lib/ai/pricing.ts`.
- **Export** — ZIP with the chosen images (1500×1500 JPG, white background) + `listing.txt`.

Plan: [`docs/PLAN.md`](docs/PLAN.md) · Design: [`docs/design-listora-studio.html`](docs/design-listora-studio.html)

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev:mock        # fake AI, no keys needed → http://localhost:3000
```

With no `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN`, the app uses an in-process Postgres (PGlite) and local files in `.data/`. Delete `.data/` to reset.

For real AI, put `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env.local` and run `pnpm dev`. `GET /api/health` shows what is configured.

## Deploy on Vercel

1. Import the GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. **Storage → Marketplace**: add **Neon** (sets `DATABASE_URL`), **Blob** (sets `BLOB_READ_WRITE_TOKEN`) and **Upstash Redis** (sets `UPSTASH_REDIS_REST_*`).
3. **Settings → Environment Variables**: add `OPENAI_API_KEY`, `GEMINI_API_KEY` (and any model overrides from `.env.example`).
4. Create the tables once (and after every schema change):
   ```bash
   vercel env pull .env.local && pnpm db:migrate
   ```
5. Deploy. Check `https://<your-app>/api/health`.

Function limits: image routes use `maxDuration = 180` s, which fits Vercel Hobby (300 s max with Fluid compute).

> **No login yet.** Anyone with the URL can generate (and spend API credits). Rate limits apply per IP once Upstash is connected (`DAILY_LISTING_LIMIT`, `DAILY_IMAGE_LIMIT`). Keep the URL private or add Vercel Deployment Protection until auth is added.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm dev:mock` | Dev server (real AI / fake AI) |
| `pnpm check` | Typecheck + lint + unit tests |
| `pnpm test:e2e` | Playwright smoke test (uses mock AI) |
| `pnpm db:generate` | New migration after editing `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Browse the database |

## How it works

```
browser ── compress photo ──► POST /api/upload            → Blob
        ──────────────────► POST /api/listings            → GPT analysis → Neon
        ── one request per slot, chosen model, in parallel ──►
                            POST /api/listings/:id/images → OpenAI / Gemini → sharp → Blob
        ──────────────────► GET  /api/listings/:id/export → ZIP
```

One request per image keeps every call short and shows images as they finish. `DEFAULT_IMAGE_MODEL` sets the pre-selected model; only models whose provider has an API key are offered.

| Path | Purpose |
|---|---|
| `src/lib/ai/prompts.ts` | System prompt (from the skill) + per-slot image rules |
| `src/lib/ai/providers/*` | `ImageProvider` implementations — add a model here |
| `src/lib/listing/postprocess.ts` | Safety rules applied to AI output (no invented manufacturer/HSN, pack-quantity checks) |
| `src/lib/listing/service.ts` | All listing/image logic used by the API routes |
| `src/components/listing/*` | Results page: image slots, fields, export |
