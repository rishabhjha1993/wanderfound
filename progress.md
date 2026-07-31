# Wanderfound — Build Progress

Last updated: 31 July 2026

This is the quick, plain-language companion to [`plan.md`](./plan.md).
`plan.md` remains the full product and engineering source of truth; this file
answers “where are we right now?”

## Current status

- Product stage: **pre-alpha**
- Production URL: **https://wanderfound.vercel.app**
- Geographic scope: **worldwide**
- Primary field-testing location: **Goa**
- Latest completed ticket: **WF-208a — verify selected places**
- Next ticket: **WF-203 — walking routes inside each pocket**

Production is deployed and healthy, with live credentials. Google sign-in,
foreground location, the custom map, adventure setup, provider contracts, and
the discovery pipeline are built and running against real data.

### The product plans a day, not an hour

Setup now offers **half a day** or **a full day**. A day is two to four
walkable **pockets** with ordinary transport between them: between pockets
Wanderfound is a plan, inside a pocket it is the game. Players never walk
between pockets.

### Two sources, two questions

**"What here is worth a day?"** goes to Wikidata — one free query covering
20–45 km, returning only places somebody wrote an encyclopaedia article about,
ranked by how many languages did.

**"What food is near this point?"** goes to Google, because no encyclopaedia
describes a good litti chokha stall — and only inside a pocket Wikidata found.

This was the big correction. Asked from Dwarka, the old proximity-only search
returned a pickle store in a flat, two home kitchens and an apartment-block
shrine. It now returns Old Delhi around Kashmiri Gate and Nizamuddin around the
Ghalib museum, twenty kilometres away, **for no Places spend at all**.

Real data has contradicted an assumption at almost every step; see the 30 and
31 July decision-log entries.

### Two honest caveats

**A place can still be unverified.** Selected places are now checked against
Google for hours, access and exact position, but only where a confident match
exists on both name and position. From Dwarka six of eight matched; the rest
keep an honest "unknown" rather than a guess.

**The database has a schema but no writes.** All six tables and their
row-level security policies exist in the Supabase migration, and no
application code reads or writes any of them. Location and adventure setup
live only in browser session storage. This is fine until Milestone 4, and
is addressed by WF-207 at the end of Block 3, because stage progress and a
paid unlock must never trust client state.

## ELI5 system map

| Piece                   | What it does                                                                     |
| ----------------------- | -------------------------------------------------------------------------------- |
| Next.js                 | The app’s body: screens, buttons, and secure server endpoints.                   |
| TypeScript              | Spell-checking for code: catches many mistakes before users see them.            |
| Supabase                | The identity desk: verifies Google accounts and keeps login sessions.            |
| Google Maps             | Draws the beautiful interactive map.                                             |
| Wikidata                | The scout: finds what in this region is worth a day, and how widely it is known. |
| Google Places API (New) | Finds food and shops near a pocket, and checks hours and access.                 |
| GPT-5.6 Sol             | The creative director: chooses an interesting mix only from the verified list.   |
| Zod                     | The bouncer: rejects malformed Google or AI data at the door.                    |
| Vercel                  | The theatre: hosts and serves the production app.                                |
| GitHub                  | The shared source-code vault and change history.                                 |
| GitHub Actions          | The independent robot proofreader that tests each proposed change.               |

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

Block 3 has been re-sequenced twice, both times because live data contradicted
an assumption rather than because the plan read badly.

1. ~~**WF-201a — Live activation and candidate audit**~~ — done. Keys are in
   local development and Vercel.

2. ~~**WF-202a — Candidate-level hard filters**~~ — done. Six named rules with
   reason codes, running before the curator so no AI response can reinstate a
   rejected candidate.

3. ~~**WF-206 — Playability debug view**~~ — done. Visit
   `/debug/playability` while signed in, locally or on a deployment with
   `WANDERFOUND_DEBUG_TOOLS=true`. There is a "use my location" button, so this
   is the tool to open while standing in a street.

4. ~~**WF-208 — Region-wide discovery**~~ — done. Wikidata finds what is worth a
   day across 20–45 km; the Google sweep survives only for food.

5. ~~**WF-209 — Pocket clustering**~~ — done. Places group into walkable
   neighbourhoods, each needing two categories and one place worth the journey.

6. ~~**WF-208a — Verify selected places**~~ — done. Eight Google calls per day,
   for the shortlist only. A place that turns out to be permanently closed is
   dropped; a provider outage leaves it unverified rather than deleting it.

7. **WF-203 — Walking routes and duration matrix**
   - Effort: High.
   - One pairwise duration matrix per pocket; full routes with geometry only for
     the selected sequence. Pockets keep the matrix small however far the day
     ranges.

8. **WF-202b — Route-level safety filters**
   - Effort: High.
   - Motorway, unsafe crossing, hazard adjacency and unreachable destinations,
     now that a real pedestrian route exists to judge them against.

9. **WF-204 and WF-205 — Scoring and sequence search**
   - Effort: High.
   - Score variety, quality, accessibility and walking fit.
   - Greedy insertion plus 2-opt against the matrix; a playable sequence or an
     honest “not enough here” response.

10. **WF-210 — Day assembly and transport legs**
    - Effort: High.
    - Order the pockets, estimate travel between them, and never draw a
      transport leg as a walking route.

11. **WF-207 — Server-authoritative session record**
    - Effort: High.
    - Persist the session and selection server-side; the client sees only the
      current stage. Makes the later paywall tamper-resistant by construction.

12. **Milestone 3 — Grounded mystery writing**
    - Effort: High.
    - Enrich approved places with sourced public facts.
    - Let Sol write the premise and clues using only approved material.
    - Validate every stage before showing it to the player.

Also outstanding, before field testing with real testers:
**WF-106 — account deletion, expired-auth recovery and session-lifecycle
tests**, promoted out of WF-105 so it stops drifting. Party mode is collected at
setup and does not yet filter anything, so family mode can still surface an
alcohol-led venue.

## Explicitly not being built yet

Subscriptions, leaderboards, AR characters, voice chat, offline mode,
multiple languages, native mobile apps, and multiplayer syncing remain
post-MVP ideas.
