# HW3 homework notes

## Part B scope decision — saved for Part E

Persistence question asked before implementation:
> Is a single-server demonstration acceptable? Reliable check-in across deployed instances requires shared state.

User answer:
> Server-memory storage is acceptable for this homework. Document that it resets on restart/deploy and is not shared across Vercel instances. Do not claim production authorization or reliable cross-instance duplicate prevention.

Agreed implementation scope: Story 6 with manual QR-token entry, clearly labeled seeded sample tickets, a typed officer-name demo label, no purchasing, no real authentication, and no database. Camera scanning is not explicitly required by the acceptance criterion and will not be added. No real attendee data should be entered. Payments, if ever introduced, must be simulated.

This records the decision for later Part E reflection; it does not start Part C or assert results for the user's live-site manual checks.


## Part B live-check failure reported by the user

Deployment under test: Story 6 commit `f68a4b6` (Vercel check reported successful).

User observation, preserved verbatim:
> On the live Vercel /checkin page, I submitted the exact token shown for unused Sample Alex with Demo Officer entered. It returned "Invalid ticket."

Live-check 1 result: **Failed**. This is the user's actual observation, not an inferred pass. At the time of that initial failure, the duplicate and unknown-token live checks had not yet been reported by the user. Investigation and any later automated verification must be recorded separately; do not erase this failure or claim a fix before verification.


### Investigation and fix

Source inspection found one route-level `const store = createCheckinStore()` shared lexically by GET and POST. There were not two explicit store declarations. However, each independently evaluated route module/process called the factory again and generated unrelated random sample tokens. A local reproduction loaded the route twice with independent module-cache identities: GET showed unused Sample Alex, and POST in the other module returned **404 Invalid ticket** for that exact token. See `verification/hw3-part-b-checkin-fix-reproduction.json`.

A fresh live probe of the repository homepage (`https://tartan-tickets-five.vercel.app`) reached a warm store: first submit returned 200, and two repeats returned 409. This did **not** reproduce the user's intermittent live failure and does not negate it. The original deployment exposed no store identity, so its exact instance routing could not be proved retroactively. Different initialized stores are an evidence-backed explanation, not an observed Vercel instance trace.

Four regression tests were added before changing implementation: the pre-fix run had **19 pass / 4 fail, exit 1**. After the fix all **23 passed, 0 failed, exit 0**; original tests were retained unchanged.

Fix design:
- A `globalThis` registry keyed by `Symbol.for(...)` shares one mutable store across module evaluations in the same JS runtime.
- Four public, randomly generated once sample tokens are source fixtures, shared across independent runtimes. GET no longer hands out tokens recognizable only to its own instance. These are not secrets, purchased tickets, or authentication credentials.
- Mutable used-ticket state still lives only in server memory. It resets on restart/deploy and is not synchronized across instances. Tests explicitly demonstrate that a fresh independent runtime can accept the same public sample again; no distributed duplicate guarantee is claimed.
- `X-Demo-Store-Id` is a non-secret diagnostic runtime-store ID; `X-Demo-Fixture-Version: hw3-v2` identifies the changed fixture behavior. Neither grants permissions.

Live fix verification remains pending at this point. Preserve this entry and append actual deployment results separately; the original user-reported check stays failed historically.

Reference: [Vercel Functions lifecycle](https://vercel.com/docs/functions#how-the-vercel-functions-lifecycle-works) describes request invocations, instance reuse, scaling, and scale-to-zero. Reuse does not establish shared state across independent runtimes.

Local follow-up verification before deployment: `npm run build` passed (**Compiled successfully in 234ms**, exit 0). All **11** original local Story 6 browser checks passed on the new build, including the same-process 50-request concurrency test. Separate follow-up logs/screenshots preserve the original Part B evidence. None of these local results is a live fix claim.


### Actual deployed fix verification — automated, separate from user manual results

Fix commit: `e8931f8` (stable public fixture identities and process-wide store). On **2026-10-22 at 23:11 UTC**, automated headless Chrome opened **https://tartan-tickets-five.vercel.app/checkin**, loaded the real page, typed **Demo Officer**, copied the exact unused **Sample Alex** token displayed in that page, and submitted the form.

Observed results:
1. First submission: **HTTP 200 / Checked in**, **Sample Alex**, timestamp `2026-10-22T23:11:44.600Z`.
2. Immediate repeat: **HTTP 409 / Already used**, original timestamp preserved.
3. `not-a-real-ticket`: **HTTP 404 / Invalid ticket**.

Three live GET probes served a stable `hw3-v2` catalog. One distinct store ID was observed in those probes and the tested submissions; no live cross-instance duplicate guarantee was tested or inferred. The independent-runtime regression tests separately prove token recognition across newly initialized stores, and deliberately demonstrate that used-state is not synchronized. Five deployed-browser checks passed, exit 0, with no uncaught exceptions.

Evidence: `verification/hw3-part-b-checkin-fix-live-browser.log`, `verification/hw3-part-b-checkin-fix-live-after.json`, and `verification/hw3-part-b-checkin-fix-live.png`.

The initial **user manual check remains recorded as failed on f68a4b6**. At the time of this automated verification, the user had not yet reported a manual retest of the fix. This automated deployed verification confirms the repaired displayed-token flow on the observed deployment; it is not a claim of durable storage, officer authentication, or distributed duplicate prevention. Reload `/checkin` before copying a token so an old browser tab does not retain the pre-fix random catalog.


## Part B manual live retest — user-reported observations

The user subsequently reported, verbatim:
> My three manual live checks passed: unused Alex token showed Checked in, submitting it again showed Already used with the original timestamp, and not-a-real-ticket showed Invalid ticket.

| Manual check | User-observed result | Outcome |
|---|---|---|
| Submit the displayed unused Sample Alex token | Checked in | Passed |
| Submit the same token again | Already used, with the original timestamp | Passed |
| Submit not-a-real-ticket | Invalid ticket | Passed |

These are the user's actual manual observations after the fix, recorded separately from the automated deployed browser run. The original failed check on `f68a4b6` remains preserved above. The user did not supply a timestamp or store ID for the retest; none is inferred. The observed duplicate rejection does not establish durable or cross-instance duplicate prevention.
