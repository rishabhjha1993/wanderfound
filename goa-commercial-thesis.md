# Wanderfound: a commercial thesis to test in Goa

> Updated direction: the user has chosen to build an AI-native V0 and test user demand through actual use; purchasing is not required initially. See [the demand-first V0 specification](goa-ai-native-v0.md), which replaces this document's interview-first, manual-concierge and transaction-first build gates. The evidence and commercial risks below remain background research.

Date: 15 September 2026  
Status: recommended experiment, with demand for Wanderfound still unproven.  
Purpose: choose a customer problem and test real transactions before committing to a replacement product roadmap.

## 1. Recommendation

Test **a bookable local experience desk for independent Goa stays**.

The guest promise:

> Have a free half-day? Choose a worthwhile local experience with a clear price, a confirmed slot, and a practical way to get there and back.

Start with two adults travelling together, already staying in Goa, choosing something for the next day. Reach them through two or three independent accommodation partners in one area. Offer a small selection of activities delivered by existing operators. Earn an agreed referral commission on completed bookings.

This is a hypothesis about a specific sales and service opportunity. Existing spending on experiences gives it a better starting point than inventing a new paid entertainment habit. It does not establish that guests need another intermediary or that the economics work.

The next milestone is **completed, attributable bookings with commission actually collected**. An attractive recommendation screen is insufficient evidence.

## 2. What first principles changes

A commercial product needs a customer, an occasion, a valuable outcome, a way to reach that customer, and enough retained revenue to deliver the outcome.

| Question                         | Working answer                                                                          | What remains unproven                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Who has the problem?             | Two adults visiting Goa, with tomorrow partly unplanned.                                | Whether this is a frequent buying occasion in the selected stays.      |
| What do they want?               | One enjoyable activity that fits their time, budget, interests and transport situation. | Whether existing options already solve this adequately.                |
| What makes a decision difficult? | Uncertain availability, suitability, total cost and travel arrangements.                | Which of these actually prevents a purchase.                           |
| What do they pay for?            | The delivered activity and agreed inclusions.                                           | Whether our assistance changes their purchase decision.                |
| Who pays Wanderfound?            | An operator paying for an attributable completed booking.                               | The rate, attribution and actual collection.                           |
| How do customers arrive?         | A stay's guest link, check-in information or staff referral.                            | Active exposure, channel cost and continued partner participation.     |
| Why might we earn our place?     | Quick confirmation, useful cross-operator choice and accountable coordination.          | An advantage over the guest's usual hotel contact or booking platform. |

AI can eventually reduce matching and support work. Its usefulness depends on whether it improves conversion or reduces cost while preserving accuracy.

## 3. What the repository tells us

The application currently delivers Google sign-in, foreground location, a map, day/mood/party preferences, and a provider-backed list of places. It contains provider contracts, place filtering, geographic verification, walking-route infrastructure and an internal debugger.

The customer-facing endpoint is still a place shortlist. Booking, a purchasable activity catalogue, confirmed availability, durable booking records and delivered gameplay are absent.

The old plan contains a revealing mismatch: its target occasion is 30–90 unplanned minutes, while its later design requires a half/full day across several walking pockets. The July 30 decision connects that expansion to the quality of discovery results. No completed commercial validation is recorded in the planning documents.

References:

- [Original customer and occasion](plan.md#4-initial-users-and-occasions)
- [Expansion to a day of pockets](plan.md#2026-07-30--a-day-of-pockets)
- [Current build status](progress.md)
- [Current customer result](components/adventure-setup.tsx)
- [Discovery pipeline](lib/discovery/discover-nearby-places.ts)

The ₹149 mystery price is an assumption. The repository provides technical progress, but does not establish willingness to pay for that experience. A product rethink is relatively timely because most of the game and payment loop remains unbuilt.

## 4. Evidence of an existing category

Research checked on 15 September 2026. Published listings and reviews are evidence of supply and participation; they do not expose audited sales, profitability, or unmet demand for Wanderfound. Published prices also do not confirm a slot on a future date.

| Observed evidence                                                                                                        | What it supports                                                         | Limit                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Soul Travelling lists breadmaking at ₹1,599 and tile painting at ₹2,499, each plus its displayed 18% GST.                | Concrete paid activities already exist beyond sightseeing and nightlife. | Published offers do not establish current booking volume.                  |
| Airbnb's Goa collection displays 236 reviews for a Chapora kayaking experience and 385 for an Anjuna fishing experience. | These categories have an observable participation history.               | Review counts do not establish demand for our channel or customer segment. |
| Make It Happen sells local experiences and offers customised 4–8-hour plans.                                             | Local planning and fulfilment are already commercial services.           | This is also a capable competitor.                                         |
| Viator lists a private Goa tour with hotel pickup and return.                                                            | Transport-inclusive experiences are an existing proposition.             | Adding pickup alone would not differentiate Wanderfound.                   |

Sources: [Soul Travelling catalogue](https://www.soultravelling.in/), [Airbnb Goa activities](https://www.airbnb.com/goa-india/things-to-do), [Make It Happen](https://makeithappen.co.in/), [Viator example](https://www.viator.com/tours/Goa/Goa-City-Tour/d4594-135633P223).

**Inference:** there is enough evidence to justify testing a channel for paid experiences. There is not enough evidence to justify building a broad Goa marketplace.

## 5. Alternatives considered

These are qualitative judgments, not measured market scores.

| Direction                                 | Commercial appeal                                                          | Main uncertainty                                                     | Decision                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Consumer mystery game                     | A distinctive entertainment experience could command a fee.                | No recorded demand for this specific format or price.                | Pause this roadmap.                                                   |
| General AI Goa planner                    | Can help people choose where to go.                                        | Weak reason to pay for suggestions available through other channels. | Avoid making planning the paid unit.                                  |
| Experience desk for small stays           | Existing activity spend; reachable guest channel; observable transactions. | Commission, partner participation, incrementality and labour cost.   | Test first.                                                           |
| Private celebrations or corporate outings | Potentially larger order values and a clear occasion.                      | Bespoke delivery and access to buyers before their trip.             | Reconsider if founder access or actual enquiries favour this segment. |

The choice of experience desk is conditional on access to operators and stays. If those relationships cannot be established, the proposed distribution advantage does not exist.

## 6. The initial product

### Initial customer and channel

Two adults staying together at an independent guesthouse, small hotel or managed villa. Test an initial activity budget around ₹1,500–₹3,000 per person, adjusting it from actual conversations and sellable offers. This is a targeting assumption, not a finding about all Goa visitors.

Choose one operating area based on the first two genuinely participating stays and reachable supply. A whole-state catalogue is unnecessary for the first experiment.

The occasion is tomorrow's free half-day. Same-day requests can be accepted when an operator confirms them; the product should not initially promise instant fulfilment.

### Offer

Begin with roughly six offers across three dependable operators. Potential categories include creative workshops, hosted food experiences and guided nature activities. Select the actual mix from operator reliability, location, season and commercial terms.

Each offer must have:

- A named operator and a specific activity, duration and meeting point.
- A date and time, party size limits and booking cutoff.
- A final guest price, inclusions, exclusions and cancellation terms.
- Pickup coverage and return window when included; explicit transport treatment otherwise.
- Relevant suitability information, such as physical demands or dietary constraints.
- An availability status and the time/source of the last confirmation.
- An agreed attribution method and commission arrangement.

Prefer a supplier that can deliver the whole selected offer, including any promised transfer. Independently assembling transport and activities adds another operational dependency to the first test.

### Customer journey

1. Open a link from the stay, with its approximate location already selected.
2. Choose tomorrow's time window, number of people, budget and transport needs; optionally indicate interests.
3. See up to three suitable offers, each with a concrete reason it fits.
4. Select an offer and request a slot. Supply contact details at this point.
5. Receive an operator-confirmed quote and booking/payment link during stated service hours.
6. Complete payment through the operator and receive a reference, meeting/pickup details and support contact.
7. Attend; record completion and settle the referral commission.

The first experience should be useful before account creation or precise GPS permission. An accommodation location or manually selected area is enough for initial matching.

### Booking truth

An existing map listing is not activity inventory. An open venue is not an available activity slot.

Use explicit states: **request received → checking availability → operator confirmed/held → payment pending → booked → completed**, with unavailable, expired, cancelled and refunded outcomes.

Only display a held or confirmed slot when supported by the operator. If the hold expires before payment, reconfirm. Operator receipt or confirmation establishes payment; a click on a payment link does not.

For the first demo, manual coordination is acceptable and should be represented honestly. Customers should see the actual response window and booking status.

## 7. Why someone would use this

The strongest alternative may be a free afternoon at the beach. Other alternatives include the accommodation's existing contacts, direct operators, Airbnb Experiences and other booking platforms.

The proposed advantage must therefore be demonstrated in the purchase process:

- The stay introduces the service when the guest is deciding what to do.
- Offers fit the guest's actual time, location and transport constraints.
- Availability and the final cost become clear quickly.
- Someone handles the handoff and resolves a failed confirmation.

A shorter list and personalised copy are easy to copy. Potential lasting value would come from active accommodation relationships, dependable supply, reliable availability information and a repeatable process that saves work. None of that is a moat today.

If most guests already know the exact experience they want and can book it easily, a recommendation layer contributes little. Record that outcome instead of adding features to defend the idea.

## 8. Monetisation and economics

Pilot model: guests pay the operator for the activity; Wanderfound receives an agreed referral commission after completion. Agree the commissionable amount, attribution, cancellations, settlement date and any accommodation share before sending bookings.

Use a unique booking reference and reconcile it against operator-confirmed payment and attendance. Count collected commission separately from invoiced or promised commission. Direct operator payment lowers initial integration work but still leaves Wanderfound with service and attribution work.

### Illustrative calculation — assumptions, not negotiated rates

| Item per completed party booking                            | Base case | Lower commission |
| ----------------------------------------------------------- | --------: | ---------------: |
| Commissionable activity value                               |    ₹4,000 |           ₹4,000 |
| Operator commission rate                                    |       15% |               8% |
| Wanderfound commission revenue                              |      ₹600 |             ₹320 |
| Accommodation referral cost                                 |     −₹100 |            −₹100 |
| Allocated coordination labour                               |     −₹100 |            −₹100 |
| Tools and messaging                                         |      −₹30 |             −₹30 |
| Service recovery allowance                                  |      −₹70 |             −₹70 |
| Contribution before fixed costs and other acquisition costs |  **₹300** |          **₹20** |

The labour assumption is 15 minutes at ₹400/hour **across all enquiries, allocated per completed booking**. Time spent on enquiries that never buy must be included. Double that labour and contribution falls to ₹200 or −₹80 respectively.

These scenarios exclude fixed overhead and any further acquisition cost; they are not profit forecasts or a tax model. Record actual cash flows and replace every assumption during the pilot. Gross booking value belongs to the activity transaction and is not Wanderfound revenue.

At ₹300 contribution, approximately 334 completed party bookings a month would produce ₹1 lakh before fixed costs. This makes partner productivity and support efficiency central to the business. Positive pilot bookings alone do not establish venture-scale potential.

## 9. Goa validation plan

Use the following sequence over roughly 10–14 operating days, contingent on partner access and guest flow. The travel date is not yet specified; validate seasonal availability for the actual test dates.

### Gate A: understand current behaviour and secure supply

Speak with about 12 target travellers, six operators and five stays. Interview counts are learning targets, not statistical evidence.

Traveller prompts:

- What was the last activity you paid for on this trip? Show the actual booking path if comfortable.
- Who chose it, how was it booked, and what did it cost?
- Was anything abandoned because of timing, transport, price or uncertainty?
- What will you do tomorrow if you book nothing?

Operator prompts:

- Which actual departures or offers can you sell during the test dates?
- How do you confirm remaining capacity and how long can you hold it?
- Will you pay an agreed amount on an attributable completed booking?
- How will references, cancellations and commission settlement work?

Stay prompts:

- How do you currently handle guests asking what to do?
- Which existing referrals or commissions would this replace?
- Will you expose this link to eligible guests during a specific test period?
- What work or share of revenue would you expect?

Proceed only with at least three dependable operators, enough relevant inventory and two stays committing actual guest exposure. Friendly interest or a logo on a slide does not pass this gate.

### Gate B: sell and fulfil manually

Show concrete, normally priced offers to **30 consecutive qualified travel parties**, recording the full screening funnel. A party is the unit, not every person in a couple.

Define qualification before recruitment: target party size, staying in the operating area, an open half-day in the supported booking window, and willingness to consider an activity in the tested budget range. Record how many exposed parties fail these conditions; do not report conversion among qualified parties as conversion among all guests.

Enter each qualified party into the cohort before showing offers. Count parties who never submit a request and those for whom the catalogue has no suitable available offer. Separately measure conversion after a suitable offer is delivered. This prevents weak supply or early abandonment from disappearing from the denominator.

Use normal prices and ordinary service. Separate friends, complimentary places and founder-arranged demonstrations from the commercial cohort. Obtain the operator's actual booking and attendance confirmation, then collect commission.

Early fulfilment can use a simple catalogue, request form and manual ledger. The first five paid completions should inform the customer interface.

### Gate C: test operation without founder selling

Run this channel check within the same 30-party cohort, with source recorded from the outset. Have stays distribute the offer through their normal guest communication. The founder can fulfil requests behind the scenes, but should not personally persuade every purchaser. Report founder-sold and stay-originated results separately; the four stay-originated completions in the continuation rule must be part of these same 30 parties.

Measure:

| Measure                                                                        | Why it matters                            |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| Eligible guest parties actually exposed                                        | Whether the channel is active.            |
| Qualified parties and requests                                                 | Frequency of the target occasion.         |
| Qualified parties receiving a suitable available offer / all qualified parties | Catalogue coverage.                       |
| Paid, completed and cancelled bookings                                         | Purchase intent and fulfilment.           |
| Commission promised, invoiced and collected                                    | Whether monetisation survives settlement. |
| Contribution and total labour / completion                                     | Whether the service can sustain itself.   |
| Bookings from each stay without founder selling                                | Repeatable distribution.                  |
| Reasons for declining and the activity chosen instead                          | The real competing alternative.           |

### Decision rules to set before the test

The following are proposed managerial thresholds, not industry benchmarks or proof of product-market fit:

- **Continue:** at least 6 paid and completed bookings from 30 qualified parties; at least 4 originate through stays without a founder sales pitch, across at least 2 stays; commission collected on at least 5; positive contribution after allocating all enquiry labour; partners agree to continue on the tested terms.
- **Investigate one constraint:** 3–5 completions, or strong purchase intent with a clearly identified supply/confirmation failure. Change one constraint and repeat a bounded cohort.
- **Stop or change the thesis:** 0–2 completions despite relevant, available, normally priced offers; repeated partner inactivity; inability to collect commission; or economics that require permanently unpaid labour.

Any material delivery failure requires fixing the offer before sending further guests into the same failure. A small successful cohort is permission for another experiment, not proof of a scalable business.

Paid bookings also do not prove that Wanderfound generated additional demand. If the pilot passes, compare the experience desk with each stay's usual referral process in a subsequent party-level randomised test, keeping timing and customer eligibility comparable. Measure incremental completed bookings and net contribution. The initial 30-party sample is too small to claim reliable causal lift.

## 10. Minimum demo build after the first transactions

| Build slice                                 | Acceptance condition                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Small operator-approved catalogue           | Every offer has a dated price, fulfilment contact, availability treatment and commission agreement. |
| Stay-specific entry and short matching form | Guest can start with their stay/area, date, party size, time, budget and transport preference.      |
| Offer comparison                            | At most three matching options, with total-price treatment and explicit inclusions.                 |
| Request and confirmation page               | Guest can distinguish requested, confirmed, awaiting payment and booked.                            |
| Durable booking record                      | Returning to a secure link restores current status and details.                                     |
| Founder operations view                     | Requests, operator replies, holds, booking references, completion and settlement are visible.       |
| Funnel instrumentation                      | Source stay and commercial states are measurable without unnecessary location collection.           |

Suggested records: stays, operators, offers, dated slots/quotes, booking requests, bookings, referral terms and settlements. Keep administrative access separate from the guest's booking view.

Reuse the mobile shell, UI components, Supabase infrastructure, provider boundaries and location/map helpers where useful. The real discovery providers can assist catalogue research; they cannot establish sellable inventory.

Change the current location-first onboarding and the scout's walking-pocket assumptions. Preserve the existing route engine as optional infrastructure. Pause mystery generation, clue progression, photo verification and ₹149 stage unlocking while this commercial test is active.

The demo's meaningful sequence is: a real guest requests an available activity, the operator confirms, the guest pays, the activity happens, and Wanderfound receives its agreed commission. Software should make that sequence clear and easier to operate.

## 11. What the Goa test must leave behind

- A transaction ledger linking guest source, offer, payment, attendance and commission collection.
- Actual per-booking economics, including unsuccessful enquiries and partner costs.
- A record of what non-buyers did instead.
- Evidence that at least two stays can produce bookings without founder selling.
- Operator and accommodation decisions about continuing on the same commercial terms.
- A decision to continue, narrow, or stop, with the next uncertainty explicitly named.

If this works, the next product opportunity is to help more independent stays sell dependable local experiences with less staff work. A paid software subscription for stays would be a separate willingness-to-pay test. Expansion should follow repeated booking and margin evidence in the first area.

**The point of Goa is to earn the next build decision through behaviour and money changing hands.**
