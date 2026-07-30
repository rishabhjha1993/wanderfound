# Wanderfound — Build Progress

Last updated: 29 July 2026

This is the quick, plain-language companion to [`plan.md`](./plan.md).
`plan.md` remains the full product and engineering source of truth; this file
answers “where are we right now?”

## Current status

- Product stage: **pre-alpha**
- Production URL: **https://wanderfound.vercel.app**
- Geographic scope: **worldwide**
- Primary field-testing location: **Goa**
- Latest completed ticket: **WF-206 — playability debug view**
- Next ticket: **WF-203 — walking routes and duration matrix**

Production is deployed and healthy. Google sign-in, foreground location,
the custom map, adventure setup, provider contracts, and the worldwide
Google Places + GPT-5.6 Sol discovery pipeline are built.

### Live discovery is active

The two server-only credentials are configured in local development, so
discovery now runs against real Google Places data and `gpt-5.6-sol`
curation. **They are not yet in Vercel**, so production still returns 503.

```bash
GOOGLE_MAPS_SERVER_API_KEY=
AI_API_KEY=
AI_TEXT_MODEL=gpt-5.6-sol
```

Never commit the real key values or prefix them with `NEXT_PUBLIC_`.

Real data immediately contradicted several assumptions; see the 30 July
decision-log entry. The short version: two candidate fields were hardcoded to
`"unknown"` and would have rejected every place on earth, government offices
and casino boats were being offered as discoveries, and the "strange" mood
returned Panjim's busiest restaurants. All corrected against observed output.

### One honest caveat

**The database has a schema but no writes.** All six tables and their
row-level security policies exist in the Supabase migration, and no
application code reads or writes any of them. Location and adventure setup
live only in browser session storage. This is fine until Milestone 4, and
is addressed by WF-207 at the end of Block 3, because stage progress and a
paid unlock must never trust client state.

## ELI5 system map

| Piece                   | What it does                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Next.js                 | The app’s body: screens, buttons, and secure server endpoints.                      |
| TypeScript              | Spell-checking for code: catches many mistakes before users see them.               |
| Supabase                | The identity desk: verifies Google accounts and keeps login sessions.               |
| Google Maps             | Draws the beautiful interactive map.                                                |
| Google Places API (New) | The factual scout: finds real places near the player.                               |
| GPT-5.6 Sol             | The creative director: chooses an interesting mix only from Google’s verified list. |
| Zod                     | The bouncer: rejects malformed Google or AI data at the door.                       |
| Vercel                  | The theatre: hosts and serves the production app.                                   |
| GitHub                  | The shared source-code vault and change history.                                    |
| GitHub Actions          | The independent robot proofreader that tests each proposed change.                  |

## Completed

### Foundation and deployment

- [x] Created the Next.js TypeScript application.
- [x] Added formatting, linting, type checks, unit tests, component tests,
      browser smoke tests, and a production build check.
- [x] Connected the GitHub repository.
- [x] Connected GitHub to Vercel for preview and production deployments.
- [x] Deployed the production app over HTTPS.
- [x] Added a public health endpoint that exposes no secrets.

### Accounts

- [x] Connected Supabase.
- [x] Configured Google OAuth with PKCE.
- [x] Made Google sign-in mandatory; no anonymous guest accounts are created.
- [x] Added login callback, logout, protected-route redirects, returning-user
      redirects, and cookie-based session refresh.
- [ ] Account deletion, dedicated expired-session recovery and full session
      lifecycle tests are now tracked as WF-106 and must land before real
      testers create accounts and upload photographs.

### Location and map

- [x] Added an explanation before requesting location permission.
- [x] Request foreground location only—never background tracking.
- [x] Handle denied, unavailable, timeout, weak, and unusable readings.
- [x] Cache a recent valid reading only in the current browser tab.
- [x] Show the player and accuracy circle on Google Maps.
- [x] Added the custom Wanderfound map palette, mist, search-area, route,
      and discovery treatments.
- [x] Removed the former India/Goa geographic restriction.

### Adventure setup

- [x] Added 30- and 60-minute choices.
- [x] Added historical, culinary, strange, and beautiful moods.
- [x] Added solo, couple/friends, and family modes.
- [x] Validate and remember choices in the current browser session.

### Provider foundation

- [x] Created strict schemas for places, routes, facts, coordinates,
      attribution, and storage rules.
- [x] Created replaceable Places, Routing, and Knowledge provider contracts.
- [x] Added deterministic fictional mock providers for safe development.
- [x] Added typed provider failures.
- [x] Made the discovery architecture universal rather than city-listed.

### Worldwide place discovery

- [x] Added the Google Places API (New) server provider.
- [x] Search an 800 m radius for 30-minute adventures.
- [x] Search a 1,500 m radius for 60-minute adventures.
- [x] Map Wanderfound categories to current Google place types.
- [x] Cap Google searches at 20 results and six seconds.
- [x] Normalize all Google results into Wanderfound’s strict schema.
- [x] Remove duplicate IDs, matching names, nearby name variants, and repeated
      branches.
- [x] Send only candidate metadata—not player coordinates—to GPT-5.6 Sol.
- [x] Force Sol to return structured IDs from Google’s allow-list.
- [x] Add a deterministic curator when Sol is unavailable.
- [x] Add a visible “Discover what’s around me” result panel with Google
      attribution.
- [x] Log failures using only a coarse location cell, never the key or precise
      player position.
- [ ] Add the two private production credentials and run the first real Delhi
      and Goa acceptance searches (WF-201a).
- [ ] Rate-limit the discovery route before it can spend real quota (WF-201a).

## Latest verification

The worldwide discovery build passed:

- formatting
- linting
- TypeScript
- 43 unit tests
- 11 component tests
- production build
- browser smoke test in GitHub Actions
- Vercel production deployment
- production health check

Latest pull request:
[PR #12 — Add worldwide Google + Sol place discovery](https://github.com/rishabhjha1993/wanderfound/pull/12)

## Build order from here

Block 3 was re-sequenced after reviewing the built code against the plan.
The candidate pool is now audited before logic is built on top of it, the
debug view arrives while it is still useful, and safety filters are split so
that route-dependent rules are written only once real routes exist.

1. ~~**WF-201a — Live activation and candidate audit**~~ — done, except adding
   the two keys to Vercel, which is still outstanding.

2. ~~**WF-202a — Candidate-level hard filters**~~ — done. Seven named rules with
   reason codes, running before the curator so no AI response can reinstate a
   rejected candidate.

3. ~~**WF-206 — Playability debug view**~~ — done. Visit
   `/debug/playability` while signed in, locally or on a deployment with
   `WANDERFOUND_DEBUG_TOOLS=true`. There is a "use my location" button, so this
   is the tool to open while standing in a Goan street.

4. **WF-203 — Walking routes and duration matrix**
   - Effort: High.
   - One pairwise duration matrix over survivors; full routes with geometry
     only for the selected sequence. Roughly two routing calls per adventure.

5. **WF-202b — Route-level safety filters**
   - Effort: High.
   - Motorway, unsafe crossing, hazard adjacency and unreachable destinations,
     now that a real pedestrian route exists to judge them against.

6. **WF-204 and WF-205 — Scoring and sequence search**
   - Effort: High.
   - Score variety, quality, accessibility and walking fit.
   - Greedy insertion plus 2-opt against the matrix; a playable sequence or an
     honest “not enough here” response.

7. **WF-207 — Server-authoritative session record**
   - Effort: High.
   - Persist the session and selection server-side; the client sees only the
     current stage. Makes the later paywall tamper-resistant by construction.

8. **Milestone 3 — Grounded mystery writing**
   - Effort: High.
   - Enrich approved places with sourced public facts.
   - Let Sol write the premise and clues using only approved material.
   - Validate every stage before showing it to the player.

Also outstanding, before field testing with real testers:
**WF-106 — account deletion, expired-auth recovery and session-lifecycle
tests**, promoted out of WF-105 so it stops drifting.

## Explicitly not being built yet

Subscriptions, leaderboards, AR characters, voice chat, offline mode,
multiple languages, native mobile apps, and multiplayer syncing remain
post-MVP ideas.
