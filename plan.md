# Wanderfound — Product and Build Plan

> Working name: **Wanderfound**  
> Working tagline: **The world is hiding in plain sight.**  
> One-line product: **Wanderfound turns wherever you are into a walkable, AI-generated mystery.**

Status: pre-alpha  
Primary testing ground: Goa  
Initial platform: mobile web/PWA  
Primary market: travellers; curious locals are the second market

---

## 0. Instructions for Codex

This document is the source of truth for the first build.

When working from this plan:

1. Read the complete document before changing code.
2. Implement one milestone at a time.
3. Do not add features from the post-MVP backlog unless explicitly requested.
4. Preserve provider boundaries: maps, places, routing, AI, weather, payments and analytics must be replaceable.
5. Keep factual place data separate from generated narrative.
6. Never allow the model to invent coordinates, opening hours, accessibility or local facts.
7. Add tests for route filtering, trail-state transitions and verification rules.
8. At the end of each milestone:
   - run relevant tests and checks;
   - update the milestone checklist in this file;
   - document material decisions under `Decision log`;
   - report anything that remains unsafe or simulated.
9. Ask for API credentials only when the next milestone genuinely requires them.
10. Optimise for a field-testable mobile experience, not architectural perfection.

Recommended first Codex prompt:

> Read `plan.md` completely. Inspect the workspace. Implement Milestone 0 and Milestone 1 only. Use the stated defaults unless the repository already contains a compatible choice. Run validation, update the milestone checkboxes and explain how I can test the result on my phone.

---

## 1. Name

### Recommendation: Wanderfound

The name contains the product’s central movement:

- **Wander:** uncertainty, curiosity and freedom from a predetermined itinerary.
- **Found:** an earned discovery, verified in the physical world.

It is more evocative than an explanatory name such as “AI Tour Guide,” and can expand beyond tourism into dates, family walks, local exploration and outdoor play.

Possible brand language:

- **Wander. Notice. Find.**
- **The world is hiding in plain sight.**
- **Turn here into an adventure.**
- **Arrive somewhere. Become present there.**

This is a provisional working name, not legal clearance. A preliminary web search found no obvious same-category product named Wanderfound. `wanderfound.app` and `wanderfound.world` returned no domain registration record when checked on 27 July 2026. Before a public app-store launch:

- conduct an Indian trademark search;
- search WIPO and major target markets;
- recheck domains and social handles;
- consult a trademark professional if committing meaningful capital.

Avoid these names:

- **Yonder:** already used by multiple current travel products.
- **Rihla:** used by several AI travel planners and travel businesses.
- **Afoot:** already used by a similar walking-discovery product.
- **Sidequest:** crowded across games and consumer apps.
- **Charaiveti:** deeply aligned philosophically, but already used by an active app and Indian company.

---

## 2. Product thesis

Navigation products help people arrive efficiently but compress exploration into routes, ratings and lists. Wanderfound should use AI to restore curiosity without restoring the danger and inconvenience of being genuinely lost.

The product is not:

- an itinerary generator;
- a chatbot with a map;
- an audio guide;
- a manually authored walking-tour marketplace;
- a list of nearby attractions;
- a generic scavenger-hunt template.

The product is:

> A real-time AI game master that turns nearby, trustworthy, walkable places into a coherent mystery and verifies discoveries through location and vision.

AI belongs backstage. The player should experience the neighbourhood, not the model.

---

## 3. Core product loop

```text
Open Wanderfound
    ↓
Grant foreground location
    ↓
Choose duration, mood and party
    ↓
Retrieve nearby candidate places
    ↓
Filter for safety, accessibility and walkability
    ↓
Select five visually discoverable stages
    ↓
Generate one grounded mystery
    ↓
Reveal stage 1 clue + exact walking path to a small search zone
    ↓
Player walks and submits a photograph
    ↓
GPS + visual AI verify the discovery
    ↓
Story reacts; next stage unlocks
    ↓
After stage 2: unlock stages 3–5
    ↓
Complete mystery and receive journey card
```

---

## 4. Initial users and occasions

### Primary user

A traveller already present in a walkable neighbourhood who has 30–90 unplanned minutes and wants something more engaging than a list or self-guided tour.

### Secondary users

- solo travellers seeking purpose while wandering;
- couples seeking an unplanned date;
- groups of friends seeking a shared activity;
- families seeking a playable walk;
- locals seeking to see a familiar area differently.

### Initial job to be done

> “Give us something memorable to do around here, right now, without a booking or guide.”

### Not an initial user

- users seeking transport or trip logistics;
- users wanting a comprehensive historical tour;
- hikers in remote or poorly mapped terrain;
- children walking without an adult;
- users requiring guaranteed accessibility before that data is reliable.

---

## 5. V0 scope

### Required

- mobile-first responsive web app;
- installable PWA where supported;
- Google sign-in required before adventure setup or gameplay;
- persistent account ownership across refreshes and supported devices;
- foreground GPS permission;
- 30- and 60-minute adventure options;
- four moods: historical, culinary, strange and beautiful;
- solo, couple/friends and family party selection;
- automatic nearby-place retrieval;
- five-stage grounded mystery;
- exact pedestrian path and turn guidance displayed on a beautiful map;
- automatic rerouting when the player leaves the path;
- one stage revealed at a time;
- GPS and photograph verification;
- hint system;
- rerouting or graceful stage replacement;
- stage progress and session persistence;
- first two stages free;
- ₹149 full-adventure unlock in Razorpay test mode, then live mode;
- completion screen and shareable journey card;
- event analytics;
- feedback prompt;
- safety and privacy disclosures.

### Explicitly excluded

- native iOS or Android app;
- social graph or public user profiles;
- monthly subscription;
- leaderboards, streaks or collectibles;
- AR objects or 3D Pokémon-style world;
- user-generated trails;
- local-business dashboards;
- bookings or restaurant ordering;
- voice conversation;
- background location tracking;
- anonymous guest mode;
- offline mode;
- multiple languages;
- multiplayer synchronisation across devices;
- manual trail authoring as the primary engine.

---

## 6. Experience design

### Product feeling

The app should feel like an illustrated field instrument crossed with a mystery novel—not like a default navigation map with a chat panel.

### Visual principles

- Map is the main canvas.
- Undiscovered areas are softened by mist or desaturation.
- The exact safe walking path is visible; the place name and clue answer remain concealed.
- The route ends at a small public search zone. Navigation is solved for the player;
  noticing the correct real-world detail remains the game.
- One warm accent colour represents discovery.
- Clues appear as compact, cinematic cards.
- Typography should feel editorial and readable outdoors.
- Animation communicates state: generating, searching, verifying and unlocking.
- Controls must remain usable in bright sunlight and one-handed.
- Loading should be narrativised but never conceal excessive latency.

### Beauty boundary for V0

Beautiful means:

- a custom map style;
- disciplined typography and colour;
- smooth map and card transitions;
- thoughtful empty, loading and error states;
- satisfying verification feedback;
- coherent illustrations/icons.

Beautiful does not yet mean:

- 3D avatars;
- a fully modelled game world;
- augmented-reality creatures;
- elaborate cutscenes.

### Initial screens

1. **Arrival**
   - logo and one-line promise;
   - `Begin where I am`;
   - foreground-location explanation.
2. **Adventure setup**
   - duration;
   - mood;
   - party.
3. **World reading**
   - animated map;
   - transparent generation stages;
   - cancel/retry.
4. **Adventure opening**
   - mystery premise;
   - safety summary;
   - start.
5. **Active stage**
   - clue;
   - exact pedestrian path from the player’s current position;
   - turn-by-turn walking instructions;
   - small destination search zone without the place name or clue answer;
   - compass/distance;
   - automatic rerouting;
   - hint and camera actions.
6. **Camera/verification**
   - capture or upload;
   - location accuracy;
   - verifying state;
   - pass, retry or inconclusive outcome.
7. **Discovery**
   - what was found;
   - one grounded fact;
   - story consequence;
   - next stage.
8. **Paywall after stage 2**
   - progress `2 of 5`;
   - remaining time;
   - obscured remaining chapters;
   - ₹149 unlock;
   - exit without coercion.
9. **Completion**
   - mystery resolution;
   - map and photographs;
   - distance/time;
   - one-tap share card;
   - “Would you play another?”

---

## 7. Grounding and place selection

### Non-negotiable rule

The language model may choose from provided candidates. It may not create a new place, alter coordinates or invent a factual attribute.

### Candidate sources

Use provider interfaces from the beginning:

```ts
interface PlacesProvider {
  nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]>;
}

interface RoutingProvider {
  walkingRoute(input: WalkingRouteInput): Promise<WalkingRoute>;
}

interface KnowledgeProvider {
  enrich(place: PlaceCandidate): Promise<GroundedPlaceFacts>;
}
```

Recommended MVP defaults:

- **Map:** Google Maps JavaScript API with cloud-based styling, custom overlays,
  Advanced Markers and WebGL Overlay View where justified.
- **Walking routes:** Google Routes API.
- **Nearby POIs:** Google Places API (New).
- **Historical enrichment:** Wikidata/Wikipedia where a confident entity match exists.
- **Additional public-space data:** OpenStreetMap through an approved hosted service or a compliant self-hosted extract—not an overloaded public Overpass instance in production.

Important: Google Routes results displayed on a map must be displayed on a Google Map,
and Google Places results displayed on a map must also be displayed on a Google Map with
the required attribution. Do not mix Google Places or Routes results into a Mapbox map
under standard Google Maps Platform terms. Do not build a permanent proprietary place
database by silently storing Google Places responses. Store stable place IDs and only
other content permitted by the provider terms. Long-term playability data must come
from first-party observations, user interactions, open/licensed data or explicit
commercial rights.

### Candidate schema

```ts
type PlaceCandidate = {
  provider: string;
  providerPlaceId: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  openingStatus: "open" | "closed" | "unknown";
  publicAccess: "yes" | "no" | "unknown";
  indoorOutdoor: "indoor" | "outdoor" | "mixed" | "unknown";
  sourceAttributions: string[];
  groundedFacts: Array<{
    text: string;
    sourceUrl: string;
    confidence: number;
  }>;
  visualSignals: string[];
};
```

### Hard filters

Reject a candidate if:

- confirmed closed during the expected visit;
- private, ticketed or access-restricted in V0;
- route requires a motorway, unsafe crossing or vehicle transport;
- in/adjacent to water, cliff, railway, construction or another obvious hazard;
- place cannot be reached from a pedestrian route;
- destination requires entering a religious/residential/private space;
- coordinates or identity are ambiguous;
- no visually verifiable public feature exists;
- it would require buying something;
- the only available fact is ungrounded model knowledge.

### Culinary rules

Culinary stages are allowed only when:

- venue is confidently open;
- clue can be completed from a public area;
- purchase is optional;
- the stage does not require eating or drinking;
- no health, allergy or dietary claim is generated;
- the experience clearly labels commercial venues;
- the system has a non-culinary replacement if conditions change.

V0 example: identify a local preparation from signage, display or architecture.  
Not V0: require the player to order and consume it.

### Candidate scoring

Score candidates on:

- visual distinctiveness;
- grounded information confidence;
- public accessibility;
- pedestrian-route confidence;
- category diversity;
- opening confidence;
- distance contribution;
- novelty versus other selected stages;
- suitability for mood and party;
- expected photo-verification reliability.

### Trail viability

Generate only if:

- at least eight safe candidates survive filtering;
- five high-confidence stages can be selected;
- total walking time fits the chosen duration with buffer;
- all consecutive walking routes are valid;
- at least three different discovery categories are represented;
- no stage confidence falls below the configured threshold.

Otherwise:

- expand radius once within the duration limit;
- offer a nearby starting area if available;
- or return “No reliable adventure here yet.”

A truthful refusal is preferable to a fabricated trail.

### Navigation principle

The route is not the puzzle. Wanderfound must show the exact pedestrian path the player
should follow, including turns, until the player reaches a small public search zone.
The mystery begins there: the user must interpret the clue and notice the relevant
feature in the surroundings.

- Do not deliberately make the player take a wrong or ambiguous street.
- Do not hide turns to manufacture difficulty.
- Do not reveal the venue/place name before verification.
- Route to a public, pedestrian-safe approach point rather than a private entrance or
  unsafe provider centroid wherever the data permits.
- Recalculate the route if the user meaningfully deviates.
- When the user enters the search zone, visually soften the route and emphasise the
  clue and surroundings.
- Ask the user to stop walking before reading a clue, opening the camera or interacting
  with controls.

---

## 8. Trail generation

### Generation sequence

1. Capture start location, local time and user selections.
2. Retrieve candidate places within a duration-derived radius.
3. Apply hard safety and accessibility filters.
4. Enrich the strongest candidates with grounded facts.
5. Create several possible five-stop combinations.
6. request walking routes and calculate real durations.
7. score combinations and select the best route.
8. give the AI only the selected candidate objects and permitted facts.
9. generate structured trail JSON.
10. validate the JSON against schema and business rules.
11. run a second deterministic check:
    - every stage references a real candidate ID;
    - every fact has a source;
    - no exact destination leaks into early clue text;
    - verification criteria are observable;
    - route time remains within the selected duration.
12. persist the session and begin.

### AI output schema

```ts
type Trail = {
  title: string;
  premise: string;
  mood: "historical" | "culinary" | "strange" | "beautiful";
  estimatedMinutes: number;
  estimatedDistanceM: number;
  safetySummary: string[];
  stages: TrailStage[];
  finale: string;
};

type TrailStage = {
  index: 1 | 2 | 3 | 4 | 5;
  candidateId: string;
  chapterTitle: string;
  clue: string;
  hint1: string;
  hint2: string;
  searchRadiusM: number;
  verification: {
    requiredVisualElements: string[];
    forbiddenAssumptions: string[];
    maxGpsDistanceM: number;
  };
  groundedReveal: {
    text: string;
    sourceUrls: string[];
  };
  storyConsequence: string;
};
```

### Generation constraints

- Clues must refer only to publicly observable features.
- Avoid cryptic wordplay that requires cultural knowledge not provided.
- Never ask users to touch, move, climb or trespass.
- Avoid photographing identifiable strangers or children.
- Do not instruct users to photograph inside private establishments.
- Never present legends as established fact.
- If a source is ambiguous, label the reveal accordingly or omit it.
- Story fiction may connect stages, but must be clearly distinguishable from factual reveals.

---

## 9. Verification

### Verification inputs

- current GPS coordinates and accuracy;
- destination coordinates;
- server timestamp;
- photograph;
- required visual elements;
- stage-specific disallowed shortcuts.

### Decision logic

```text
GPS outside maximum radius
    → fail with movement guidance

GPS accuracy too poor
    → inconclusive; ask user to wait/retry

GPS within radius + visual elements confidently present
    → pass

GPS within radius + image ambiguous
    → inconclusive; offer better capture instruction

GPS within radius + clearly wrong subject
    → fail gently; preserve attempt
```

Do not allow vision alone to pass a stage because an old internet photograph could be uploaded. Do not allow GPS alone to pass because the user may be near the location without noticing the relevant detail.

### Anti-frustration rules

- After two inconclusive attempts, offer a more explicit hint.
- After three failed attempts, allow a “skip stage” path and record it.
- A skip must not block the paid completion.
- Never shame the player.
- Every failure response should contain one specific corrective action.

### Photo privacy

- Explain why the photograph is required.
- Use private storage and signed URLs.
- Strip unnecessary metadata where feasible.
- Delete raw verification photos after a short documented retention period unless the user explicitly saves them to the final journey card.
- Do not use player photos for model training without separate opt-in.

---

## 10. Safety

Wanderfound is an exploration product, not a safety guarantee.

### V0 safety controls

- foreground location only;
- daylight-aware trail eligibility;
- weather warning and rain fallback where data is available;
- avoid isolated natural areas after dark;
- avoid routes involving beaches, cliffs, rivers or railways in adverse conditions;
- clear “remain aware of traffic and surroundings” message;
- emergency exit that reveals the normal map and current location;
- pause/end trail at any time;
- report unsafe/inaccessible stage;
- no instructions to look at the screen while crossing;
- no background route tracking;
- adults responsible for accompanying children.

### Safety telemetry

Track:

- unsafe-stage report;
- inaccessible-stage report;
- reroute request;
- route abandonment;
- GPS mismatch;
- weather cancellation.

Any unsafe-stage report should flag that candidate for review and temporarily reduce or remove its eligibility.

---

## 11. Recommended technical architecture

### Front end

- Next.js with TypeScript;
- App Router;
- PWA manifest and service worker for shell assets;
- Google Maps JavaScript API;
- Google cloud-based map styling, Advanced Markers and custom 2D/WebGL overlays;
- accessible component primitives;
- CSS variables/design tokens;
- lightweight motion library;
- browser Geolocation and Media Capture APIs;
- mobile-first portrait layout.

### Server

- Next.js server routes/actions for V0;
- schema validation for every AI and provider response;
- server-only provider secrets;
- idempotent stage-verification and payment endpoints;
- rate limiting on generation and verification;
- structured logging with session IDs.

### Data

- Supabase Postgres;
- Supabase Auth with Google OAuth as the only sign-in method;
- every profile, adventure and progress row owned by a verified `auth.uid()`;
- Row Level Security;
- Supabase private Storage for verification photographs;
- automatic deletion job for expired adventures and raw photos.

Use dynamic rendering where session identity matters and add abuse prevention to
generation, verification and payment routes. RLS must use `auth.uid()` for ownership.
Google sign-in must use PKCE, validated redirect URLs and secure cookies. Provide
logout, account deletion and expired-auth recovery. Changing a URL or client payload
must never transfer ownership.

### AI

Use a provider adapter:

```ts
interface TrailAIProvider {
  generateTrail(input: GroundedTrailInput): Promise<Trail>;
  verifyPhoto(input: PhotoVerificationInput): Promise<VerificationResult>;
}
```

Requirements:

- structured outputs;
- multimodal image understanding;
- model and prompt version recorded per generation;
- no provider key in the browser;
- strict token, latency and retry budgets;
- deterministic validation around probabilistic output.

### Payments

- Razorpay Standard Checkout;
- create orders server-side;
- verify signatures server-side;
- use webhooks as the source of truth;
- make unlock idempotent;
- begin in test mode.

### Analytics

Use a lightweight product-analytics provider or first-party event table. PostHog is a reasonable default if configured with privacy controls.

### Deployment

- Vercel or compatible Node hosting;
- production HTTPS is mandatory for geolocation and camera permissions;
- preview deployment per branch;
- error monitoring before field tests.

### Environment variables

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
GOOGLE_MAPS_SERVER_API_KEY=
AI_API_KEY=
AI_TEXT_MODEL=
AI_VISION_MODEL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Do not commit real values. Provide `.env.example`.

---

## 12. Minimal data model

### `adventure_sessions`

- `id`
- `user_id` (the owning Google-authenticated Supabase user)
- `status`
- `start_lat`
- `start_lng`
- `duration_minutes`
- `mood`
- `party_type`
- `trail_json`
- `route_json`
- `generation_model`
- `prompt_version`
- `created_at`
- `expires_at`

### `profiles`

- `user_id` (references the Supabase Auth user)
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`

Keep the profile private in V0. Do not create public profile pages or a social graph.

### `stage_progress`

- `id`
- `session_id`
- `stage_index`
- `status`
- `attempt_count`
- `started_at`
- `completed_at`
- `skipped_at`
- `verification_result_json`

### `verification_attempts`

- `id`
- `session_id`
- `stage_index`
- `photo_storage_path`
- `capture_lat`
- `capture_lng`
- `location_accuracy_m`
- `visual_confidence`
- `gps_distance_m`
- `decision`
- `reason_code`
- `model_version`
- `created_at`
- `delete_after`

### `payments`

- `id`
- `session_id`
- `provider`
- `provider_order_id`
- `provider_payment_id`
- `amount_minor`
- `currency`
- `status`
- `signature_verified_at`
- `created_at`

### `stage_reports`

- `id`
- `session_id`
- `stage_index`
- `report_type`
- `comment`
- `created_at`

Do not create a permanent POI table from provider responses until licensing and provenance rules are resolved.

---

## 13. Analytics

### Funnel events

```text
landing_viewed
location_prompt_viewed
location_granted
location_denied
setup_completed
trail_generation_started
trail_generation_succeeded
trail_generation_failed
trail_started
stage_viewed
hint_requested
camera_opened
verification_submitted
verification_passed
verification_failed
verification_inconclusive
stage_skipped
stage_completed
paywall_viewed
checkout_started
payment_succeeded
payment_failed
trail_completed
journey_card_shared
another_trail_requested
unsafe_stage_reported
trail_abandoned
```

### Required event properties

- privacy-preserving adventure session ID;
- source/QR campaign;
- broad area identifier, not unnecessarily precise location in analytics;
- adventure duration and mood;
- stage index;
- app version;
- model/prompt version;
- generation latency;
- verification latency;
- reason code;
- device/browser category.

### Primary metrics

- successful trail generation rate;
- stage 1 completion rate;
- stage 2 completion rate;
- paywall-to-purchase conversion;
- paid trail completion rate;
- another-trail intent;
- passive acquisition starts;
- human intervention rate;
- unsafe/inaccessible stage rate;
- verification false-reject rate.

---

## 14. Monetisation

### V0

- stages 1–2: free;
- stages 3–5 and finale: ₹149;
- one purchase unlocks the adventure for the current party/device;
- no subscription;
- optional complimentary test code for usability sessions.

### Paywall principles

- appear only after stage 2 is completed;
- display what remains without revealing locations;
- state remaining time and distance;
- preserve completed progress;
- no fake countdown or manipulative scarcity;
- allow the player to leave gracefully.

### Subscription trigger

Do not build membership until at least 20% of paying users begin or explicitly request another adventure within 30 days.

Possible later membership:

- several adventures per month, not unlimited initially;
- home-city and travel use;
- date/family modes;
- seasonal mysteries;
- persistent passport and collections.

---

## 15. Milestones

### Milestone 0 — Foundation

- [x] Create repository/app scaffold.
- [x] Add TypeScript, linting, formatting and test runner.
- [x] Add `.env.example`.
- [x] Add basic CI checks.
- [x] Deploy the foundation over HTTPS.
- [x] Establish design tokens and mobile shell.
- [x] Add privacy, safety and provider-abstraction placeholders.

Acceptance:

- app loads on an actual phone over HTTPS;
- automated checks pass;
- no secret is committed.

### Milestone 1 — Location and beautiful map

- [x] Explain and request foreground location.
- [x] Handle denied, unavailable and imprecise states.
- [ ] Display current position on a custom Google Maps style.
- [ ] Add mist/search-area visual treatment.
- [ ] Add duration, mood and party setup.
- [ ] Require Google sign-in before setup or gameplay.
- [ ] Persist and recover the authenticated session securely.

Acceptance:

- user can open the deployed PWA, grant location and see the correct area;
- denied location has a useful recovery flow;
- no background permission is requested.

### Milestone 2 — Candidate and routing engine

- [ ] Implement `PlacesProvider`.
- [ ] Implement `RoutingProvider`.
- [ ] Retrieve nearby candidates.
- [ ] Apply hard filters.
- [ ] request walking routes.
- [ ] score candidate combinations.
- [ ] return a playability decision.
- [ ] Add mocked-provider tests.

Acceptance:

- three contrasting test locations either produce five plausible stages or a truthful refusal;
- route duration fits the selected duration;
- no manually selected Goa list is required.

### Milestone 3 — Grounded AI mystery

- [ ] Implement `KnowledgeProvider`.
- [ ] Implement structured `TrailAIProvider`.
- [ ] Build schema validation.
- [ ] Add deterministic post-generation checks.
- [ ] Show premise, clue and search area.
- [ ] Record source URLs and model/prompt versions.

Acceptance:

- every stage maps to a supplied candidate;
- every factual reveal has provenance;
- invalid output fails closed and retries safely;
- no unrevealed destination name leaks into the clue.

### Milestone 4 — Game-state loop

- [ ] Implement state machine for five stages.
- [ ] Add map route and stage card.
- [ ] Add two-level hints.
- [ ] Add progress persistence.
- [ ] Add skip and stage-report flows.
- [ ] Add discovery/unlock animation.

Acceptance:

- refresh/reopen does not lose current progress;
- locked stages cannot be opened client-side;
- transitions have unit tests.

### Milestone 5 — GPS and photo verification

- [ ] Capture/upload photograph.
- [ ] Store privately with expiry.
- [ ] calculate GPS distance and accuracy.
- [ ] run visual verification.
- [ ] implement pass/fail/inconclusive logic.
- [ ] add retry and anti-frustration rules.
- [ ] delete expired raw photos.

Acceptance:

- correct on-location photo passes;
- wrong remote photo fails;
- poor GPS/image returns inconclusive rather than a fabricated judgement;
- provider secrets and private photos never reach public URLs.

### Milestone 6 — Payment

- [ ] Show paywall after stage 2.
- [ ] create Razorpay order server-side.
- [ ] integrate Standard Checkout in test mode.
- [ ] verify signature and webhook.
- [ ] unlock idempotently.
- [ ] record payment funnel.

Acceptance:

- test payment unlocks stages 3–5;
- client-side tampering cannot unlock;
- duplicate webhook does not duplicate state.

### Milestone 7 — Completion and field instrumentation

- [ ] Build finale.
- [ ] Generate shareable journey card.
- [ ] Add one-question feedback.
- [ ] Add source-tagged QR URLs.
- [ ] Add internal session-debug view protected from public access.
- [ ] Add error monitoring and field logs.
- [ ] Add emergency exit to normal map.

Acceptance:

- complete end-to-end trail works on a real phone;
- every funnel event is visible;
- a tester can complete without founder intervention.

### Milestone 8 — Field polish

- [ ] Test in bright sunlight.
- [ ] Test weak network and low GPS accuracy.
- [ ] Compress photo uploads.
- [ ] meet basic accessibility targets.
- [ ] test battery impact.
- [ ] add graceful provider/time-out fallbacks.
- [ ] run safety and privacy checklist.

Acceptance:

- ten self-run sessions across at least three areas;
- at least eight valid trails;
- no known critical safety, payment or privacy defect.

---

## 16. Goa field plan

Goa is both the first serious product laboratory and the first distribution experiment.

### Phase A — Founder self-testing

Test multiple automatically generated trails in:

- a dense heritage/commercial area;
- a tourist-heavy coastal area;
- a quieter residential area.

Do not manually author trails to make Goa look successful.

Record:

- rejected candidates;
- inaccessible/closed places;
- unsafe routing;
- weak clues;
- false verification results;
- generation and verification latency;
- weather failures.

### Phase B — In-person product testing

Recruit tourists already walking:

> “I’m building an AI that turns wherever you are into a mystery trail. The first two discoveries take about fifteen minutes. Would you try it while I observe?”

Rules:

- recruit and observe;
- do not guide;
- if they get stuck, record the failure before helping;
- first five complete trails may use a complimentary test code;
- next twenty should encounter the real ₹149 paywall.

### Phase C — Passive distribution

Place QR cards in hostels, cafés and traveller gathering points.

Card:

> **Turn the streets around you into an AI mystery.**  
> First two discoveries free. No download. Start here.

Each placement receives a unique source:

```text
https://wanderfound.app/start?source=venue-code
```

Leave the venue. Passive scans, starts and purchases—not founder explanations—are the distribution evidence.

### Initial field thresholds

Target:

- 30 tourists start;
- 20 complete stage 1;
- 15 complete stage 2;
- 5 purchase;
- 4 paid users complete;
- 3 purchases or meaningful starts occur without founder recruitment;
- at least 2 users request another trail;
- fewer than 5% of stages receive a safety report;
- photo verification succeeds without assistance at least 80% of the time.

Interpretation:

- scans low → positioning/placement failure;
- location grants low → trust/onboarding failure;
- stage 1 completion low → clue, route or verification failure;
- stage 2 high but payment low → insufficient value;
- purchase high but completion low → paid experience disappoints;
- founder-recruited use works but QR use does not → distribution remains unproven;
- repeat requests appear → investigate membership.

---

## 17. Key risks

### Hallucinated or weak place knowledge

Mitigation:

- fact allow-list;
- source provenance;
- structured output;
- deterministic validation;
- truthful refusal.

### Unsafe or inaccessible route

Mitigation:

- hard filters;
- real walking routes;
- daylight/weather rules;
- user reports;
- automatic candidate suppression;
- emergency map exit.

### Beautiful story, boring discoveries

Mitigation:

- visual-distinctiveness scoring;
- diverse stage categories;
- test “would I notice this without the app?”;
- completion and skip telemetry.

### Verification frustration

Mitigation:

- GPS + vision;
- inconclusive state;
- explicit capture guidance;
- hint escalation;
- skip after repeated failure.

### “Works anywhere” proves false

Mitigation:

- playability score;
- supported-area language;
- nearby-start suggestion;
- measure coverage rather than bluffing universality.

### Product is a one-time novelty

Mitigation:

- test another-trail behaviour;
- multiple moods;
- local/date/family occasions later;
- do not build subscription before repeat demand.

### Consumer distribution is expensive

Mitigation:

- physical QR acquisition where travellers already are;
- shareable completion artifact;
- source-level funnel measurement;
- revenue share only after channel evidence.

### Provider cost or licence constraints

Mitigation:

- adapters;
- caching only where permitted;
- budget limits;
- open/licensed data strategy;
- record provenance and terms.

---

## 18. Post-MVP backlog

Do not implement until the core loop and payment show evidence.

- membership;
- persistent explorer passport;
- date mode;
- family mode;
- multiplayer;
- weekly local mystery;
- seasonal quests;
- saved photographs and journals;
- voice narration;
- multilingual clues;
- offline adventures;
- native mobile app;
- creator-authored world packs;
- local-guide partnerships;
- museum/campus modes;
- accessibility-specific routing;
- richer culinary experiences;
- AR objects and characters;
- recommendation/referral loop;
- permanent first-party playability graph.

---

## 19. Validation ladder

1. **Technical:** five-stage trail can be generated automatically.
2. **Usability:** stranger completes two stages without help.
3. **Value:** stranger pays to continue.
4. **Satisfaction:** paying stranger completes.
5. **Repeat:** user asks for or begins another.
6. **Distribution:** passive channel creates starts/purchases.
7. **Generality:** results repeat across several neighbourhood types.
8. **Retention:** recurring local use supports membership.

Do not claim the next level before the preceding behaviour exists.

---

## 20. Decision log

### 2026-07-29

- GPS accuracy is classified consistently as strong (≤25 m), usable (≤100 m),
  weak (≤250 m) or unusable (>250 m). Only strong and usable readings may advance.
- The latest validated browser location is cached in session storage for at most
  fifteen minutes. It is scoped to the current tab, validated before reuse and never
  added to analytics.
- Google Maps loads on demand through a provider-neutral front-end boundary after
  location is ready. The browser key is restricted to Wanderfound web origins and
  the Maps JavaScript API; the JavaScript Map ID controls cloud styling separately.
- The player appears as a small dot inside the browser-provided accuracy radius.
  Default map controls and clickable place icons are disabled, while Google attribution
  remains visible and touch gestures use cooperative handling.

### 2026-07-28

- The workspace was a new product plan with no existing application code; Milestone 0
  created a Next.js TypeScript App Router application, preserving `plan.md` as the
  product source of truth.
- Sites private hosting served only as the first HTTPS scaffold preview. Vercel was then
  selected as the primary preview and production host because it runs the chosen Next.js
  architecture natively and simplifies Supabase SSR, Google OAuth callbacks and server
  routes. Goa testers will use the public Vercel URL or `wanderfound.app`, not a ChatGPT
  Sites URL.
- Node.js 22.14 and npm were pinned for reproducible local and CI builds.
- Exact pedestrian paths and turn guidance are now required for every active stage.
- Navigation is not treated as the puzzle: Wanderfound guides the player to a small,
  public search zone while concealing the place name and visual answer.
- Rerouting is required when the player meaningfully leaves the path.
- Google Maps JavaScript API selected for the V0 visual map, using custom styling and
  overlays so the experience does not resemble a default navigation product.
- Google Places API (New) and Google Routes API selected for Goa POIs and walking routes.
- Google Places and Routes content displayed on maps must remain on a Google Map in
  accordance with provider policy; provider interfaces remain to limit coupling.
- Supabase Auth with Google OAuth selected as the only V0 sign-in method. A user must
  sign in before adventure setup or gameplay; anonymous guest accounts are not created.
- Supabase retained for session data and private photo storage.
- Supabase integration uses the current publishable-key model and `@supabase/ssr`
  cookie clients. Server authorization must validate identity with `getClaims()` rather
  than trusting unverified session data. The elevated secret key remains server-only and
  is not required until an administrative server operation is implemented.
- Google OAuth credentials live in Supabase provider settings rather than application
  environment variables. Wanderfound receives a Supabase session after PKCE callback;
  all product rows use that verified user's `auth.uid()` from creation onward.
- Foreground location is requested only after an explicit user tap. Location analytics
  record outcome categories and coarse accuracy labels, never latitude or longitude.

### 2026-07-27

- Working name selected: Wanderfound.
- Mobile PWA chosen over native app for first field test.
- Automatic generation retained as the central hypothesis.
- Goa chosen as first serious product and distribution laboratory.
- First two stages free; remaining three cost ₹149.
- Subscription deferred until repeat demand exists.
- Public, visual discoveries prioritised; culinary stages constrained.
- AI is backstage; grounded facts and generated fiction remain separate.
- Razorpay Standard Checkout proposed for Indian payment testing.

---

## 21. Technical references

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google cloud-based maps styling](https://developers.google.com/maps/documentation/javascript/cloud-customization)
- [Google Routes API](https://developers.google.com/maps/documentation/routes)
- [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview)
- [Google Maps Platform policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)

---

## 22. Ultra-granular execution backlog

This section converts the milestones above into independently executable tickets.
The sequence is deliberate. Do not begin a ticket whose dependencies are incomplete.

The dates below are a build cadence, not a deadline for abandoning the company. If a
ticket takes longer, preserve correctness and field testability rather than silently
cutting safety, grounding, analytics or verification.

### Ticket format

Every completed ticket must leave behind:

- working implementation;
- relevant automated tests;
- a reproducible manual test;
- analytics where the user crosses a meaningful funnel boundary;
- any new environment variable in `.env.example`;
- a short decision-log entry if the implementation differs materially from this plan.

### Epic 0 — Repository and deployable shell

#### WF-000 — Inspect the starting workspace

Depends on: nothing

- [x] List existing files, frameworks, lockfiles and configuration.
- [x] Check for uncommitted user work and preserve it.
- [x] Check Node and package-manager versions.
- [x] Search for existing design tokens, components and environment handling.
- [x] Record whether this is a new app or an extension of an existing one.

Done when:

- Codex can state the current architecture and what it will preserve;
- no code has been overwritten merely to match this plan.

#### WF-001 — Scaffold the application

Depends on: WF-000

- [x] Create or confirm a Next.js TypeScript App Router project.
- [x] Choose and pin the package manager already used by the workspace.
- [x] Add development, build, lint, typecheck and test scripts.
- [x] Add a supported Node version declaration.
- [x] Add `.gitignore`.
- [x] Add `.env.example` with placeholders only.
- [x] Add a minimal README with local-start instructions.

Done when:

- clean install succeeds;
- development server starts;
- production build succeeds;
- no credentials appear in tracked files.

#### WF-002 — Testing and continuous checks

Depends on: WF-001

- [x] Configure a unit-test runner.
- [x] Configure DOM/component testing.
- [x] Configure one browser smoke test.
- [x] Add a CI workflow for install, lint, typecheck, test and build.
- [x] Add one intentionally simple passing unit test.
- [x] Add one smoke test that loads the arrival route.

Done when:

- all checks pass locally;
- the same commands can run non-interactively in CI.

#### WF-003 — Application shell and design tokens

Depends on: WF-001

- [x] Create colour, typography, spacing, radius, elevation and motion tokens.
- [x] Establish light-first outdoor-readable contrast.
- [x] Add global safe-area handling for modern phones.
- [x] Add full-height mobile viewport handling without brittle `100vh` assumptions.
- [x] Add base button, icon button, card, sheet, notice and loading primitives.
- [x] Add visible keyboard focus and reduced-motion handling.
- [x] Build the arrival-screen shell using real copy.

Done when:

- arrival screen works at 320 px width and common modern phone widths;
- controls remain usable with large text;
- no component depends on a mouse hover.

#### WF-004 — Preview deployment and runtime diagnostics

Depends on: WF-002, WF-003

- [x] Configure preview deployment.
- [x] Confirm HTTPS.
- [x] Add a `/health` endpoint without secret values.
- [x] Add structured server logging.
- [x] Add an application version/build identifier.
- [x] Add a generic user-safe error boundary.

Done when:

- the deployed URL opens on the founder’s phone;
- `/health` reports a healthy build;
- a simulated error produces a graceful recovery screen.

### Epic 1 — Location, setup and map

#### WF-100 — Location permission education

Depends on: WF-003

- [x] Explain why foreground location is needed before invoking the browser prompt.
- [x] State that Wanderfound does not request background location.
- [x] Add `Not now` and retry paths.
- [x] Track prompt viewed, granted and denied.
- [x] Avoid requesting permission automatically on page load.

Done when:

- the browser prompt appears only after a user action;
- declining does not trap the user;
- analytics distinguishes denial from technical failure.

#### WF-101 — Geolocation service

Depends on: WF-100

- [x] Wrap browser geolocation behind an application service.
- [x] Capture latitude, longitude, accuracy and timestamp.
- [x] Define acceptable, weak and unusable accuracy thresholds.
- [x] Handle unsupported browser, timeout, denial and unavailable states.
- [x] Add a retry that does not reload the application.
- [x] Add unit tests with mocked browser responses.

Done when:

- every geolocation failure maps to a specific recovery state;
- the raw browser API is not scattered across UI components.

#### WF-102 — Map provider boundary

Depends on: WF-003

- [x] Define the front-end map interface.
- [x] Add Google Maps browser-key and map-ID validation.
- [x] Load the map only on the client.
- [x] Render the player’s approximate location and accuracy circle.
- [x] Disable unnecessary Google Maps controls.
- [x] Add attribution in compliance with provider requirements.
- [x] Provide a useful missing-token development state.

Done when:

- the current location displays correctly on a deployed phone;
- the app does not crash when the token is absent.

#### WF-103 — Wanderfound map treatment

Depends on: WF-102

- [ ] Apply a custom base-map style.
- [ ] De-emphasise irrelevant labels and road clutter.
- [ ] Add the mist/fog overlay.
- [ ] Add a reusable glowing search-area layer.
- [ ] Add route and discovered-stage layers.
- [ ] Respect reduced motion.
- [ ] Test readability in simulated bright light.

Done when:

- the map feels branded rather than like an embedded default map;
- the exact hidden destination can remain concealed.

#### WF-104 — Adventure setup

Depends on: WF-003

- [ ] Add 30- and 60-minute duration selection.
- [ ] Add historical, culinary, strange and beautiful moods.
- [ ] Add solo, couple/friends and family party modes.
- [ ] Provide one-sentence explanations rather than ambiguous icons.
- [ ] Validate a complete selection before continuing.
- [ ] Track setup completion and selected values.

Done when:

- a user can complete setup one-handed;
- selections survive a refresh within the session.

#### WF-105 — Google account and session lifecycle

Depends on: WF-104

- [ ] Require authentication before setup and adventure routes.
- [ ] Configure Supabase Auth with Google OAuth and PKCE.
- [ ] Add sign-in, callback, logout, account deletion and expired-auth recovery.
- [ ] Redirect signed-out protected-route requests to sign-in.
- [ ] Redirect signed-in sign-in requests back to the adventure flow.
- [ ] Add authenticated, signed-out and session-lifecycle tests.

Done when:

- refresh preserves the signed-in session and setup;
- expired or malformed sessions recover safely;
- a returning Google user can resume their active adventure;
- changing a URL or client payload cannot claim another user's adventure.

### Epic 2 — Candidate discovery and playability

#### WF-200 — Domain types and provider contracts

Depends on: WF-002

- [ ] Implement the `PlaceCandidate`, route and grounded-fact schemas.
- [ ] Implement `PlacesProvider`, `RoutingProvider` and `KnowledgeProvider` contracts.
- [ ] Add provider-specific error types.
- [ ] Add source attribution and licensing metadata.
- [ ] Create deterministic mock providers and fixtures.

Done when:

- all downstream code can be developed against mocks;
- malformed provider data is rejected at the boundary.

#### WF-201 — Nearby-place retrieval

Depends on: WF-200

- [ ] Translate duration into an initial search radius.
- [ ] Map Wanderfound categories to Google Places types.
- [ ] Retrieve candidates server-side.
- [ ] Normalise provider responses.
- [ ] Deduplicate near-identical candidates.
- [ ] Enforce provider result and latency limits.
- [ ] Log provider failure without exposing keys or precise user location unnecessarily.

Done when:

- fixtures and at least one live urban location return normalised candidates;
- duplicate branches of the same venue do not dominate selection.

#### WF-202 — Deterministic hard filters

Depends on: WF-201

- [ ] Implement every hard filter from Section 7 as a named rule.
- [ ] Return a reason code for every rejection.
- [ ] Treat unknown access conservatively.
- [ ] Add special handling for water, railway, motorway, cliff and private-property categories.
- [ ] Add religious-space boundary rules.
- [ ] Add purchase-not-required rules for culinary candidates.
- [ ] Unit-test each filter independently.

Done when:

- a rejected candidate explains exactly why it failed;
- unsafe fixtures cannot be restored by an AI response.

#### WF-203 — Walking-route retrieval

Depends on: WF-200, WF-202

- [ ] Request real walking routes between points.
- [ ] Preserve Google Routes steps and route geometry for exact on-screen guidance.
- [ ] Reject routes with no pedestrian solution.
- [ ] Record route duration, distance and geometry.
- [ ] Handle provider timeout and rate limits.
- [ ] Add maximum detour and total-duration rules.
- [ ] Add route fixtures for success, no-route and excessive-duration cases.

Done when:

- straight-line distance is never presented as walking duration;
- a failed route removes the relevant combination.

#### WF-204 — Candidate scoring

Depends on: WF-202, WF-203

- [ ] Encode scoring weights in one configuration module.
- [ ] Score distinctiveness, confidence, accessibility, diversity and route contribution.
- [ ] Penalise repeated categories and clustered stops.
- [ ] Penalise unknown opening/access states.
- [ ] Return a score explanation for debugging.
- [ ] Add deterministic ranking tests.

Done when:

- the same candidate set produces the same ranking;
- scoring can be inspected without reading model prose.

#### WF-205 — Trail-combination search

Depends on: WF-204

- [ ] Generate bounded five-stop combinations.
- [ ] Avoid factorial explosion through pruning.
- [ ] Request/compose routes for viable combinations only.
- [ ] Require three or more discovery categories.
- [ ] Fit the chosen duration with a safety buffer.
- [ ] Select the best combination with a score breakdown.
- [ ] Return a truthful refusal if none qualifies.

Done when:

- urban fixtures produce a plausible five-stop ordering;
- sparse/unsafe fixtures return a clear unsupported-area result;
- no model call is required to decide physical viability.

#### WF-206 — Playability debug view

Depends on: WF-205

- [ ] Build a development-only view of retrieved, rejected and selected places.
- [ ] Display rejection reasons and scoring components.
- [ ] Display route duration and geometry.
- [ ] Redact provider secrets.
- [ ] Protect the route outside local development.

Done when:

- the founder can diagnose a bad trail without reading server logs.

### Epic 3 — Grounding and mystery generation

#### WF-300 — Knowledge enrichment

Depends on: WF-200, WF-205

- [ ] Match selected candidates to approved knowledge sources.
- [ ] Require a confidence threshold for entity matches.
- [ ] Store fact text, URL, source and match confidence in the session payload.
- [ ] Distinguish fact, disputed claim and folklore.
- [ ] Omit enrichment when identity is uncertain.
- [ ] Add fixtures for good, ambiguous and absent matches.

Done when:

- every retained fact can be traced to a source URL;
- ambiguous identity never silently becomes fact.

#### WF-301 — AI provider adapter

Depends on: WF-200

- [ ] Implement server-only AI configuration.
- [ ] Require structured output matching the Trail schema.
- [ ] Set explicit time, token and retry budgets.
- [ ] Record model and prompt versions.
- [ ] Classify timeout, refusal, invalid schema and provider failures.
- [ ] Add a mock AI provider for tests.

Done when:

- no AI key or raw provider error reaches the browser;
- tests run without spending model tokens.

#### WF-302 — Grounded trail prompt

Depends on: WF-300, WF-301

- [ ] Pass only selected candidates and approved facts.
- [ ] State prohibited behaviours explicitly.
- [ ] Require publicly observable verification elements.
- [ ] Require fiction/fact separation.
- [ ] Require clue difficulty appropriate to party mode.
- [ ] Require two escalating hints.
- [ ] Request concise outdoor-readable text.
- [ ] Add prompt version `v0.1`.

Done when:

- the model has no mechanism to introduce a coordinate or place outside the allow-list;
- the prompt can be versioned without altering old sessions.

#### WF-303 — Post-generation validator

Depends on: WF-302

- [ ] Validate schema.
- [ ] Confirm exactly five unique stage indices.
- [ ] Confirm every candidate ID belongs to the selection.
- [ ] Confirm all fact URLs belong to approved input facts.
- [ ] Reject clues leaking destination names.
- [ ] Reject unsafe verbs and instructions.
- [ ] Reject empty or non-observable verification elements.
- [ ] Enforce text-length budgets.
- [ ] Unit-test adversarial outputs.

Done when:

- invalid narrative cannot become an active trail;
- failures retry a bounded number of times and then fail truthfully.

#### WF-304 — World-reading generation experience

Depends on: WF-303, WF-103

- [ ] Create visible stages: reading surroundings, checking walkability, finding connections and preparing the mystery.
- [ ] Start generation only after setup and location are valid.
- [ ] Add cancel and retry.
- [ ] Add a maximum wait state with honest recovery.
- [ ] Do not fabricate progress percentages.
- [ ] Track latency and failure reason.

Done when:

- generation success opens the premise;
- failure never leaves an endless spinner.

#### WF-305 — Adventure opening

Depends on: WF-304

- [ ] Present title and premise.
- [ ] Present duration/distance estimates.
- [ ] Present factual safety summary.
- [ ] Show pause/end controls before start.
- [ ] Add explicit `Begin adventure`.
- [ ] Track generated and started separately.

Done when:

- opening the generated mystery does not automatically count as starting it.

### Epic 4 — Game state and clue experience

#### WF-400 — Trail state machine

Depends on: WF-303, WF-105

- [ ] Define generated, ready, active, verifying, discovered, paywalled, completed, abandoned and failed states.
- [ ] Define per-stage locked, active, passed, skipped and failed states.
- [ ] Put transition rules in one tested module.
- [ ] Make server state authoritative for unlocks.
- [ ] Add idempotency to repeated actions.
- [ ] Add exhaustive transition tests.

Done when:

- invalid transitions fail;
- refreshing during verification or discovery recovers consistently.

#### WF-401 — Active-stage map

Depends on: WF-400, WF-103

- [ ] Draw the exact pedestrian route from the player to a public search zone.
- [ ] Display turn guidance and remaining walking distance.
- [ ] Conceal the place name and clue answer until discovery.
- [ ] Recalculate when the player meaningfully deviates from the route.
- [ ] Fade the route after entry into the search zone so observation becomes primary.
- [ ] Show approximate distance without overclaiming GPS precision.
- [ ] Fit camera to player and search area.
- [ ] Pause animated camera changes while the user manipulates the map.
- [ ] Add traffic-awareness copy before walking.

Done when:

- the map helps movement without directly revealing the answer.

#### WF-402 — Clue card

Depends on: WF-400

- [ ] Display chapter title, clue and progress.
- [ ] Keep primary clue visible without scrolling on common phone sizes.
- [ ] Add hint 1 and hint 2 with explicit reveal actions.
- [ ] Track each hint.
- [ ] Add camera and accessibility/report actions.
- [ ] Disable duplicate verification submissions.

Done when:

- a stranger can identify every available action without explanation.

#### WF-403 — Discovery transition

Depends on: WF-400

- [ ] Add a short success animation and haptic where supported.
- [ ] Reveal the destination name only after success/skip.
- [ ] Separate sourced fact from story consequence visually.
- [ ] Link sources unobtrusively.
- [ ] Add `Continue` rather than automatically advancing.
- [ ] Respect reduced motion.

Done when:

- factual and fictional text cannot reasonably be confused.

#### WF-404 — Skip and reporting

Depends on: WF-400

- [ ] Permit skip only after configured attempts or an accessibility/safety report.
- [ ] Collect unsafe, inaccessible, closed, impossible and other reasons.
- [ ] Immediately prioritise safety reports.
- [ ] Preserve trail completion after skip.
- [ ] Mark skipped stages distinctly in the journey card.
- [ ] Add tests for abuse and repeated submission.

Done when:

- a user can escape a bad stage without founder intervention;
- safety reports are not hidden inside generic feedback.

### Epic 5 — Camera and verification

#### WF-500 — Camera capture

Depends on: WF-402

- [ ] Explain the photo’s purpose and retention.
- [ ] Support direct mobile capture and upload fallback.
- [ ] Validate content type and file size.
- [ ] Compress oversized images before upload where practical.
- [ ] Strip unnecessary metadata where practical.
- [ ] Preview and confirm before submission.
- [ ] Handle camera denial gracefully.

Done when:

- common iOS and Android browsers can provide an image;
- an unsupported file cannot reach model verification.

#### WF-501 — Private photo storage

Depends on: WF-500

- [ ] Create a private storage bucket.
- [ ] Generate non-guessable object paths.
- [ ] Permit access only for the owning session and verification service.
- [ ] Add deletion timestamp.
- [ ] Add cleanup job.
- [ ] Test that a public URL cannot retrieve the raw photograph.

Done when:

- expired raw images are deleted;
- no raw image is accidentally public.

#### WF-502 — GPS verification

Depends on: WF-101, WF-400

- [ ] Capture fresh coordinates at submission.
- [ ] Reject stale coordinates.
- [ ] Calculate geodesic distance server-side.
- [ ] Interpret accuracy conservatively.
- [ ] Return outside-radius, poor-accuracy or inside-radius result.
- [ ] Add boundary-condition tests.

Done when:

- changing browser payloads cannot bypass server calculation;
- poor accuracy is inconclusive rather than a false failure.

#### WF-503 — Visual verification

Depends on: WF-301, WF-501

- [ ] Define structured visual-verification output.
- [ ] Supply only stage requirements and the submitted image.
- [ ] Ask for detected elements, confidence and ambiguity.
- [ ] Prevent visual verification from supplying new historical facts.
- [ ] Record model/prompt versions.
- [ ] Add mocked pass, fail and ambiguous cases.

Done when:

- model prose cannot directly unlock a stage;
- visual confidence remains an input to deterministic decision logic.

#### WF-504 — Combined verification decision

Depends on: WF-502, WF-503

- [ ] Implement the decision table in Section 9.
- [ ] Add explicit reason codes.
- [ ] Make submission idempotent.
- [ ] Increment attempt count once.
- [ ] Add two-attempt hint and three-attempt skip behaviour.
- [ ] Test correct, wrong, remote, blurry, stale and duplicate cases.

Done when:

- only the server can mark a stage passed;
- every failure offers one actionable correction.

#### WF-505 — Verification user experience

Depends on: WF-504

- [ ] Add uploading and verifying states.
- [ ] Prevent navigation loss during submission.
- [ ] Present pass, retry and inconclusive distinctly.
- [ ] Preserve the captured image for immediate retry only as privacy policy permits.
- [ ] Track latency and outcome.
- [ ] Add offline/network-interruption recovery.

Done when:

- a field tester can recover from a failed upload without restarting the trail.

### Epic 6 — Payments

#### WF-600 — Product entitlement

Depends on: WF-400

- [ ] Define free and paid stage access server-side.
- [ ] Trigger the paywall after stage 2 discovery.
- [ ] Preserve progress when paywall is dismissed.
- [ ] Add complimentary test entitlement.
- [ ] Add entitlement tests.

Done when:

- URL or client-state manipulation cannot reveal stages 3–5.

#### WF-601 — Razorpay test checkout

Depends on: WF-600

- [ ] Create orders server-side in INR paise.
- [ ] Attach internal session/order identifiers.
- [ ] Launch Standard Checkout.
- [ ] Handle cancel, fail and success callbacks.
- [ ] Verify payment signature server-side.
- [ ] Store no card data.

Done when:

- a documented Razorpay test payment reaches server-side pending/verified state.

#### WF-602 — Payment webhooks and idempotency

Depends on: WF-601

- [ ] Verify webhook signature.
- [ ] Store provider event ID.
- [ ] Ignore duplicate events safely.
- [ ] Reconcile callback and webhook states.
- [ ] Unlock only on the accepted verified state.
- [ ] Add replay tests.

Done when:

- duplicate or reordered events cannot double-charge or corrupt entitlement.

#### WF-603 — Paywall experience

Depends on: WF-602

- [ ] Show completed progress.
- [ ] Describe remaining chapters without revealing destinations.
- [ ] Show price, expected remaining time and refund/support path.
- [ ] Add `Unlock adventure` and `End for now`.
- [ ] Track view, checkout, success, failure and exit.
- [ ] Restore active stage after successful payment.

Done when:

- the user understands exactly what ₹149 unlocks;
- declining payment does not erase the free experience.

### Epic 7 — Completion, sharing and analytics

#### WF-700 — Analytics client and server

Depends on: WF-001

- [ ] Define typed analytics event names and properties.
- [ ] Prevent precise coordinates and raw photos from entering analytics.
- [ ] Add source/QR campaign attribution.
- [ ] Deduplicate critical events server-side.
- [ ] Add local-development event inspection.
- [ ] Document the funnel query.

Done when:

- every event in Section 13 can be observed with required properties;
- sensitive data is absent.

#### WF-701 — Completion finale

Depends on: WF-400

- [ ] Resolve the mystery.
- [ ] Summarise stops, time and distance.
- [ ] Mark completed and skipped stages.
- [ ] Ask `Would you play another?`
- [ ] Offer restart/new-adventure action.
- [ ] Track completion and another-trail intent.

Done when:

- paid and complimentary trails both reach a coherent ending.

#### WF-702 — Journey card

Depends on: WF-701

- [ ] Create a branded share-card layout.
- [ ] Include broad location, stage count, duration and distance.
- [ ] Include photos only with explicit confirmation.
- [ ] Avoid publishing precise movement history.
- [ ] Support native share and image download fallback.
- [ ] Add an acquisition link/source code.

Done when:

- the card is legible on Instagram Stories and messaging apps;
- its link attributes referred sessions.

#### WF-703 — Feedback

Depends on: WF-701

- [ ] Ask one primary rating/value question.
- [ ] Add optional short explanation.
- [ ] Add distinct safety/accessibility reporting.
- [ ] Avoid a long survey.
- [ ] Associate feedback with trail/model version.

Done when:

- completing feedback takes under 30 seconds.

#### WF-704 — Internal field dashboard

Depends on: WF-700

- [ ] Protect access.
- [ ] Display funnel counts and conversion.
- [ ] Display generation/verification latency.
- [ ] Display failures by reason code.
- [ ] Display safety/accessibility reports prominently.
- [ ] Display acquisition source.
- [ ] Add CSV export without raw photographs or unnecessary coordinates.

Done when:

- the founder can diagnose one day of Goa testing without manually reading each session.

### Epic 8 — Field readiness

#### WF-800 — Device matrix

Depends on: WF-505, WF-603, WF-701

- [ ] Test current iPhone Safari.
- [ ] Test current Android Chrome.
- [ ] Test denied camera/location.
- [ ] Test poor GPS.
- [ ] Test slow and interrupted network.
- [ ] Test browser refresh and phone lock.
- [ ] Record issues and device versions.

Done when:

- no known critical issue blocks a common target device.

#### WF-801 — Outdoor usability

Depends on: WF-800

- [ ] Test in bright sunlight.
- [ ] Test one-handed walking use while stationary at decision points.
- [ ] Check touch target sizes.
- [ ] Check text contrast and clue length.
- [ ] Check battery use during one full trail.
- [ ] Ensure copy tells users to stop walking before reading/capturing.

Done when:

- founder completes an entire trail without developer tools or laptop intervention.

#### WF-802 — Safety/privacy/payment review

Depends on: WF-800

- [ ] Review every instruction for trespass, traffic and photography risk.
- [ ] Verify raw-photo retention and deletion.
- [ ] Verify provider attribution/licensing.
- [ ] Verify payment test/live separation.
- [ ] Verify support/contact path.
- [ ] Verify emergency exit.
- [ ] Run dependency/security checks.

Done when:

- no known critical safety, privacy or payment defect remains.

#### WF-803 — Self-run generality test

Depends on: WF-802

- [ ] Run at least ten sessions.
- [ ] Use at least three different neighbourhood types.
- [ ] Do not manually select stops.
- [ ] Record every intervention.
- [ ] Flag unreliable candidates.
- [ ] Calculate valid-generation and self-completion rates.

Done when:

- at least eight sessions generate valid adventures;
- the founder can name the remaining dominant failure modes.

#### WF-804 — Stranger usability test

Depends on: WF-803

- [ ] Recruit five non-founder testers.
- [ ] Give only the public onboarding explanation.
- [ ] Do not guide during use.
- [ ] Record screen/notes only with consent.
- [ ] Conduct a five-minute post-test interview.
- [ ] Fix critical common failures before Goa.

Done when:

- at least three testers complete the free segment without assistance;
- every observed failure is classified as acquisition, trust, usability, content,
  routing or verification.

---

## 23. Suggested build cadence

This is a sequence for focus, not a promise that every item fits perfectly into a day.
Codex should stop at the end of each block, run checks and leave a testable deployment.

### Block 1 — Deployable shell

- Day 1: WF-000, WF-001.
- Day 2: WF-002.
- Day 3: WF-003.
- Day 4: WF-004 and phone smoke test.

Output: beautiful arrival screen deployed over HTTPS.

### Block 2 — Location and setup

- Day 5: WF-100, WF-101.
- Day 6: WF-102.
- Day 7: WF-103.
- Day 8: WF-104, WF-105.

Output: user grants location, sees the branded map and chooses an adventure.

### Block 3 — Deterministic playability engine

- Day 9: WF-200.
- Day 10: WF-201.
- Day 11: WF-202.
- Day 12: WF-203.
- Day 13: WF-204.
- Day 14–15: WF-205.
- Day 16: WF-206 and three-location evaluation.

Output: the system selects a safe five-stop route or refuses truthfully, without AI narrative.

### Block 4 — Grounded mystery

- Day 17–18: WF-300.
- Day 19: WF-301.
- Day 20: WF-302.
- Day 21: WF-303.
- Day 22: WF-304, WF-305.

Output: grounded five-stage mystery generated from selected real places.

### Block 5 — Play loop

- Day 23–24: WF-400.
- Day 25: WF-401, WF-402.
- Day 26: WF-403, WF-404.

Output: clues, hints, progress, discovery, skip and reporting work without camera verification.

### Block 6 — Real-world verification

- Day 27: WF-500.
- Day 28: WF-501.
- Day 29: WF-502.
- Day 30: WF-503.
- Day 31: WF-504, WF-505.

Output: GPS and image verification unlock stages reliably.

### Block 7 — Payment

- Day 32: WF-600.
- Day 33: WF-601.
- Day 34: WF-602, WF-603.

Output: ₹149 Razorpay test payment unlocks the final three stages.

### Block 8 — Completion and measurement

- Day 35: WF-700.
- Day 36: WF-701.
- Day 37: WF-702, WF-703.
- Day 38: WF-704.

Output: complete journey, share card, feedback and field dashboard.

### Block 9 — Field readiness

- Day 39–40: WF-800.
- Day 41: WF-801.
- Day 42: WF-802.
- Day 43–45: WF-803.
- Day 46–48: WF-804 and critical fixes.

Output: field-testable V0 ready for Goa.

---

## 24. Goa execution calendar

This calendar begins only after WF-804 passes. Product testing and distribution testing
must be measured separately.

### Goa Day 0 — Setup

- [ ] Verify production environment and live analytics.
- [ ] Keep Razorpay in test mode until payment/legal setup is confirmed.
- [ ] Print/source-code QR cards only after production URL is stable.
- [ ] Prepare tester consent and short interview questions.
- [ ] Prepare phone battery pack and fallback connectivity.
- [ ] Identify emergency support contact and founder debug access.

### Goa Day 1 — Founder-only trails

- [ ] Run one dense urban trail.
- [ ] Run one coastal/commercial trail.
- [ ] Record every unsafe, closed, inaccessible or boring candidate.
- [ ] Fix only critical blockers that evening.

### Goa Day 2 — First five observed testers

- [ ] Recruit five people using one consistent script.
- [ ] Observe without guiding.
- [ ] Give complimentary access after the paywall.
- [ ] Conduct the five-minute interview.
- [ ] Classify failures before changing anything.

### Goa Day 3 — Correct the dominant failure

- [ ] Select the single largest funnel loss.
- [ ] Implement one bounded correction.
- [ ] Regression-test the full trail.
- [ ] Do not change positioning, product and price simultaneously.

### Goa Day 4–5 — Ten real-paywall encounters

- [ ] Recruit at least ten additional starts.
- [ ] Let them encounter the real ₹149 decision.
- [ ] Do not offer a discount before a decision.
- [ ] Ask non-payers what they chose to do instead.
- [ ] Record actual payment behaviour, not hypothetical willingness.

### Goa Day 6 — Passive channel setup

- [ ] Approach five relevant venues.
- [ ] Show the live product rather than a deck.
- [ ] Ask permission for one source-coded QR placement.
- [ ] Make no long-term commercial commitment.
- [ ] Photograph/record placement and source code.

### Goa Day 7–9 — Leave the funnel alone

- [ ] Do not remain beside the QR card explaining the product.
- [ ] Monitor scans, permission grants, starts and completions.
- [ ] Interview only users who independently consent to follow-up.
- [ ] Avoid altering the product after every individual session.

### Goa Day 10 — Evidence review

- [ ] Calculate the complete source-level funnel.
- [ ] Separate founder-recruited and passive users.
- [ ] Review payment, completion, repeat intent and safety.
- [ ] Identify the next hypothesis.
- [ ] Produce a one-page field report and a 90-second product video.

The outcome of Goa is not “continue or quit.” The outcome is a ranked list of what must
change next: acquisition, trust, route quality, clues, verification, value, price or
repeatability.

---

## 25. Founder acquisition tickets

These are part of the build because the product is incomplete until strangers can begin
without a founder explanation.

### ACQ-001 — Recruitment script

- [ ] Use one 15-second invitation.
- [ ] Do not explain AI architecture.
- [ ] Do not promise that the person will love it.
- [ ] Record approached, stopped, interested and started.

Default:

> “I’m testing a new exploration game that turns the streets around you into a
> twenty-minute mystery. The first two discoveries are free and there’s no download.
> Would you like to try it while I quietly observe?”

### ACQ-002 — QR acquisition card

- [ ] One promise.
- [ ] One product image.
- [ ] One QR code.
- [ ] One duration statement.
- [ ] `No download` and `first two discoveries free`.
- [ ] Unique source code per placement.
- [ ] No dense feature list.

### ACQ-003 — Post-session interview

Ask only:

1. What did you think would happen before you began?
2. At what moment were you most curious?
3. At what moment did you consider stopping?
4. What made you pay or decline?
5. What would make you start another one?

Do not ask “Do you like the idea?” or “Would you pay someday?”

### ACQ-004 — Daily evidence sheet

Record:

- people approached;
- conversations;
- QR scans;
- location grants;
- generated trails;
- stage 1 and 2 completions;
- paywall views;
- checkouts and payments;
- paid completions;
- shares;
- another-trail requests;
- safety/accessibility reports;
- founder interventions;
- dominant quotation of the day.

### ACQ-005 — Weekly decision

At the end of a testing week:

- [ ] identify the largest reliable funnel loss;
- [ ] choose one hypothesis explaining it;
- [ ] choose one product or distribution change;
- [ ] specify the metric expected to move;
- [ ] run the next cohort before making another major change.

---

## 26. Investor-readiness output

Do not pause the build to create a large fundraising deck. After Goa Day 10, assemble:

- a live product link;
- a 90-second real-world demonstration;
- one-line company description;
- founder-recruited funnel;
- passive funnel;
- actual payment evidence;
- two strong user quotations;
- a map showing multiple generated locations without exposing private movement;
- the playability-graph thesis;
- the next 12-month milestone and use of funds;
- an honest list of current weaknesses.

Investor one-liner:

> Wanderfound is building the play layer for the physical world: an AI game master
> that turns wherever you are into a grounded, walkable mystery and learns what makes
> real places discoverable.

---

## 27. Definition of V0 complete

V0 is complete only when all of the following are true:

- [ ] Deployed over HTTPS and usable on common mobile browsers.
- [ ] Automatically generates or truthfully refuses an adventure.
- [ ] Uses real walking routes and allow-listed places.
- [ ] Keeps grounded fact distinct from story fiction.
- [ ] Presents five sequential stages.
- [ ] Verifies with both fresh location and visual evidence.
- [ ] Recovers from poor GPS, ambiguous photo and network interruption.
- [ ] Preserves progress after refresh.
- [ ] Gates stages 3–5 server-side.
- [ ] Completes a Razorpay test payment and webhook flow.
- [ ] Produces a finale and share card.
- [ ] Captures the full acquisition and play funnel.
- [ ] Deletes raw verification images on schedule.
- [ ] Provides safety reporting and emergency exit.
- [ ] Five strangers can attempt the product without founder guidance.

“The interface looks beautiful” is necessary but insufficient.  
“The code runs locally” is necessary but insufficient.  
“A founder can manually rescue the experience” is not completion.

---

## 28. Exact handoff prompts for Codex

### First implementation task

> Read `/Users/rishabhjha/Documents/Codex/2026-07-23/help-me/outputs/plan.md`
> completely. Inspect the current workspace and preserve existing work. Implement
> WF-000 through WF-004 only. Run every relevant check, deploy a preview if the
> workspace is connected to an approved hosting project, update the ticket
> checkboxes and decision log, and tell me exactly how to open the result on my phone.

### Second implementation task

> Read the complete Wanderfound plan and inspect the implementation left by the
> previous task. Implement WF-100 through WF-105 only. Use mocked providers where
> external credentials are unavailable. Run tests and update the plan. Stop after the
> user can grant foreground location, see the branded map, choose an adventure,
> sign in with Google and safely resume their authenticated adventure.

### Subsequent implementation rule

Ask Codex to implement one epic or two to four tightly related tickets at a time. Do not
send “build the entire app” as one task. Each handoff must begin by reading the complete
plan, inspecting current code and running existing checks.
