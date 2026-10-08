# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
```

`npm test` runs the unit tests in `tests/` with Node's built-in runner (`node --test`, no extra dependencies). They cover the pure modules (`lib/ats/*`, `lib/verification/normalize.mjs`, `lib/search.mjs`) with `fetch` mocked; nothing hits the network or the database. Logic that must be unit-tested lives in `.mjs` modules so tests can import it without the Next.js build.

## Architecture

Jobscape is a Next.js 16 (App Router) application that lists open roles at **certified B Corporations**. Certification comes from an imported B Lab dataset (never from scraping bcorporation.net, whose terms forbid it); jobs come from the companies' public job boards (Greenhouse, Workable, Recruitee, SmartRecruiters); everything is cached in Supabase (PostgreSQL). Star ratings are optional: stored only when a real provider supplies one, shown only when present.

### Data flow

```
scripts/import-bcorps.mjs      B Lab CSV (data/, gitignored) → `bcorps` table
scripts/detect-ats.mjs         finds each certified B Corp's job board on supported platforms (name-verified) → bcorps.ats_provider/ats_slug; resumable
POST /api/scrape
  → AtsScraper                 jobs from the boards of certified B Corps → ScrapedJob[]
  → verifyCompany()            normalized-name match against `bcorps` (status = 'certified')
  → upsert `companies` (keyed by name, linked to B Lab record via bcorp_id) + `job_postings`
  → deactivate postings gone from fully-fetched feeds; sync_company_certification() hides companies no longer certified
GET / , /jobs/[id] , /api/jobs → lib/jobs.ts queryJobs()/getJob() (anon client, RLS: certified companies + active jobs only)
```

### Key directories

- `lib/jobs.ts` — shared read queries (`queryJobs`, `getJob`, `getFacets`), 20/page, search input sanitized for PostgREST filters. Used by the pages and `/api/jobs`.
- `lib/ats/providers.mjs` — one entry per hiring platform (Greenhouse, Workable, Recruitee, SmartRecruiters) exposing `boardName(slug)` and `fetchJobs(slug)`; shared by `scripts/detect-ats.mjs` and the scraper. A platform is only usable if its public API reveals the company name (the only way to confirm a guessed slug belongs to the right company), which rules out Lever and Ashby. To add one: add an entry, add its tests, add a pacing entry in `MIN_INTERVAL_MS`.
- `lib/scrapers/` — `AtsScraper` reads the `bcorps` rows that have a detected board and fetches their jobs (8 at a time). Do not add LinkedIn/Indeed scrapers (their terms forbid it).
- **Rate limits matter**: Workable answers abuse with a ~24h IP ban (`Retry-After: 86256`), hit once on 2026-10-08. Requests are paced per host, 429 raises `RateLimitError`, and `detect-ats.mjs` stops using a platform for the rest of the run when it is rate limited (companies stay unchecked for it, so a later run resumes). Never probe these APIs in loops.
- `lib/verification/` — `bcorp.ts` looks up the `bcorps` table via the service client (`BCORP_PROVIDER=mock` for fake data); `normalize.mjs` is shared with the scripts; `ratings.ts` is a stub returning `null` (`RATINGS_PROVIDER=mock` for fake dev data). A company passes on certification alone.
- `app/` — `page.tsx` (list + filters + pagination), `jobs/[id]/page.tsx` (detail), `api/jobs`, `api/scrape` (protected by `x-scrape-secret`, uses the service role key). `components/` holds the UI pieces.
- `supabase/migrations/` — apply in order (001-010). The `bcorps` table has RLS enabled with no policies (service role only).
- `types/index.ts` — shared interfaces.

### Supabase clients

- `lib/supabase.ts` exports `supabase` — anon key, safe anywhere, subject to RLS.
- `lib/supabase-admin.ts` exports `createServiceClient()` — service role key, bypasses RLS. It imports `server-only`, so bundling it into client code fails the build. Use only in API routes, server modules and scripts.

### Important Next.js note

This project uses Next.js 16 which may have breaking changes from earlier versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for the authoritative API reference (see `AGENTS.md`).

### Environment variables

Copy `.env.local.example` to `.env.local`. Required vars:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only
- `SCRAPE_SECRET` — arbitrary secret to protect the scrape endpoint
- `RATINGS_PROVIDER=mock` — optional; fake ratings for UI development only. Leave unset otherwise.
- `BCORP_PROVIDER=mock` — optional; fake certification data. Leave unset to use the imported `bcorps` table.
