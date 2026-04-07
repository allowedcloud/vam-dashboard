# Session Handoff — vam-dashboard

Last updated: 2026-03-09

## Read First
- Shared backend architecture is in `/Users/christopher/Dev/anything-mip/ARCHITECTURE.md`.
- Shared backend history and incidents are in `/Users/christopher/Dev/anything-mip/docs/engineering-journal.md`.
- App-specific ongoing notes should continue in `/Users/christopher/Dev/anything-mip/apps/vam-dashboard/docs/journal.md`.

## Purpose
Lobby TV dashboard for VA Moving. Displayed on a screen in the office for employees to glance at. No user interaction — data refreshes automatically.

## Stack
- Nuxt 4, Vue 3, TypeScript
- Tailwind CSS v4 (via @nuxtjs/tailwindcss beta)
- shadcn-nuxt (reka-ui based components)
- Dev server runs on `localhost:3001`
- Deployed target: Vercel (root directory: `apps/vam-dashboard`)

## Backend Connection
- Connects to the shared Lambda API via Nuxt server routes.
- See root `docs/session-handoff.md` for backend URL and token.
- Will also call Open-Meteo (free weather API, no key needed) and optionally Google Places + Instagram.
- Dashboard work should prefer additive read/query behavior over shared backend ingestion changes.

## Important Dev Note
**HMR does not reliably pick up file changes written by Claude Code.**
Always restart the dev server after Claude writes files.

## Brand
- Primary color: `#3d4eff` — available as `text-brand`, `bg-brand`, `border-brand` via Tailwind `@theme`

## What's Built
- `app/app.vue` — full-width header: date (left) · logo (center) · live clock with seconds (right)
- `app/composables/useClock.ts` — reactive clock, updates every second
- `app/assets/css/tailwind.css` — Tailwind v4 `@theme` with brand color registered
- `app/assets/css/main.css` — minimal base reset
- `nuxt.config.ts` — shadcn-nuxt configured, runtimeConfig stubs for API keys
- `components.json` — shadcn-nuxt config
- Initial weight-summary work depends on shared backend range data and correct shared identity handling.

## Planned Next: Stats Row
A horizontal row of stat cards below the header. Each card is a quick-glance metric:

| Card | Data | Source |
|------|------|--------|
| Today's Moves | Count of jobs with `daysAway: 0` | `/jobs/upcoming` |
| This Week's Moves | Count of jobs in next 7 days | `/jobs/upcoming` |
| Lbs. Moving This Week | Sum of `weightLbs` for this week | `/jobs/upcoming` |
| Crew Out Today | Sum of `crewSize` for today | `/jobs/upcoming` |
| Pre-checks Done | X / Y completed today | `/jobs/upcoming` |
| Today's Forecast | Temp + condition + high/low | Open-Meteo (free) |

Weather coordinates: Williamsburg VA — lat `37.2707`, lon `-76.7075`

Design direction: brand blue accent (top border or icon per card), weather card wider than stat cards, clean TV-readable typography.

## Planned Future Panels (after stats row)
- Weekly job calendar
- Daily job calendar (today's jobs in detail)
- Google Reviews feed — needs `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACE_ID` env vars
- Instagram feed — needs `INSTAGRAM_ACCESS_TOKEN` env var

## Reporting Caution
- Dashboard totals depend on shared backend correctness.
- Recurring jobs can reuse estimates across dates, so reporting assumptions must be validated against real data.
- Shared backend changes made for dashboard reporting should be treated as infrastructure work, not simple frontend work.

## Local Dev
```
cd apps/vam-dashboard
pnpm dev --port 3001
```
Will need `.env` when backend widgets are added:
```
NUXT_MIP_BACKEND_BASE_URL=https://2duarps7o5.execute-api.us-east-1.amazonaws.com
NUXT_MIP_BACKEND_API_TOKEN=<MIP_API_TOKEN secret value>
```
