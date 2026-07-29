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
- Latest completed ticket: **WF-201 implementation — nearby-place retrieval**
- Next ticket: **WF-201 live credential check, then WF-202 hard safety filters**

Production is deployed and healthy. Google sign-in, foreground location,
the custom map, adventure setup, provider contracts, and the worldwide
Google Places + GPT-5.6 Sol discovery pipeline are built.

Real place discovery is deployed but not yet activated because its two
server-only credentials still need to be added to local development and
Vercel:

```bash
GOOGLE_MAPS_SERVER_API_KEY=
AI_API_KEY=
AI_TEXT_MODEL=gpt-5.6-sol
```

Never commit the real key values or prefix them with `NEXT_PUBLIC_`.

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
- [ ] Account deletion and dedicated expired-session recovery remain to be built.
- [ ] Full authenticated-session lifecycle tests remain to be added.

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
      and Goa acceptance searches.

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

1. **Activate and test real discovery**
   - Codex model: GPT-5.6 Sol.
   - Effort: Medium.
   - Add the Google server key and OpenAI project key.
   - Test actual results in Delhi and Goa.
   - Adjust type coverage only from real observations.

2. **WF-202 — Hard safety filters**
   - Codex model: GPT-5.6 Sol.
   - Effort: High.
   - Reject unsafe, inaccessible, private, purchase-required, or uncertain
     candidates before AI sees them.
   - Return a clear reason for every rejection.

3. **WF-203 — Walking routes**
   - Codex model: GPT-5.6 Sol.
   - Effort: High.
   - Ask Google Routes for actual pedestrian paths.
   - Reject no-route, unsafe, excessive-detour, and over-duration options.

4. **WF-204 and WF-205 — Scoring and trail assembly**
   - Codex model: GPT-5.6 Sol.
   - Effort: High.
   - Score variety, quality, accessibility, and walking fit.
   - Find a playable combination or give an honest “not enough here” response.

5. **Milestone 3 — Grounded mystery writing**
   - Codex model: GPT-5.6 Sol.
   - Effort: High.
   - Enrich approved places with sourced public facts.
   - Let Sol write the premise and clues using only approved material.
   - Validate every stage before showing it to the player.

## Explicitly not being built yet

Subscriptions, leaderboards, AR characters, voice chat, offline mode,
multiple languages, native mobile apps, and multiplayer syncing remain
post-MVP ideas.
