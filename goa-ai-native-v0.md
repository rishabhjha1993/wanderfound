# Wanderfound: AI-native Goa V0 — test user demand

Date: 15 September 2026  
Status: implemented V0 release specification. User decisions: build a working AI-native V0; test demand through use; purchasing is not required initially. Deliver through the existing production site so testing can begin without another implementation prompt.

This replaces the interview-first, manual-concierge and transaction-first validation approaches in the earlier drafts. The [commercial research](goa-commercial-thesis.md) remains background. Monetisation is a later hypothesis, not this V0’s acceptance criterion.

## 1. Product thesis

**Wanderfound helps a visitor decide what to do next in Goa, then adapt the outing as circumstances change.**

The hypothesis:

> When visitors have an unplanned few hours, an AI agent that understands their situation and checks real-world constraints can give them a better next move quickly enough that they act on it and return to it later in the trip.

The initial customer is a traveller making a decision for themselves or their small group, already in Goa, with the next two to six hours partly open. Limit the first release to one area around the founder’s test location where source quality can be checked.

The unit of value is a chosen, worthwhile outing. It can centre on a free place, a food stop, a cultural visit or a paid activity. Purchasing and booking integrations are outside the initial build. Suggestions requiring reservations must say so and cannot imply confirmed availability.

## 2. A concrete experience

Illustrative request:

> There are three of us near Siolim. We have scooters, we’re tired of beach hopping, and we want something interesting before dinner. Keep the travel short.

The agent:

1. Extracts the starting area, available time, party context, transport and preferences.
2. Asks one useful follow-up if essential information is missing.
3. Searches real places and relevant source material.
4. Checks location, known opening/access information, relevant travel times and weather where supported.
5. Proposes one outing centred on a worthwhile destination, with an optional supporting stop only when it improves the experience.
6. Explains why it fits, what to expect, when to leave and any unresolved practical detail. Offers up to two distinct alternatives.
7. Reworks the plan when the user says “closer,” “less effort,” “we’re hungry now” or “it started raining,” retaining the other constraints.
8. Lets the user save/share the outing and open navigation.
9. Preserves context when the user returns for the next decision.

The agent can recommend a single destination. It should not add stops to satisfy an arbitrary route length or walking-pocket rule.

## 3. Why AI is central

AI interprets a messy request, chooses research tools, combines evidence with personal constraints, handles changes and maintains useful context. Deterministic checks enforce hard constraints that the model might overlook.

The essential loop is:

**Intent → research → feasibility checks → useful choice → action → adaptation.**

The product must earn preference over the user’s normal process, including maps, search, a general chatbot, advice from their stay or simply doing nothing. Fewer decisions to make, less repeated context and more practical accuracy are advantages to demonstrate, not established facts.

A conversational interface alone does not establish an AI-native product. The key capability is recomputing a grounded recommendation when the person’s situation changes.

## 4. The smallest complete V0

| Surface          | What it does                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Start            | Natural-language request, area and optional starter prompts. Useful output before login or precise GPS permission. |
| Working state    | Short, truthful progress updates about actual checks.                                                              |
| Outing           | Recommended anchor, optional stop, reasons, map, time/cost treatment, source freshness and uncertainties.          |
| Change it        | Editable constraints and natural-language revisions.                                                               |
| Take it with you | Persistent outing, share link, external navigation and easy return.                                                |
| After use        | Optional one-tap “went / changed plans / didn’t go,” followed by a short usefulness question.                      |

Share links should expose the intended outing details, not private conversation or precise starting location by default.

Paid activity links may appear as contextual information. The product does not claim a booking or slot confirmation. The first release can work entirely with places that require no booking.

## 5. Grounding and honest limits

- Place existence and coordinates come from a real provider.
- Opening information must match the requested day/time where the source supports it. “Open now” cannot establish tomorrow’s hours.
- Driving or scooter travel cannot be represented by a walking-time estimate. Use an appropriate provider or disclose that the relevant estimate is unavailable.
- Price, access and restrictions need a source; otherwise mark them unknown.
- A claim such as “uncrowded right now” requires actual supporting evidence. Descriptions of a usually quieter setting must be qualified.
- Recommendations affected by weather use information for the relevant time window when available. Forecasts do not establish that an activity is operating.
- Cultural or historical explanations require their own evidence; map verification does not verify generated stories.
- A failure to find a feasible outing should produce an honest explanation and a useful suggested constraint change.

Source coverage may limit the first release. Choose the operating area and supported outing types accordingly rather than promising all of Goa.

## 6. What changes in the repository

### Reuse

Next.js mobile shell, UI primitives, map adapter, Supabase infrastructure, place-provider contracts, geographic verification, error handling and the internal discovery debugger.

### Replace or extend

1. **Intent:** replace the fixed day/mood/party form with a structured request containing time window, starting area, transport, party context, interests and optional budget.
2. **Selection:** replace walking-pocket constraints and the pocket-oriented AI scout prompt. Rank useful outings rather than groups of places that happen to form a walk.
3. **Evidence:** attach sources, retrieval times and uncertainty to the practical claims displayed to users.
4. **Feasibility:** combine applicable opening information and transport times, with buffers and explicit unknowns.
5. **Agent loop:** research, compare, revise and preserve unaffected constraints.
6. **Persistence:** store the outing and minimal user-provided context, with guest access before optional account creation.
7. **Demand instrumentation:** measure choices, navigation handoffs, reported visits, organic returns and referrals.

The primary domain is an **outing**: intent, anchor, optional stop, timing, transport, evidence, unresolved details and revision history. A numbered place list does not yet provide that outcome.

Pause mystery generation, clue progression, photo verification, stage paywalls and supplier-booking infrastructure while building this V0.

## 7. Build sequence

### Slice A — one grounded outing

Implement the request/outing schemas and a minimal agent endpoint using the existing place infrastructure plus source retrieval for claims that maps cannot establish. Return one usable outing for supported inputs.

Acceptance: real candidates, explicit evidence, hard-constraint checks and truthful failure for impossible requests. Test closed places, no suitable result, unsupported transport estimates and missing access information.

### Slice B — choice and adaptation

Build request, results and revision interactions. Add alternatives only where genuinely feasible. Store enough state for a revision to retain the rest of the user’s requirements.

Acceptance: “closer,” “less effort” and “we need food” change the underlying research and checks. Measure time to useful output and total tool/model cost, including failed requests.

### Slice C — usable during an outing

Add persistent guest sessions, navigation handoff, sharing, resume and optional outcome feedback. Recheck time-sensitive details when an old outing is reopened.

Acceptance: the outing survives refresh and phone interruption; the user can understand it without founder explanation and can continue after circumstances change.

### Slice D — Goa use

Release to travellers with an actual upcoming decision. Observe use without guiding every step. Improve the largest observed failure between cohorts.

No interview quota, supplier partnership or payment integration gates these build slices. Development estimates should follow a concrete check of source and transport-provider coverage.

## 8. Define user demand through behaviour

The primary question is **whether the product changes what someone actually does and earns another voluntary use**.

| Signal                            | Meaning                                         | Measurement limit                                                  |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Chooses an outing                 | Recommendation is attractive enough to select.  | Selection alone is weak evidence.                                  |
| Opens navigation                  | Takes a practical next step.                    | A navigation click does not establish arrival.                     |
| Reports going                     | Recommendation influenced a real outing.        | Self-report is labelled as such; missing responses remain unknown. |
| Returns with another real request | Product may be becoming useful during the trip. | Separate unprompted returns from reminders and founder requests.   |
| Shares and brings another user    | There may be a natural acquisition mechanism.   | Sharing alone is weaker than a recipient starting.                 |
| Revises successfully while out    | The agent helps with changing circumstances.    | Repeated revision can also indicate a bad first result.            |

Do not use session length, message count or compliments as the main evidence of demand. A good agent may resolve a decision in very few interactions.

## 9. First field cohort and decision rules

Recruit roughly 30 independent travel parties with a real free-time window in the supported area. Count parties rather than each member of a group. Report friends, staged demos and complimentary incentives separately.

Enter all qualified starts into the denominator, including requests with no result. Record source of acquisition and founder assistance. Observe naturally; short follow-up questions can explain actual abandonment or choice.

Proposed initial continuation signals, chosen before the cohort:

- At least 10 of 30 parties select an outing and take a navigation action.
- At least 8 of 30 explicitly report going to an outing suggested by the product; report the feedback response rate and unknown outcomes.
- Among parties with another supported free-time window during their trip, at least 5 return for a new genuine request without a founder prompt. Report the eligible denominator; if fewer than 10 have another opportunity, extend observation before interpreting repeat demand.
- Most reported outings require no founder rescue, and users can identify a concrete benefit such as finding something suitable or avoiding a timing mistake.

These are exploratory decision thresholds, not industry benchmarks or statistically reliable proof of product-market fit.

Interpret failures specifically:

- Good initial engagement but few outings: recommendations may be interesting without being useful enough to act on.
- Navigation but disappointing visits: inspect quality, accuracy and suitability.
- Successful first outings but little repeat use despite opportunity: assess novelty versus continuing utility.
- Strong assisted results but weak independent use: fix the product or acquisition explanation.

If results are promising, run a subsequent comparison with travellers’ normal planning method to test whether Wanderfound improves decision time or outing quality. The first cohort alone cannot establish causal superiority.

## 10. Commercial relevance comes after this test

Purchasing is not required to establish this V0’s usefulness. The initial evidence concerns behaviour and repeat demand.

Keep request cost and support effort visible, so later economics can be assessed. Potential revenue paths include referrals for bookable experiences, paid assistance for more complex requests or distribution through accommodation partners. Each requires a separate test; none is assumed to work because people use a free app.

The next investment decision is whether the observed demand justifies a stronger product and a focused monetisation experiment.

## 11. Demo success

A visitor describes what they want, receives a grounded outing, changes a constraint, gets a useful revision, goes, and voluntarily uses Wanderfound again.

That is the behaviour this AI-native V0 should make possible and measure.

## 12. Release acceptance: usable at the existing production URL

The delivery includes implementation, repository checks, GitHub publication,
Vercel production deployment and a real request through
`https://wanderfound.vercel.app`. A document, localhost build or preview URL alone
does not complete the release.

Implemented paths:

- `/`: public request, results, revisions, local resume, sharing and feedback.
- `/api/outings`: bounded, anonymous research with streamed progress and a validated result.
- `/api/outings/events`: structured, anonymous usage/outcome logs.
- `/start`: forwards existing entry links to the new public flow.
- `/health`: identifies the V0 and deployed commit revision.

Live dependencies: existing OpenAI and Places server credentials. Routes is
optional and must be labelled unavailable when not permitted; weather retrieval
can fail independently without preventing the outing. Provider failures must
preserve the user’s request and provide a retry.

Release checks: formatting, lint, TypeScript, unit/component tests, production
build, mobile smoke tests, inspected 320px/phone/desktop layouts, real research,
real revision, and the deployed production health/page/API. Use the existing
GitHub main-branch deployment integration and verify the resulting commit before
calling it live. Preserve the previous deployment as the rollback path.

The initial browser session and share mechanism intentionally avoid a new
database migration. Demand feedback goes to server logs; a durable analytics
store can follow if a larger cohort requires it. Do not describe self-reported
visits or navigation clicks as independently verified attendance.
