# Wanderfound

Wanderfound is a bounded AI outing agent for Goa. Give it the messy real-world
context and a few hours; it researches and verifies places, makes one decision,
prepares a fallback, stays with the active outing and replans when reality changes.

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

The public home page needs no account. It supports text or browser voice input, a
typed Goa area or optional foreground location, live web research, Google place
checks, a primary decision and fallback, an active agent state, situational
replanning, browser-local preference memory, resume, share links and navigation.

Sessions keep the conversation on the current browser. Shared snapshots exclude
the conversation and starting location. Precise GPS is used for the current request
and is not written to browser persistence or analytics. Provider details expire
from saved sessions after 24 hours and are marked stale after one hour.

Anonymous demand events are structured server logs (`outing_started`,
`outing_agent_accepted`, `outing_replan_requested`, `outing_memory_added`, etc.).
Navigation is a click signal; `went` is self-reported. Deduplicate by anonymous
session, outing and event when analysing logs. This release has no durable analytics
warehouse; retain/export Vercel logs for longer field cohorts.

Research is limited to 8 requests per IP per 10 minutes and 160 requests per hour
per server instance. These are V0 safeguards, not a distributed spending cap.
Maintain provider-level budget controls for a public test.

## Quick test

1. Open the site on your phone and leave the starting area as Siolim, or enter Panjim.
2. Describe a messy real situation and let the agent make the decision.
3. Inspect the reasoning and evidence, then put the agent on duty.
4. Report a closure, crowd, weather change or early finish and inspect the replan.
5. Complete the outing, save a preference, refresh to check memory, and share the plan.

`/health` reports `experience: "goa-outing-agent-v0"` and the Vercel commit revision.
The former mystery roadmap in `plan.md` is retained as historical context.
