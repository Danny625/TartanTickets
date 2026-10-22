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

Live-check 1 result: **Failed**. This is the user's actual observation, not an inferred pass. The duplicate and unknown-token live checks have not been reported by the user. Investigation and any later automated verification must be recorded separately; do not erase this failure or claim a fix before verification.


### Investigation and fix (verification pending)

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
