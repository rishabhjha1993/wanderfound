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
- Latest completed ticket: **WF-208c — Sol-first semantic scouting**
- Next ticket: **WF-203 — walking routes inside each pocket**

Production is deployed and healthy, with live credentials. Google sign-in,
foreground location, the custom map, adventure setup, provider contracts, and
the discovery pipeline are built and running against real data.

### The product plans a day, not an hour

Setup now offers **half a day** or **a full day**. A day is two to four
walkable **pockets** with ordinary transport between them: between pockets
Wanderfound is a plan, inside a pocket it is the game. Players never walk
between pockets.

### Taste first, facts second

The production discovery order is now deliberately simple:

1. **Sol scouts first.** It proposes specifically named places across a fixed
   30 km metropolitan area. Beautiful must be visually exceptional; Strange
   must have a concrete unusual quality or story. Generic fountains, apartment
   amenities and ordinary buildings are explicitly disallowed.
2. **Google verifies second.** Text Search confirms that every proposed name
   exists inside the radius, replaces Sol's approximate coordinate with the
   mapped point and adds current map metadata. Unmatched suggestions disappear.
3. **Deterministic guardrails finish the list.** One locality contributes at
   most two final places when the area has several neighbourhoods, and roughly
   one-third of the shortlist is reserved for genuine lesser-known or hidden
   places.

This replaces the production Wikidata-first / Google-nearby pipeline. That
pipeline correctly answered what databases considered nearby or notable, but
it could not enforce taste: in Delhi it produced labels such as Jor Bagh
Fountain and Glass House Jor Bagh. Sol now decides meaning; Google decides
whether the named place is real.

Live Dwarka checks on 31 July returned twelve Google-matched Beautiful places
across Mehrauli, Nizamuddin, Old Delhi, Connaught Place, Gole Market, Jor Bagh,
Kalkaji and Pandav Nagar. Strange returned the Museum of Toilets, Jantar
Mantar, the Dolls Museum, Waste to Wonder, Bhuli Bhatiyari ka Mahal, Chor Minar,
Metcalfe's Folly and other specific oddities across eleven localities.

Real data has contradicted an assumption at almost every step; see the 30 and
31 July decision-log entries.

### Two honest caveats

**Existence verification is not a full safety audit.** Google confirms the
name, map point, destination type and current business status. Google Places
does not expose a general public-access field, so only known-public destination
types pass automatically. Pedestrian reachability and route hazards remain the
next two tickets.

**The database has a schema but no writes.** All six tables and their
row-level security policies exist in the Supabase migration, and no
application code reads or writes any of them. Location and adventure setup
live only in browser session storage. This is fine until Milestone 4, and
is addressed by WF-207 at the end of Block 3, because stage progress and a
paid unlock must never trust client state.

## ELI5 system map

| Piece                   | What it does                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| Next.js                 | The app’s body: screens, buttons, and secure server endpoints.                    |
| TypeScript              | Spell-checking for code: catches many mistakes before users see them.             |
| Supabase                | The identity desk: verifies Google accounts and keeps login sessions.             |
| Google Maps             | Draws the beautiful interactive map.                                              |
| GPT-5.6 Sol             | The taste scout: proposes places that strongly match the requested mood.          |
| Google Places API (New) | The fact checker: proves each Sol proposal exists and supplies its exact map pin. |
| Zod                     | The bouncer: rejects malformed Google or AI data at the door.                     |
| Vercel                  | The theatre: hosts and serves the production app.                                 |
| GitHub                  | The shared source-code vault and change history.                                  |
| GitHub Actions          | The independent robot proofreader that tests each proposed change.                |

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

- [x] Added half-day and full-day choices.
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

- [x] Make GPT-5.6 Sol the first production scout over a 30 km radius.
- [x] Give Beautiful and Strange explicit semantic failure rules.
- [x] Verify every Sol proposal through Google Text Search and drop unmatched,
      out-of-radius and parking/gate/entrance sub-records.
- [x] Cap each locality at two final places and preserve a deliberate offbeat
      share.
- [x] Keep the former Wikidata/Google sweep behind provider boundaries for
      deterministic fallback tests, but remove it from the configured
      production path.

- [x] Added the Wikidata regional provider and Google Places API (New) server
      provider.
- [x] Search a 20 km region for half-day adventures.
- [x] Search a 45 km region for full-day adventures.
- [x] Use up to four or six notable knowledge anchors as local Google
      enrichment centres.
- [x] Map Wanderfound categories to current Google place types.
- [x] Cap Google searches at 20 results and six seconds.
- [x] Normalize all Google results into Wanderfound’s strict schema.
- [x] Remove duplicate IDs, matching names, nearby name variants, and repeated
      branches.
- [x] Send the start coordinate, 30 km boundary and mood contract to Sol in a
      server-only structured request.
- [x] Require Google verification before any Sol-suggested destination reaches
      the player.
- [x] Add a visible “Discover what’s around me” result panel with Google
      attribution.
- [x] Log failures using only a coarse location cell, never the key or precise
      player position.
- [x] Added the private production credentials and ran real Delhi and Goa
      acceptance searches (WF-201a).
- [x] Added a per-instance development rate limit to the discovery route.
      A shared limiter remains necessary before paid/public launch.

## Latest verification

The worldwide discovery build passed:

- formatting
- linting
- TypeScript
- 167 unit tests
- 18 component tests
- 3 mobile browser smoke tests
- production build
- browser smoke test in GitHub Actions
- Vercel production deployment
- production health check

Latest merged pull request before this update:
[PR #20 — Search around the worthwhile neighbourhood](https://github.com/rishabhjha1993/wanderfound/pull/20)

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

7. ~~**WF-208b — Enrich regional anchors locally**~~ — done. A live Dwarka
   culinary run previously retrieved 150 places and produced zero pockets
   because food was searched around the player's suburb. Google now searches
   around Wikidata's worthwhile neighbourhood anchors. The same live checks
   produce six culinary pockets and six beautiful pockets with five provider
   searches rather than eight.

8. ~~**WF-208c — Sol-first semantic scouting**~~ — done. Sol defines
   Beautiful/Strange quality before a map database can flood the pool; Google
   independently verifies every suggestion; locality and offbeat guardrails
   shape the final shortlist. Live Delhi Beautiful and Strange audits passed.

9. **WF-203 — Walking routes and duration matrix**
   - Effort: High.
   - One pairwise duration matrix per pocket; full routes with geometry only for
     the selected sequence. Pockets keep the matrix small however far the day
     ranges.

10. **WF-202b — Route-level safety filters**

- Effort: High.
- Motorway, unsafe crossing, hazard adjacency and unreachable destinations,
  now that a real pedestrian route exists to judge them against.

11. **WF-204 and WF-205 — Scoring and sequence search**
    - Effort: High.
    - Score variety, quality, accessibility and walking fit.
    - Greedy insertion plus 2-opt against the matrix; a playable sequence or an
      honest “not enough here” response.

12. **WF-210 — Day assembly and transport legs**
    - Effort: High.
    - Order the pockets, estimate travel between them, and never draw a
      transport leg as a walking route.

13. **WF-207 — Server-authoritative session record**
    - Effort: High.
    - Persist the session and selection server-side; the client sees only the
      current stage. Makes the later paywall tamper-resistant by construction.

14. **Milestone 3 — Grounded mystery writing**
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
