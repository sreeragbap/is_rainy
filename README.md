# IsRainy

**Is it raining outside?** One clear answer, one smart insight, nothing else.

IsRainy is a decision-making tool, not a weather website. Within one second of opening it, you know whether you can comfortably walk outside.

## Stack

| Layer     | Choice                                       |
| --------- | -------------------------------------------- |
| Framework | Next.js 15 (App Router, React 19)            |
| Language  | TypeScript (strict)                          |
| Styling   | Tailwind CSS v4 + shadcn/ui                  |
| Weather   | Open-Meteo (current + 15-minutely nowcast)   |
| Geocoding | Open-Meteo Geocoding API                     |
| Data      | TanStack Query (refresh, offline fallback)   |
| Database  | Supabase Postgres via Prisma                 |
| Hosting   | Vercel                                       |
| Tooling   | pnpm, ESLint (flat config), Prettier, Vitest |

## Getting started

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
pnpm install

# 2. Configure environment — OPTIONAL
#    The core answer needs no keys at all. Supabase/database variables only
#    enable recent searches and favourites.
cp .env.example .env

# 3. Create the database schema (only if you configured a database)
pnpm db:migrate

# 4. Run
pnpm dev
```

Environment variables are validated lazily by [src/lib/env.ts](src/lib/env.ts) — a missing or malformed value fails with a readable error, and only when the feature that needs it is actually used.

## Architecture

Feature-based clean architecture. Each feature owns its full vertical slice; dependencies point inward (components → application → domain; infrastructure implements domain contracts).

```
src/
├── app/                    # Next.js App Router: the one page + API route handlers
│   └── api/                # weather, search, locations (thin adapters)
├── components/ui/          # shadcn/ui primitives
├── features/
│   ├── weather/            # current conditions: is it raining?
│   ├── insight/            # the one-sentence advice engine
│   ├── search/             # city search
│   └── locations/          # recent searches + favourites
│       ├── domain/         #   entities, contracts, decision logic — pure TS
│       ├── application/    #   use-cases orchestrating domain + contracts
│       ├── infrastructure/ #   Open-Meteo / Prisma implementations
│       ├── components/     #   feature UI
│       └── hooks/          #   feature React hooks
├── config/                 # product constants (refresh cadence, limits, endpoints)
├── hooks/                  # shared cross-feature hooks
└── lib/                    # env, prisma, supabase, http, storage, api plumbing
```

### Design decisions

- **Open-Meteo for everything.** One provider serves both the forecast (with the 15-minutely precipitation nowcast that powers "rain expected in about 20 minutes") and city geocoding — with no API key and no hourly rate cap, so the core answer holds zero credentials and cannot break because a quota ran out. Both sit behind domain contracts ([weather-provider.ts](src/features/weather/domain/weather-provider.ts), [geocoding-provider.ts](src/features/search/domain/geocoding-provider.ts)), so swapping providers is a one-file change.
- **The advice is computed on the server.** [build-insight.ts](src/features/insight/application/build-insight.ts) is an ordered rule list — the most decision-changing fact wins, so the user is never given two pieces of advice to weigh.
- **Anonymous by design.** No accounts. A UUID in a first-party cookie (`israiny_cid`) scopes recents and favourites. See [prisma/schema.prisma](prisma/schema.prisma).
- **Weather is never stored, and remembering places is optional.** The database holds only user intent (places); if it is unreachable or unconfigured, the app still answers the question. Conditions are cached server-side for 30s and client-refreshed every 60s, with a staleness guard so a cold cache can never serve yesterday's storm as "now".
- **Offline shows the last real answer.** Every successful answer is mirrored to localStorage; when a fetch fails, that copy is shown dimmed with its true age instead of an error.
- **Tailwind v4.** All theme configuration lives in [src/app/globals.css](src/app/globals.css) — including a colour token per weather status (rain, drizzle, storm, clear, snow) so the whole screen answers the question before a word is read.
- **Two database URLs.** `DATABASE_URL` goes through Supabase's transaction pooler for the serverless runtime; `DIRECT_URL` is the direct connection Prisma Migrate needs for DDL.

## Scripts

| Command           | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `pnpm dev`        | Dev server (Turbopack)                           |
| `pnpm build`      | Production build (generates Prisma client first) |
| `pnpm test`       | Vitest — classification, nowcast, advice rules   |
| `pnpm lint`       | ESLint                                           |
| `pnpm typecheck`  | TypeScript, no emit                              |
| `pnpm format`     | Prettier write                                   |
| `pnpm db:migrate` | Create/apply a dev migration                     |
| `pnpm db:deploy`  | Apply migrations in CI/production                |
| `pnpm db:studio`  | Prisma Studio                                    |

## Deployment (Vercel)

1. Import the repo, framework preset **Next.js**, package manager **pnpm**.
2. Optionally set the Supabase/database variables from `.env.example` (Project → Settings → Environment Variables) to enable recents and favourites.
3. Migrations run via `pnpm db:deploy` (add as a build step or run from CI) — the build itself only runs `prisma generate`.
