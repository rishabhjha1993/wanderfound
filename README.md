# Wanderfound

Wanderfound helps you choose your next worthwhile outing in Goa. Describe your
mood, starting area and available time; get researched places, revise the choices,
and take an outing with you.

Active product and release plan: [AI-native Goa V0](goa-ai-native-v0.md).

## Deployment

- **Live:** https://wanderfound.vercel.app
- **Source:** private GitHub repository `rishabhjha1993/wanderfound`
- **Workflow:** pushes to `main` deploy to production; other branches receive
  Vercel preview deployments.

## Local development

Requirements:

- Node.js 22.14 or newer
- npm 10 or newer

Install and start the app:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run check
npm run test:smoke
```

For live research, configure `AI_API_KEY`, `AI_TEXT_MODEL` and
`GOOGLE_MAPS_SERVER_API_KEY` in `.env.local`. The server Maps key needs Places API
(New). `GOOGLE_ROUTES_SERVER_API_KEY` enables real travel estimates when Routes API
is enabled and permitted; otherwise travel is explicitly unverified. Never commit
real credentials. Unit and browser smoke tests use fixtures and need no live keys.

## Current scope

The public home page needs no account. It supports a typed Goa area or optional
foreground location, live web research, Google place checks, natural-language
revisions, browser-local resume, share links, navigation and voluntary outcome
feedback. Purchasing and mystery gameplay are outside this V0.

Sessions keep the conversation on the current browser. Shared snapshots exclude
the conversation and starting location. Precise GPS is used for the current request
and is not written to browser persistence or analytics. Provider details expire
from saved sessions after 24 hours and are marked stale after one hour.

Anonymous demand events are structured server logs (`outing_started`,
`outing_selected`, `outing_navigation`, `outing_went`, `outing_useful`, etc.).
Navigation is a click signal; `went` is self-reported. Deduplicate by anonymous
session, outing and event when analysing logs. This release has no durable analytics
warehouse; retain/export Vercel logs for longer field cohorts.

Research is limited to 8 requests per IP per 10 minutes and 160 requests per hour
per server instance. These are V0 safeguards, not a distributed spending cap.
Maintain provider-level budget controls for a public test.

## Quick test

1. Open the site on your phone and leave the starting area as Siolim, or enter Panjim.
2. Try a starter or describe a real outing; specify tomorrow if testing after closing time.
3. Choose an option, inspect its source links and listed hours, and open Maps.
4. Try “A little closer” or “We’re hungry now.”
5. Refresh to check resume; share a selected place; report whether you went.

`/health` reports `experience: "goa-outings-v0"` and the Vercel commit revision.
The former mystery roadmap in `plan.md` is retained as historical context.
