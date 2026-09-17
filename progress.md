# Wanderfound — Build Progress

Last updated: 15 September 2026

The active product plan is [AI-native Goa V0](goa-ai-native-v0.md).

## September V0 implementation

- Public, guest-first home page replaces the mystery sign-in entry.
- Natural-language requests, typed Goa starting areas, optional location,
  time and transport controls.
- OpenAI live web research, source matching, Google place verification,
  closure/distance checks and mode-specific routing when available.
- Revisions preserve current intent; browser sessions restore after refresh.
- Share links omit private conversational context and starting location.
- Navigation and voluntary outcome feedback produce anonymous server events.
- Local validation: formatting, lint, TypeScript, 189 unit tests, 18 component tests,
  and 5 mobile browser smoke tests. Real Panjim research returned sourced museum
  and gallery choices; a live “hungry now” revision returned three food options
  and preserved the party, location and transport constraints. Desktop and mobile
  layouts were inspected. The production build passed.
- Deployment target: the existing GitHub → Vercel production integration at
  `https://wanderfound.vercel.app`. `/health` identifies this release as
  `goa-outings-v0` and includes the deployed commit revision.

Known limitation: existing server credentials still do not yield usable Routes
responses. Travel times remain explicitly unverified in that case, direct distances
are labelled, and users can check the journey in Google Maps. Pricing, access and
future opening times are not guaranteed. Feedback is logged, not stored in a
dedicated analytics database. Rate limits are per server instance.

## Historical progress through August

The sections below document the old walking-mystery build and its provider work.
Its next-ticket instructions are superseded by the September V0.

## Current status

- Product stage: **pre-alpha**
- Production URL: **https://wanderfound.vercel.app**
- Geographic scope: **worldwide**
- Primary field-testing location: **Goa**
- Latest implemented ticket: **WF-203 — walking routes inside each pocket**
- Next action: **enable Routes API for the server credential, then run the live audit**
- Next build ticket after activation: **WF-202b — route-level safety filters**

Production is deployed and healthy, with live credentials. Google sign-in,
foreground location, the custom map, adventure setup, provider contracts, and
the discovery pipeline are built and running against real data.

WF-203 is complete in code and tests. Its live Delhi audit reached Google on 1
August but Google rejected the existing Places-only credential, so production
cannot call Routes until the Routes API is enabled and permitted on a server
key. Until then the app labels walking verification unavailable; it never
substitutes a straight line or guessed duration.

### The product plans a day, not an hour

Setup now offers **half a day** or **a full day**. A day is two to four
walkable **pockets** with ordinary transport between them: between pockets
Wanderfound is a plan, inside a pocket it is the game. Players never walk
between pockets.

### Taste first, facts second

The production discovery order is now deliberately simple:

1. **Sol scouts first.** It proposes specifically named places across a fixed
   30 km metropolitan area, grouped into compact candidate walking pockets of
   three to five places. Beautiful must be visually exceptional; Strange must
   have a concrete unusual quality or story. Generic fountains, apartment
   amenities and ordinary buildings are explicitly disallowed.
2. **Google verifies second.** Text Search confirms that every proposed name
   exists inside the radius, replaces Sol's approximate coordinate with the
   mapped point and adds current map metadata. Unmatched suggestions disappear.
3. **Deterministic guardrails finish the list.** Incomplete candidate pockets
   are not allowed to consume verification calls. The shortlist keeps at least
   three stops from each selected pocket before adding extras, and roughly
   one-third remains genuinely lesser-known or hidden.
4. **Google checks the walk.** One small walking matrix per candidate pocket
   proves that every stop can connect on foot. Disconnected pockets, absurd
   detours, legs over 25 minutes and pockets over a 90-minute minimum walk are
   rejected. Once the final order is chosen, one Routes request returns the
   exact line and turn steps for the whole sequence.

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

A 3 August Historical regression audit fixed the “12 real places, zero walks”
failure shown in production. The same Dwarka-area start returned twelve Sol
suggestions, ten Google-verified survivors and two honest walking pockets:
Humayun's Tomb/Nizamuddin and Red Fort/Chandni Chowk. The system now asks Sol
for complete candidate pockets rather than hoping isolated city-wide pins will
accidentally cluster.

Real data has contradicted an assumption at almost every step; see the 30 and
31 July decision-log entries.

### Two honest caveats

**Walking reachability is not a full route safety audit.** The new route matrix
can prove that a pedestrian path exists and fits the time budget. It does not
yet reject motorway exposure, unsafe crossings or hazards beside the route;
those rules are WF-202b.

**The database has a schema but no writes.** All six tables and their
row-level security policies exist in the Supabase migration, and no
application code reads or writes any of them. Location and adventure setup
live only in browser session storage. This is fine until Milestone 4, and
is addressed by WF-207 at the end of Block 3, because stage progress and a
paid unlock must never trust client state.

## ELI5 system map

| Piece                   | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Next.js                 | The app’s body: screens, buttons, and secure server endpoints.                       |
| TypeScript              | Spell-checking for code: catches many mistakes before users see them.                |
| Supabase                | The identity desk: verifies Google accounts and keeps login sessions.                |
| Google Maps             | Draws the beautiful interactive map.                                                 |
| GPT-5.6 Sol             | The taste scout: proposes places that strongly match the requested mood.             |
| Google Places API (New) | The fact checker: proves each Sol proposal exists and supplies its exact map pin.    |
| Google Routes API       | The path checker: proves pockets connect on foot and returns the exact walking line. |
| Zod                     | The bouncer: rejects malformed Google or AI data at the door.                        |
| Vercel                  | The theatre: hosts and serves the production app.                                    |
| GitHub                  | The shared source-code vault and change history.                                     |
| GitHub Actions          | The independent robot proofreader that tests each proposed change.                   |

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
- [x] Preserve at least three places per selected pocket and a deliberate
      offbeat share.
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

### Walking routes

- [x] Added a strict walking-matrix contract and mock/Google providers.
- [x] Check each pocket with one real pairwise pedestrian matrix.
- [x] Reject disconnected pockets, excessive detours, legs over 25 minutes and
      a minimum pocket walk over 90 minutes.
- [x] Fetch one exact Google route, including geometry and turn steps, only for
      the final ordered sequence.
- [x] Never replace a failed pedestrian route with a straight line.
- [x] Expose route-check counts and honest unavailable status to the app and
      founder debugger.
- [ ] Enable Routes API for a server credential locally and in Vercel, then
      rerun `npm run audit:routes` and verify production.

## Latest verification

The worldwide discovery build passed:

- formatting
- linting
- TypeScript
- 180 unit tests
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

9. ~~**WF-203 — Walking routes and duration matrix (code)**~~ — implemented;
   live activation remains one Google Cloud permission.

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
