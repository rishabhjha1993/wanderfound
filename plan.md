# Wanderfound — Product and Build Plan

> Working name: **Wanderfound**  
> Working tagline: **The world is hiding in plain sight.**  
> One-line product: **Wanderfound turns wherever you are into a walkable, AI-generated mystery.**

Status: pre-alpha  
Primary testing ground: Goa  
Geographic product scope: worldwide from the first real-data build

Quick implementation snapshot: [`progress.md`](./progress.md)

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
   - update the quick status and next build order in `progress.md`;
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

A day is the unit, and a **pocket** is where the game happens. A pocket is a
walkable cluster of places — an old quarter, a market street, a waterfront —
tight enough to explore entirely on foot. A day holds two to four of them, with
ordinary transport in between.

This is what keeps the product from becoming an itinerary generator, which
Section 2 still rules out. Between pockets Wanderfound is a plan. Inside a
pocket it is the game: clues, search zones, photographs, verification.

```text
Open Wanderfound
    ↓
Grant foreground location
    ↓
Choose day shape, mood and party
    ↓
Sweep the surrounding city for candidate places
    ↓
Filter for safety, accessibility and significance
    ↓
Cluster survivors into walkable pockets
    ↓
Select 2–4 pockets that fit the day, with transport between them
    ↓
Select visually discoverable stages inside each pocket
    ↓
Generate one grounded mystery spanning the day
    ↓
── per pocket ──────────────────────────────
Travel guidance to the pocket (transport, honestly labelled)
    ↓
Reveal stage clue + exact walking path to a small search zone
    ↓
Player walks and submits a photograph
    ↓
GPS + visual AI verify the discovery
    ↓
Story reacts; next stage unlocks
    ↓
Pocket completes; story advances to the next pocket
────────────────────────────────────────────
    ↓
After the first pocket: unlock the rest of the day
    ↓
Complete mystery and receive journey card
```

The player is never asked to walk between pockets. Distances there are a
travel decision, not gameplay, and pretending otherwise is how a product built
in a dense quarter becomes unusable in a spread-out town.

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
- half-day and full-day options;
- four moods: historical, culinary, strange and beautiful;
- solo, couple/friends and family party selection;
- city-wide candidate sweep around the player;
- coordinate-driven discovery worldwide with no city allow-list;
- clustering of candidates into two to four walkable pockets;
- honest travel guidance between pockets, never presented as gameplay;
- a grounded mystery spanning the day, with stages inside pockets;
- exact pedestrian path and turn guidance within a pocket;
- automatic rerouting when the player leaves the path;
- one stage revealed at a time;
- GPS and photograph verification;
- hint system;
- rerouting or graceful stage replacement;
- the ability to end a day early with a satisfying resolution;
- stage, pocket and session persistence;
- the first pocket free;
- ₹149 unlock for the rest of the day, in Razorpay test mode then live mode;
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
  walkingMatrix(input: WalkingMatrixInput): Promise<WalkingMatrix>;
}

interface KnowledgeProvider {
  enrich(place: PlaceCandidate): Promise<GroundedPlaceFacts>;
}
```

`walkingMatrix` exists to keep routing cost bounded. Sequence search must never
call `walkingRoute` per candidate pair: with twenty surviving candidates that is
hundreds of billable calls per generation. Instead request one pairwise duration
matrix per pocket, run all scoring and ordering against that in-memory matrix,
and call `walkingRoute` only for the legs of the finally selected sequences.

Because pockets are walkable by construction, the matrix only ever covers places
within one pocket — never the whole city — which keeps it small however far the
day ranges. Travel between pockets is a separate, non-walking estimate and must
never be presented as a walking route.

Recommended MVP defaults:

- **Map:** Google Maps JavaScript API with cloud-based styling, custom overlays,
  Advanced Markers and WebGL Overlay View where justified.
- **Walking routes:** Google Routes API.
- **Which places strongly fit the requested mood:** GPT-5.6 Sol, scouting a
  30 km metropolitan radius before any place database shapes the list.
- **Existence, exact position, current status and map identity:** Google Places
  API (New), verifying every Sol proposal through Text Search.
  Public access is a separate safety judgement because Places exposes no
  general field proving that a player may approach a location.

The first two are a deliberate division, and getting it wrong produced the worst
output this product has yet shown a user.

A proximity search answers _what is near this point_. Asked from residential
Dwarka it honestly returned a pickle store in a flat, two home kitchens, an
apartment-block shrine and a terrace called Artfluence. Nothing was broken: the
question simply has no notion of worth, and no filter can recover places that
were never in the response. Widening the radius returns the same prominent
places spread thinner, and sweeping a region the size of Delhi with paid
searches is unaffordable.

So the production question of _what here is actually beautiful, strange,
historical or culinary_ goes to Sol first. Its prompt defines each mood as a
quality contract, requires several localities and a 25–40% offbeat share, and
explicitly rejects generic map furniture, residences and merely low-review
places. Sol may propose only specifically named, publicly approachable places.

Google then keeps the narrower factual job: Text Search confirms each name
inside 30 km, replaces the approximate coordinate, supplies current status and
the map link, and drops anything unmatched. A deterministic final pass rejects
parking/gate/entrance sub-records, caps one locality at two shortlisted places
and preserves roughly one-third lesser-known or hidden places. Wikidata and the
former Google Nearby sweep remain replaceable provider implementations and test
fallbacks, but no longer define the production candidate pool.

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

These filters split into two groups by the data they actually require. Implementing
them as one pass is a mistake: the route-level rules cannot be evaluated from a
places response, and writing them there produces filter functions that silently pass
everything.

**Candidate-level — derivable from the places response alone:**

- confirmed closed during the expected visit;
- private, ticketed or access-restricted in V0;
- destination requires entering a religious/residential/private space;
- coordinates or identity are ambiguous;
- no visually verifiable public feature exists;
- the only available fact is ungrounded model knowledge.

A place that charges admission is **not** rejected. The earlier rule removed
every museum and gallery around Fontainhas, including street-facing ones whose
signage, doorway or facade is a perfectly fair thing to notice. The constraint
moves from the place to the clue: a venue may cost money to enter, but no stage
may require a purchase to complete, and scoring should still prefer a free
discovery over a paid one.

**Route-level — requires a real pedestrian route, evaluated after routing:**

- route requires a motorway, unsafe crossing or vehicle transport;
- in/adjacent to water, cliff, railway, construction or another obvious hazard;
- place cannot be reached from a pedestrian route.

Unknown is not permission. Where a provider field is absent or ambiguous, the
conservative branch applies and the candidate is rejected or demoted, never admitted
by default.

### Culinary rules

Culinary stages are allowed only when:

- venue is confidently open, or its exterior carries the discovery;
- clue can be completed from a public area;
- purchase is optional **for completing the stage**, though the venue itself may
  charge for entry or for its food;
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

### The city sweep and pockets

A day covers a city, but Nearby Search answers a single point with at most
twenty results. One call cannot describe a city, and widening the radius does
not help: it returns the same twenty most prominent places spread thinner.

So the sweep uses **several search centres** around the player rather than one
larger circle. Centres are derived from the player's position and the day's
reach, never from a hand-maintained list of districts, because the moment a
list exists the product stops working in the towns nobody listed.

A **pocket** is then found in the data, not declared in advance:

- a pocket is a group of surviving candidates within walking distance of one
  another, tight enough that every stage in it is reachable on foot;
- a pocket needs enough substance to be worth travelling to, not merely enough
  places to fill a list;
- pockets are discovered by clustering candidate coordinates, so a new
  neighbourhood needs no configuration to become playable;
- a place that belongs to no pocket is dropped, however good it is. An
  excellent site with nothing around it is a detour, not a chapter.

Cost follows directly from this and must be watched: the sweep multiplies
provider calls by the number of centres. Budget and measure it per generated
day, and prefer fewer, better-placed centres over exhaustive coverage.

### Day viability

Generate only if:

- at least two pockets qualify;
- each pocket holds enough high-confidence stages to justify the journey;
- walking time within every pocket fits its share of the day with buffer;
- transport time between pockets is plausible and honestly estimated;
- all consecutive walking routes inside a pocket are valid;
- at least three different discovery categories are represented across the day;
- no stage confidence falls below the configured threshold.

Otherwise, in order:

- widen the sweep once within the day's reach;
- offer a shorter day built from the pockets that do qualify;
- or return “No reliable adventure here yet.”

A truthful refusal is preferable to a fabricated day, and a good half day is
preferable to a padded full one.

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
2. Ask Sol for a structured, mood-specific place pool inside 30 km.
3. Verify every proposed place with Google Text Search; discard non-matches.
4. Apply identity, public-shape, status and deterministic diversity filters.
5. Cluster survivors into candidate pockets and discard unpocketed places.
6. Rank pockets and select those that fit the day, with transport between them.
7. Enrich the strongest candidates in the chosen pockets with grounded facts.
8. Request one pairwise walking-duration matrix **within each chosen pocket**.
9. Search for the best stage sequence inside each pocket against its matrix.
10. Request full walking routes with geometry for the selected sequences only.
11. Give the trail writer only the verified candidate objects and permitted facts.
12. Generate structured trail JSON.
13. Validate the JSON against schema and business rules.
14. Run a second deterministic check:
    - every stage references a real candidate ID;
    - every fact has a source;
    - no exact destination leaks into early clue text;
    - verification criteria are observable;
    - route time remains within the selected duration.
15. Persist the session and begin.

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
- `day_shape` (`half_day` or `full_day`)
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
- [x] Display current position on a custom Google Maps style.
- [x] Add mist/search-area visual treatment.
- [x] Add duration, mood and party setup.
- [x] Require Google sign-in before setup or gameplay.
- [x] Persist and refresh the authenticated session securely.

Acceptance:

- user can open the deployed PWA, grant location and see the correct area;
- denied location has a useful recovery flow;
- no background permission is requested.

### Milestone 2 — Candidate and routing engine

- [x] Implement the real Google `PlacesProvider`.
- [x] Audit real candidate quality across contrasting coordinates.
- [x] Apply candidate-level hard filters.
- [x] Build the playability debug view.
- [x] Cap any one category's share of the pool.
- [x] Discover the region's notable places from a knowledge source.
- [x] Sweep several search centres for what no knowledge source lists.
- [x] Cluster candidates into walkable pockets.
- [x] Verify selected places against a provider for hours and access.
- [x] Scout with Sol first and verify every proposed destination through Google.
- [ ] Implement the real Google `RoutingProvider`, including the duration matrix.
- [ ] Apply route-level safety filters.
- [x] Retrieve and normalise nearby candidates.
- [ ] Score candidates.
- [ ] Search for the best stage sequence inside a pocket.
- [ ] Assemble a day from pockets, with transport between them.
- [ ] Return a playability decision.
- [ ] Persist a server-authoritative session record.
- [x] Add mocked-provider and provider-boundary tests.

Acceptance:

- contrasting test locations across multiple cities and countries either produce five
  plausible stages or a truthful refusal;
- route duration fits the selected duration;
- no manually selected city or country list is required.

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

Goa is the first serious product laboratory and distribution experiment, not a
geographic product boundary. The same production engine must accept a player's
coordinates anywhere Google Places and Routes return sufficient usable data.

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

### 2026-07-31 — Sol chooses meaning; Google proves existence

The Wikidata-anchor improvement fixed Dwarka-specific emptiness but did not fix
the underlying taste problem. A live Beautiful request still surfaced generic
database labels such as Jor Bagh Fountain and Glass House Jor Bagh. The system
was asking Sol to clean up a list whose semantic ceiling had already been set
by place databases.

The production order is now reversed:

- Sol scouts specifically named places inside 30 km and must satisfy explicit
  mood definitions. Beautiful rejects generic map furniture and ordinary
  buildings; Strange requires a concrete unusual quality or story.
- Google Text Search independently verifies every name, replaces approximate
  coordinates and supplies the current map identity. Non-matches and
  parking/gate/entrance sub-records are dropped.
- A deterministic final pass caps a locality at two shortlisted places when
  several localities exist and guarantees up to 35% lesser-known/hidden places
  survive the final list.

Live runs from Dwarka validated both semantics and grounding. Beautiful returned
Qutub complex, Jahaz Mahal, Humayun's Tomb, Sunder Nursery, Jama Masjid,
Agrasen ki Baoli, Bangla Sahib, Safdarjung's Tomb, Lotus Temple and Akshardham
across the city. Strange returned the Museum of Toilets, Dolls Museum, Waste to
Wonder, Bhuli Bhatiyari ka Mahal, Mutiny Memorial, Chor Minar, Metcalfe's Folly
and other genuinely unusual, Google-matched places.

Runtime effort is `low`, selected by measurement rather than assumption. Sol
Medium and High exceeded the 60-second interaction budget; Low completed and
preserved the desired quality. Web search was tested and removed because it
also exceeded the budget. Development work remains GPT-5.6 Sol at High effort.

### 2026-07-31 — Enrich the anchor, not the starting point

A production half-day search from Dwarka reproduced the founder's empty result
for both culinary and beautiful. Culinary retrieved 150 real places and
beautiful retrieved 20; almost none were rejected. All of them disappeared
later because they did not form a qualifying pocket.

- **The providers were healthy; the question was misplaced.** Wikidata found
  good regional anchors, but Google still searched for food around the player's
  residential starting point. Those two pools could not form one walkable
  neighbourhood.
- **A knowledge anchor is now the centre of local enrichment.** A relaxed
  one-category cluster, or a geographically distinct ranked anchor when the
  result is sparse, tells Google where to find the smaller places that complete
  the walk.
- **Knowledge-backed moods enrich only when necessary.** If Wikidata already
  forms a strong pocket, Google is not called. If a mood such as beautiful has
  worthwhile but sparse anchors, Google densifies only those neighbourhoods.
- **The refusal screen now tells the truth.** It distinguishes “providers found
  nothing” from “real places did not form a strong walk” and no longer blames
  Google or promises that a wider radius will fix a clustering failure.
- **Live Dwarka acceptance changed from zero to six pockets for each reported
  mood.** Culinary produced 38 pocketed candidates and beautiful produced 44.
  Both used five provider searches rather than the former eight-search culinary
  sweep.

### 2026-07-31 — Worth, not proximity

Choosing a mood from Dwarka returned a pickle store in a flat, two home
kitchens, an apartment-block shrine and a terrace called Artfluence. This is the
correction, and it is the largest architectural change since the plan was
written.

- **A knowledge source decides what is worth a day; a proximity search decides
  what is nearby.** Google Nearby Search answers "what is close to this point"
  and has no notion of worth, so from a residential suburb it honestly returns
  home businesses. No filter recovers places that were never in the response,
  and no sweep fixes it either: a wider radius returns the same prominent places
  spread thinner, and a region the size of Delhi cannot be covered by paid
  searches at any acceptable cost.
- **Notability is evidence, not popularity.** How many language editions of
  Wikipedia describe a place separates Humayun's Tomb from a home bakery in a
  way a review count never can, because a home bakery can gather hundreds of
  reviews and has no article anywhere.
- **Sources attest differently, so they are compared on one scale.** Judging a
  monument by review count alone would have rejected Humayun's Tomb as
  unverified. An `attestationOf` helper lets filters and pocket rules treat both
  kinds of evidence without caring which source found the place.
- **Google keeps what only it can answer.** No encyclopaedia describes a good
  litti chokha stall, so culinary places stay proximity-sourced — but searched
  inside a pocket the knowledge source found, never across residential blocks.
  Google also verifies current opening status and position for places that
  reach a trail. Neither source alone proves public approachability.
- **Day reach rises to twenty and forty-five kilometres**, since a day travels
  by auto between pockets. The proximity sweep deliberately does not follow:
  spread across a region it would search arbitrary points forty kilometres apart
  and find nothing coherent.
- **Cost fell rather than rose.** A historical day now costs no Places calls at
  all where it previously cost fourteen, because one free query replaced the
  sweep. That materially eases the ₹149 margin.
- **The pocket link distance was measured, not chosen.** At 350 m almost every
  Delhi monument stood alone; 750 m tripled the pockets found. Notable places
  sit further apart than shopfronts do, and the value tuned for a Google pool
  was wrong for a Wikidata one.
- **The audit script now runs the product's own pipeline.** Two earlier versions
  reimplemented the steps and drifted, reporting a pool the product would never
  have produced, which hid a category cap and understated playable candidates by
  half.

Open and deliberately unresolved: Wikidata returns no opening hours, so every
place currently reports its status as unknown until WF-208a verifies the
selected ones.

### 2026-07-30 — A day of pockets

Running "historical" from a real location returned mostly ordinary
neighbourhood temples and churches. The immediate cause was pool composition
and is fixed below. The founder's response was to change the product's shape,
and these are those decisions.

- **The unit is a day, not an hour.** V0 offers half-day and full-day options
  instead of 30 and 60 minutes.
- **The game happens in pockets.** A pocket is a walkable cluster of places; a
  day holds two to four with ordinary transport between them. Between pockets
  Wanderfound is a plan, inside a pocket it is a game. This is what keeps
  Section 2's "not an itinerary generator" true rather than nominal: the
  differentiator survives because clues, search zones and photo verification
  all still happen, just inside a smaller area than the day as a whole.
- **Players never walk between pockets.** Transport is estimated honestly and
  never drawn or described as a walking route. Treating cross-city distance as
  gameplay is how a product designed in a dense quarter becomes unusable in a
  spread-out town.
- **Pockets are found, not listed.** They come from clustering candidate
  coordinates. A named-district list would work in the cities someone
  remembered and fail everywhere else, which contradicts the worldwide rule.
- **The sweep uses several search centres.** One Nearby Search describes a
  point, and a wider radius returns the same twenty prominent places spread
  thinner rather than more of them. This multiplies provider cost per generated
  day, so the cost must be measured rather than assumed.
- **The paywall follows the pocket.** The first pocket is free and ₹149 unlocks
  the rest of the day. "First two of five stages" does not map onto a day.
- **Clustering is sequenced before routing.** Routing built against a city-wide
  candidate list would compute a matrix that pockets make unnecessary and would
  need rewriting the moment pockets existed.
- **Significance is a property of a place, not its category.** Being a church
  no longer qualifies a place as historical. A landmark tag beats raw
  popularity, no category may exceed a small share of the pool, and heritage
  gets its own search so that worship cannot crowd it out. Significance is
  judged relative to the pool, so a village's principal church is not measured
  against a metro's review counts.
- **Museum facades are observable**, as chapel facades already were. Excluding
  them rejected every gallery and museum around Fontainhas after closing time,
  which is exactly what a historical day wants.

Deferred rather than decided: how a day handles weather, how meals are placed
for a culinary day, and what happens when a player abandons midway through the
second pocket. All three need field evidence rather than more reasoning.

### 2026-07-30 — First live provider data

The candidate audit ran against Google Places for the first time, at Fontainhas
in Panjim. Everything below was corrected because observed output contradicted
an assumption in this plan, not because it looked wrong on paper.

- `publicAccess` and `purchaseRequired` were hardcoded to `"unknown"` in the
  Google normaliser. Against WF-202a's "unknown is not permission" rule that
  would have rejected every candidate in every location while logging a healthy
  pipeline. Both are now derived from category, and anything outside a known
  shape still returns `"unknown"` rather than guessing permission.
- A type blocklist now removes places that are never a discovery whatever else
  Google tags them: the audit returned the Regional Transport Office, an Aadhaar
  Seva Kendra, the Regional Passport Office and the PWD headquarters as
  "historical", and three offshore casino boats as "beautiful". Health and
  personal-services types were added after the curator picked a nutrition
  clinic. Lodging is deliberately not blocked, because Goa's old boarding
  houses are exactly what this product should notice.
- `tourist_attraction` and other generic types may support a category another
  type already established, but may never be the reason a place enters the
  pool. Google applies it to cathedrals, casinos and whole neighbourhoods, and
  it had turned the entire "strange" mood into a viewpoint soup.
- A closed place stays playable when its discovery is on its exterior. A chapel
  shut for the evening still has a carved door and a plaque, and evenings are
  when travellers have unplanned time. Counting every closed shopfront as
  unplayable understated playable candidates at Fontainhas by roughly half.
- Paid entry is no longer a rejection. Section 7 had removed every museum and
  gallery in the Fontainhas pool, including street-facing ones whose signage,
  doorway or facade is a perfectly fair thing to notice from the pavement. The
  rule moves from the place to the clue: a venue may charge to enter, but no
  stage may require a purchase to complete. `purchaseRequired` stays on the
  candidate as scoring evidence, so a free discovery still outranks a paid one.
- "Strange" means historical or culinary substance that visitors walk past, and
  is decided by the curator rather than by a threshold. Review count is given
  to the curator as evidence, not applied as a rule. The deterministic fallback
  keeps numeric bounds because something has to stand in for taste when the AI
  is unavailable.
- Ranking shapes the pool, not the selection. Nearby Search returns at most
  twenty results under one ranking, so popularity ranking handed the curator
  Panjim's twenty busiest restaurants with no overlooked place to choose from.
  Obscurity-seeking moods rank by distance, which is popularity-neutral.
- A mood spanning two kinds of place searches each side separately and merges,
  because one search cannot represent both: a single request around Fontainhas
  returned thirteen cafes, six shops and one chapel. Splitting it produced five
  categories across the same twenty results, at one extra provider call.
- Party mode does not filter candidates. It is collected at setup and does not
  currently restrict which places may appear, so an alcohol-led venue can
  surface in family mode. Recorded as a known gap rather than an oversight.
- A place that charges admission is no longer rejected, reversing Section 7's
  original stance. Applied to live data that rule removed every museum and
  gallery around Fontainhas, including street-facing ones whose signage,
  doorway or facade is a fair thing to notice from the pavement. The constraint
  moves from the place to the clue: a venue may cost money to enter, but no
  stage may require a purchase to complete, and scoring should still prefer a
  free discovery. `purchaseRequired` remains on the candidate so WF-204 can
  express that preference and WF-302 can enforce the clue rule.
- Provider data is noisier than the schema implies. The audit returned a nail
  salon tagged as a historical landmark, a person's name as a temple, and a
  nutrition clinic as a food shop, and the curator selected the nail salon on
  the strength of its low review count. Identity confidence is therefore a
  WF-202a hard filter, not a curator concern: a place with almost no
  corroboration is unverified rather than undiscovered.

### 2026-07-29 — Block 3 review

A review of the implemented code against this plan, before spending the first rupee
of provider quota, produced the following corrections.

- Section 7's hard filters are split into candidate-level rules, derivable from a
  places response, and route-level rules, which require a real pedestrian route.
  Google Places (New) returns types, business status, opening hours and price
  level; it does not generally prove public access or report cliffs, railways, construction or
  unsafe crossings. Implementing all filters in one pass before routing exists would
  produce rules that silently pass every candidate while appearing to enforce safety.
- `RoutingProvider` gains `walkingMatrix`. Combination search calling `walkingRoute`
  per candidate pair would cost hundreds of billable requests per generated
  adventure. One duration matrix over the filtered set, with full routes fetched only
  for the selected sequence, brings this to roughly two routing requests.
- WF-205 is specified as a greedy insertion plus 2-opt improvement against the
  duration matrix rather than an unspecified bounded combination search. This is
  deterministic, unit-testable and has no factorial behaviour to prune.
- WF-206, the playability debug view, moves from the end of Block 3 to immediately
  after the first filter ticket. Every ticket after it is diagnosed through it.
- WF-201a is inserted to activate live credentials, rate-limit the discovery route
  and audit real candidate quality before scoring and routing are built on
  assumptions about the candidate pool. The mood-to-category mapping may only be
  corrected from observed provider output.
- The audit defaults to one location, Fontainhas in Panjim, rather than a guessed
  list of fifteen. Evidence about how the engine behaves across different kinds of
  place should come from real sessions run where the founder actually is, which
  costs nothing extra and reflects genuine use. The wider coordinate list remains in
  the script behind `--all` for when a specific question needs it.
- WF-207 introduces server-authoritative session records at the end of Block 3. The
  database schema exists but no application code writes to it, and all state lives in
  browser session storage. Progress persistence and a paid unlock cannot trust client
  state, so the write boundary is introduced before Epic 3 rather than repaired later.
- Account lifecycle hardening is promoted from unchecked sub-items of WF-105 into
  WF-106, and is treated as a field-testing prerequisite because testers will create
  real accounts and upload photographs.
- The discovery route had no rate limit while requiring authentication and spending
  provider quota per call. This is fixed in the same change that adds the keys.

### 2026-07-29

- GPS accuracy is classified consistently as strong (≤25 m), usable (≤100 m),
  weak (≤250 m) or unusable (>250 m). Only strong and usable readings may advance.
- The latest validated browser location is cached in session storage for at most
  fifteen minutes. It is scoped to the current tab, validated before reuse and never
  added to analytics.
- Google Maps loads on demand through a provider-neutral front-end boundary after
  location is ready. The browser key is restricted to Wanderfound web origins and
  the Maps JavaScript API.
- The player appears as a small dot inside the browser-provided accuracy radius.
  Default map controls and clickable place icons are disabled, while Google attribution
  remains visible and touch gestures use cooperative handling.
- V0 uses a source-controlled raster style at runtime so its dark field-map palette and
  hidden point-of-interest clutter appear deterministically without waiting for cloud
  style propagation. The provisioned JavaScript Map ID is retained for a future switch
  to centrally managed styling. The front-end map boundary owns reusable search-area,
  double-stroked route and discovered-stage layers plus a reduced-motion,
  high-contrast-aware mist treatment.
- The V0 adventure-writing engine will use OpenAI's Responses API with
  `gpt-5.6-sol` at medium reasoning. Google Places, Routes and grounded public
  sources provide the factual allow-list; the model may arrange approved candidates
  and write clues but may never invent a destination, coordinate, opening status or
  local fact. Setup itself makes no model call.
- Geographic discovery is worldwide from the first live provider adapter. The player's
  coordinates define the search centre; there is no Goa boundary, supported-city list
  or country eligibility check. Language and region values may format or bias provider
  results but may never determine whether a location is allowed. Sparse or unsupported
  areas receive a truthful refusal.
- Provider boundaries use strict runtime schemas, typed retryable/non-retryable
  failures and attribution records that carry source, notice and storage-policy
  metadata. Deterministic mock providers use clearly fictional coordinate fixtures so
  discovery, routing and enrichment can be developed without paid calls or the risk
  of mock content appearing factual.
- Production discovery uses `gpt-5.6-sol` at low reasoning as the first semantic
  scout. Low was selected from live latency/quality checks: Medium and High
  exceeded the 60-second interaction budget, while Low returned strong Delhi
  Beautiful and Strange sets. Google Text Search then verifies every proposed
  name and coordinate before use. Trail writing remains a separate grounded-AI
  task and may use a higher reasoning setting.
- Regional knowledge searches now reach 20 km for a half day and 45 km for a
  full day. Local Google enrichment stays within 1.2–1.5 km of a worthwhile
  anchor. Responses are capped at 20, time out after six seconds, and are
  deduplicated by provider identity, normalised name and nearby name similarity.
  Provider failures log only a coarse roughly 0.1-degree location cell.

### 2026-07-28

- The workspace was a new product plan with no existing application code; Milestone 0
  created a Next.js TypeScript App Router application, preserving `plan.md` as the
  product source of truth.
- Sites private hosting served only as the first HTTPS scaffold preview. Vercel was then
  selected as the primary preview and production host because it runs the chosen Next.js
  architecture natively and simplifies Supabase SSR, Google OAuth callbacks and server
  routes. Field testers will use the public Vercel URL or `wanderfound.app`, not a ChatGPT
  Sites URL.
- Node.js 22.14 and npm were pinned for reproducible local and CI builds.
- Exact pedestrian paths and turn guidance are now required for every active stage.
- Navigation is not treated as the puzzle: Wanderfound guides the player to a small,
  public search zone while concealing the place name and visual answer.
- Rerouting is required when the player meaningfully leaves the path.
- Google Maps JavaScript API selected for the V0 visual map, using custom styling and
  overlays so the experience does not resemble a default navigation product.
- Google Places API (New) and Google Routes API selected for worldwide nearby places
  and walking routes wherever provider coverage is sufficient.
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
- Goa chosen as the first serious product and distribution laboratory, while the
  production discovery engine remains geographically universal.
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

- [x] Apply a custom base-map style.
- [x] De-emphasise irrelevant labels and road clutter.
- [x] Add the mist/fog overlay.
- [x] Add a reusable glowing search-area layer.
- [x] Add route and discovered-stage layers.
- [x] Respect reduced motion.
- [x] Test readability in simulated bright light.

Done when:

- the map feels branded rather than like an embedded default map;
- the exact hidden destination can remain concealed.

#### WF-104 — Adventure setup

Depends on: WF-003

- [x] Add half-day and full-day selection.
- [x] Add historical, culinary, strange and beautiful moods.
- [x] Add solo, couple/friends and family party modes.
- [x] Provide one-sentence explanations rather than ambiguous icons.
- [x] Validate a complete selection before continuing.
- [x] Track setup completion and selected values.

Done when:

- a user can complete setup one-handed;
- selections survive a refresh within the session.

#### WF-105 — Google account and session lifecycle

Depends on: WF-104

- [x] Require authentication before setup and adventure routes.
- [x] Configure Supabase Auth with Google OAuth and PKCE.
- [x] Add sign-in, callback and logout.
- [x] Redirect signed-out protected-route requests to sign-in.
- [x] Redirect signed-in sign-in requests back to the adventure flow.

Done when:

- refresh preserves the signed-in session and setup;
- a returning Google user can resume their active adventure;
- changing a URL or client payload cannot claim another user's adventure.

#### WF-106 — Account lifecycle hardening

Depends on: WF-105

Promoted out of WF-105 so it cannot sit indefinitely as trailing unchecked items of
an otherwise complete ticket. This is a prerequisite for field testing with real
testers, not polish: strangers will create accounts and upload photographs of
themselves and their surroundings, and must be able to remove both.

- [ ] Add account deletion that removes profile, sessions, progress and stored photos.
- [ ] Add dedicated expired-auth recovery rather than a generic error.
- [ ] Add authenticated, signed-out and session-lifecycle tests.
- [ ] Confirm deletion cascades honour row-level security.

Done when:

- expired or malformed sessions recover safely;
- a tester can delete their account and no owned row or photo survives it.

### Epic 2 — Candidate discovery and playability

#### WF-200 — Domain types and provider contracts

Depends on: WF-002

- [x] Implement the `PlaceCandidate`, route and grounded-fact schemas.
- [x] Implement `PlacesProvider`, `RoutingProvider` and `KnowledgeProvider` contracts.
- [x] Add provider-specific error types.
- [x] Add source attribution and licensing metadata.
- [x] Create deterministic mock providers and fixtures.

Done when:

- all downstream code can be developed against mocks;
- malformed provider data is rejected at the boundary.

#### WF-201 — Nearby-place retrieval

Depends on: WF-200

- [x] Translate duration into an initial search radius.
- [x] Map Wanderfound categories to Google Places types.
- [x] Retrieve candidates server-side.
- [x] Normalise provider responses.
- [x] Deduplicate near-identical candidates.
- [x] Enforce provider result and latency limits.
- [x] Log provider failure without exposing keys or precise user location unnecessarily.

Done when:

- fixtures and at least one live urban location return normalised candidates;
- duplicate branches of the same venue do not dominate selection.

Implementation is complete against deterministic and provider-shaped fixtures. The
live urban acceptance check remains pending until the server-only Google Places key is
configured in local development and Vercel.

#### WF-201a — Live activation and candidate audit

Depends on: WF-201

Nothing in WF-201 has ever run against real provider data. Before any scoring,
routing or trail logic is built on top of the candidate pool, the pool itself must be
inspected at real coordinates. If Goan beach villages return mostly restaurants and
hotels, the four-mood category mapping and the eight-candidate viability bar are
wrong, and every ticket built above them inherits that error.

- [x] Add the server-only Google Places and AI keys to local development and Vercel.
      Registered in both, but Vercel carries a misspelled `AI_TEXT_MODE` and no
      deployment has been made since, so production is not yet running on them.
- [x] Confirm the configured text model resolves on the project before relying on it.
- [x] Add a per-user rate limit to the discovery route.
- [x] Record which curator produced each selection so silent AI fallback is visible.
- [x] Run the audit at Fontainhas, Panjim across all four moods.
- [x] Review the report and correct the mood mapping from real observations only.
- [ ] Gather wider evidence from real sessions at the founder's own location.
      Needs field use in Goa rather than more code.

Done when:

- a live urban location returns normalised candidates, satisfying WF-201's
  outstanding acceptance criterion;
- the founder has read real candidate output rather than fixture output;
- a signed-in client cannot exhaust provider quota in a loop.

#### WF-202a — Candidate-level hard filters

Depends on: WF-201a

Implements only the filters derivable from a places response. Route-dependent rules
belong to WF-202b and must not be stubbed here.

- [x] Implement each candidate-level filter from Section 7 as a named rule.
- [x] Return a reason code for every rejection.
- [x] Treat unknown access, unknown opening and unknown identity conservatively.
- [ ] Add religious, residential and private-space boundary rules. Religious
      places currently pass as exterior-observable and private ones are removed
      by the type blocklist, so no rule names this boundary explicitly yet.
- [x] Add purchase-not-required rules for culinary candidates.
- [x] Reject candidates with no visually verifiable public feature. Present as a
      guard: Google-normalised candidates always carry visual signals, so this
      fires only for another provider or a fixture.
- [x] Reject candidates whose identity is not corroborated enough to trust.
      The audit returned a nail salon tagged as a historical landmark and a
      person's name as a temple, and the curator picked the nail salon because
      almost nobody had reviewed it. Too little corroboration means unverified,
      not undiscovered.
- [ ] Unit-test each filter independently.

Done when:

- a rejected candidate explains exactly why it failed;
- unsafe fixtures cannot be restored by an AI response;
- no filter silently returns true because its input data does not exist.

#### WF-206 — Playability debug view

Depends on: WF-202a

Deliberately built early. Every ticket from here to WF-205 is diagnosed through this
view, and building it last means debugging the whole engine through server logs.

- [x] Build a development-only view of retrieved, rejected and selected places.
- [x] Display rejection reasons and scoring components as each becomes available.
      Scoring components arrive with WF-204.
- [ ] Display route duration and geometry once routing exists. Waiting on WF-203.
- [x] Display which curator produced the selection, and say so plainly when Sol
      was requested but the deterministic curator ran instead.
- [x] Redact provider secrets. The route returns typed provider failure codes
      and never a provider message or key.
- [x] Protect the route outside local development. Always available outside
      production; a deployment needs `WANDERFOUND_DEBUG_TOOLS=true`, and an
      authenticated session is required either way.

Done when:

- the founder can diagnose a bad trail without reading server logs.

#### WF-208 — Region-wide candidate discovery

Depends on: WF-202a

Started as a multi-centre sweep of paid proximity searches. That was built, and
it did return four times as many places — all of them still the wrong kind,
because a proximity search cannot rank by worth however many times it is asked.
The sweep survives only for food.

- [x] Derive several search centres from the player's position and the day's reach.
- [x] Derive them geometrically, never from a list of named districts.
- [x] Run the existing search groups at each centre and merge.
- [x] Deduplicate across centres, where overlap is expected and normal.
- [x] Measure and log the cost of one generated day.
- [x] Query a knowledge source across the whole region for places worth a day.
- [x] Rank those by how many language editions describe them.
- [x] Keep the proximity sweep for categories no knowledge source lists.
- [x] Compare sources on one attestation scale, so a monument with no reviews is
      not mistaken for an unverified place.

Done when:

- discovery from a residential suburb returns the region's landmarks rather than
  its home businesses;
- the cost of a generated day is a known number rather than an estimate.

#### WF-208a — Verify knowledge places against a provider

Depends on: WF-208, WF-209

Wikidata knows what a place _is_, and nothing about whether it is open, ticketed
or reachable today. Every place that reaches a trail needs that filled in.

- [x] Match selected places to a provider entry with a confidence threshold.
- [x] Fill current opening status and exact position from the match.
- [ ] Establish public access from explicit evidence; Google Places exposes no
      general access field, so category alone must not be described as proof.
- [x] Leave the place unverified rather than guess when no confident match exists.
- [x] Keep verification to the selected places, not the whole region.
- [x] Record the provider spend per generated day.

Both a name and a position bar must be cleared. A name alone matches the wrong
"St. Mary's" in the next district; a position alone matches the cafe across the
road from the monument. From Dwarka six of eight selected places matched, for
eight calls, and Purana Qila and the Ghalib museum arrived with real opening
hours where the knowledge source had none.

Done when:

- a matched place reported permanently closed never reaches the shortlist;
- verification costs a handful of calls, not one per candidate.

#### WF-208b — Enrich regional anchors locally

Depends on: WF-208, WF-209

A production-shaped search from Dwarka retrieved 150 culinary candidates and
20 beautiful candidates, then returned zero. The providers had not failed:
food was searched around the player's suburb while the knowledge anchors were
across Delhi, and sparse beautiful anchors could not make three-stop pockets
alone.

- [x] Derive local enrichment centres from relaxed knowledge-anchor clusters.
- [x] Fall back to distinct ranked anchors when the knowledge result is sparse.
- [x] Search missing categories around those anchors rather than the player.
- [x] Densify a fully knowledge-backed mood only when it does not already form
      a qualifying pocket.
- [x] Keep the geometric player-centred sweep as a provider-outage and
      knowledge-empty fallback.
- [x] Explain zero results as a pocket-formation failure when providers did
      return real places.
- [x] Re-run live Dwarka culinary and beautiful acceptance checks.

Done when:

- a residential starting point can produce pockets in the worthwhile parts of
  its city;
- local enrichment costs are measured and bounded;
- the UI does not prescribe a wider radius for a clustering failure.

#### WF-209 — Pocket clustering

Depends on: WF-208

A pocket is found in the data, not declared. Anything list-based fails in the
towns nobody thought to list.

- [x] Cluster surviving candidates by walking proximity.
- [x] Require a pocket to hold enough substance to justify travelling to it.
- [x] Discard candidates belonging to no pocket, however good they are.
- [x] Score pockets on substance, variety and coherence.
- [ ] Return an explanation of why each pocket formed, for the debug view.
- [x] Add fixtures for dense, sparse and single-cluster areas.

The link distance was measured rather than chosen. At 350 m almost every Delhi
monument stood alone, because notable places sit further apart than shopfronts
do; 750 m tripled the pockets found in Delhi and doubled the places placed in
Panjim, and beyond it the gains flatten while dense quarters fragment against
the span cap.

Done when:

- a dense quarter forms one tight pocket rather than several overlapping ones;
- a spread-out town forms either few pockets or none, and says so plainly;
- adding a neighbourhood requires no configuration.

#### WF-210 — Day assembly and transport legs

Depends on: WF-209, WF-203

- [ ] Select two to four pockets that fit the chosen day shape.
- [ ] Estimate transport time between pockets without presenting it as walking.
- [ ] Reserve time for breaks, and for the day's meals where the mood implies them.
- [ ] Respect opening hours when ordering pockets, which matter far more across a
      day than across an hour.
- [ ] Offer a shorter day rather than padding a weak one.
- [ ] Return a truthful refusal when fewer than two pockets qualify.

Done when:

- a generated day is achievable by a real person at a real pace;
- no transport leg is ever drawn or described as a walking route.

#### WF-203 — Walking routes and duration matrix

Depends on: WF-200, WF-202a

- [x] Add `walkingMatrix` to the routing contract and both mock and Google providers.
- [x] Request one pairwise duration matrix over surviving candidates.
- [x] Request full walking routes with geometry for a selected sequence only.
- [x] Preserve Google Routes steps and route geometry for exact on-screen guidance.
- [x] Reject routes with no pedestrian solution.
- [x] Record route duration, distance and geometry.
- [x] Handle provider timeout and rate limits.
- [x] Add maximum detour and total-duration rules.
- [x] Add fixtures for success, no-route, unreachable-pair and excessive-duration cases.

Implementation note, 1 August 2026: the provider, pocket viability analysis,
single-request final sequence route, API diagnostics and fixtures are complete.
The live Delhi audit reached Google but the existing Places-only credential was
rejected. Enable Routes API on a restricted server credential locally and in
Vercel, then run `npm run audit:routes`; until that activation passes, routing
is reported as unavailable and no guessed route is shown.

Done when:

- straight-line distance is never presented as walking duration;
- a failed route removes the relevant sequence;
- generating one adventure costs approximately two routing requests, not hundreds.

#### WF-202b — Route-level safety filters

Depends on: WF-203

- [ ] Reject routes requiring a motorway, unsafe crossing or vehicle transport.
- [ ] Reject destinations adjacent to water, cliff, railway or construction hazards.
- [ ] Reject candidates unreachable by any pedestrian route.
- [ ] Return a reason code for every rejection, consistent with WF-202a.
- [ ] Unit-test each rule against route fixtures.

Done when:

- an unreachable or unsafe destination cannot enter a trail;
- rejection reasons from both filter stages read as one vocabulary.

#### WF-204 — Candidate scoring

Depends on: WF-202a, WF-203

- [ ] Encode scoring weights in one configuration module.
- [ ] Score distinctiveness, confidence, accessibility, diversity and route contribution.
- [ ] Penalise repeated categories and clustered stops.
- [ ] Penalise unknown opening/access states.
- [ ] Return a score explanation for debugging.
- [ ] Add deterministic ranking tests.

Done when:

- the same candidate set produces the same ranking;
- scoring can be inspected without reading model prose.

#### WF-205 — Trail-sequence search

Depends on: WF-204

This is an orienteering problem — collect the most valuable stops within a travel
budget — not an exhaustive combination search. Specify the algorithm rather than
leaving "bounded combinations with pruning" to be invented at implementation time.

- [ ] Seed the sequence with the highest-scoring eligible candidate.
- [ ] Greedily add the stop maximising score per added walking minute.
- [ ] Enforce the three-category diversity rule during selection, not afterwards.
- [ ] Improve the ordering with 2-opt against the duration matrix.
- [ ] Fit the chosen duration with a safety buffer.
- [ ] Return the selected sequence with a score breakdown.
- [ ] Return a truthful refusal if no sequence qualifies.
- [ ] Expand the radius once within the duration limit before refusing.

Done when:

- urban fixtures produce a plausible five-stop ordering;
- sparse/unsafe fixtures return a clear unsupported-area result;
- the same candidate set and matrix always produce the same sequence;
- no model call is required to decide physical viability.

#### WF-207 — Server-authoritative session record

Depends on: WF-205

The database schema exists and no application code writes to it; location and setup
live only in browser session storage. That is survivable now and unacceptable from
Milestone 4 onward, because progress persistence and a paid unlock cannot trust
client state. Introducing the write boundary here keeps Epic 4 small and makes the
paywall tamper-resistant by construction rather than by later repair.

- [ ] Persist the adventure session, selection and chosen sequence server-side.
- [ ] Own every row by the verified `auth.uid()` from creation onward.
- [ ] Return only the current stage view to the client, never the full trail.
- [ ] Keep the destination name and clue answer server-side until verification.
- [ ] Verify row-level security with an owner and a non-owner test.
- [ ] Resume an active session after refresh or a new device sign-in.

Done when:

- no client payload or URL change can reveal an unearned stage;
- a refreshed browser resumes from the server record, not session storage.

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

Block 3 was re-sequenced and extended after the WF-201 review; day numbers in Block 4
and later shift by roughly three days and should be read as order, not dates.

Use **GPT-5.6 Sol** for every remaining Codex implementation stage because that is the
available model. Use **Medium effort** for documentation, credentials and narrow
configuration checks. Use **High effort** for provider integrations, safety filters,
routing, scoring, state machines, AI grounding, authentication, privacy and payments.
Reserve **X-high effort** for final safety/payment audits or a stubborn defect that
survives a High-effort pass.

### Block 1 — Deployable shell

Status: **complete and deployed**.

- Day 1: WF-000, WF-001.
- Day 2: WF-002.
- Day 3: WF-003.
- Day 4: WF-004 and phone smoke test.

Output: beautiful arrival screen deployed over HTTPS.

### Block 2 — Location and setup

Status: **core experience complete and deployed**. Account lifecycle hardening was
promoted out of WF-105 into WF-106 and must land before field testing with real
testers.

- Day 5: WF-100, WF-101.
- Day 6: WF-102.
- Day 7: WF-103.
- Day 8: WF-104, WF-105.

Output: user grants location, sees the branded map and chooses an adventure.

### Block 3 — Deterministic playability engine

Status: **WF-200 and WF-201 implementation complete against fixtures only**. No code
has run against live provider data. WF-201a is the next build ticket, and it gates
everything after it.

Re-sequenced from the original plan for three reasons: the candidate pool is audited
before logic is built on top of it; the debug view arrives early enough to be useful
while building the engine rather than after it; and the filters are split so that
route-dependent rules are written only once real routes exist.

- Day 9: WF-200.
- Day 10: WF-201.
- Day 11: WF-201a — activation, rate limit and candidate audit.
- Day 12: WF-202a — candidate-level filters.
- Day 13: WF-206 — debug view.
- Day 14: WF-208 — region-wide discovery.
- Day 15–16: WF-209 — pocket clustering.
- Day 16: WF-208a — verify selected places for hours and access.
- Day 17: WF-203 — routes and duration matrix, per pocket.
- Day 18: WF-202b — route-level safety filters.
- Day 19: WF-204 — scoring.
- Day 20–21: WF-205 — sequence search inside a pocket.
- Day 22: WF-210 — day assembly and transport legs.
- Day 23: WF-207 — server-authoritative session record.

Clustering precedes routing deliberately. Routing built against a city-wide
candidate list would compute a matrix that pockets make unnecessary, and would
have to be rewritten as soon as pockets existed.

Output: the system selects a safe five-stop route or refuses truthfully, without AI
narrative, and persists that decision server-side.

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

Completed work is summarised in [`progress.md`](./progress.md). Do not restart the
foundation, map, authentication, setup or provider-contract work.

### Current implementation task

Model: **GPT-5.6 Sol**

Effort: **High**

> Read `plan.md` and `progress.md` completely. Inspect the current workspace and
> preserve existing work. First verify that the server-only Google Places and OpenAI
> credentials exist without printing their values, then run WF-201's real Delhi and
> Goa acceptance searches. Fix only evidence-backed provider-normalisation defects.
> Next implement WF-202 deterministic hard safety filters with a named reason for
> every rejection and independent tests for every rule. Run all checks, update both
> planning files, publish through GitHub, and verify the Vercel production deployment.
> Do not begin routing until WF-202 passes.

### Following implementation task

Model: **GPT-5.6 Sol**

Effort: **High**

> Implement WF-203 real walking-route retrieval only after WF-202 passes. Preserve
> exact Google pedestrian geometry and steps, reject no-route and excessive-duration
> options, cover success and failure fixtures, update `plan.md` and `progress.md`, run
> all checks, publish through GitHub, and verify Vercel production.

Continue implementing one epic or two to four tightly related tickets at a time. Do not
send “build the entire app” as one task. Each handoff must begin by reading both planning
files, inspecting current code and running existing checks.
