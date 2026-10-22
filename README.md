# Tartan Tickets

A Next.js App Router prototype implementing **Story 1: Browse events** and the **Story 6: Check-in homework demo**. Students can browse upcoming published club events with date, Pittsburgh time, location, price, and seats remaining. Sold-out events show **Join waitlist** in place of **Buy**.

## Run locally

Install Node.js 22 or newer (including npm), then run these commands from this folder:

```sh
npm install
npm test
npm run build
npm run start
```

Open **http://localhost:3000**. For development, use `npm run dev` instead of `npm run start`. Stop the server with Ctrl+C. The scripts bind to the local machine, `127.0.0.1`.

No environment variables, API keys, database, or external services are needed. `npm install` needs network access. Dependencies have been installed and `package-lock.json` records the resolved versions. Tests and the production build passed with Node v26.12.1, npm 12.2.1, and Next.js 16.4.2. Use `npm ci` instead of `npm install` to reproduce the locked dependency installation.

## Exactly what to click

The production app was started successfully after sandbox escalation became available and verified in headless Chrome. Open **http://127.0.0.1:3000** while that server is running. On a later visit, run `npm start` from this folder to restart it.

1. Open http://localhost:3000 and click **Find your next thing** to move to the event list.
2. Check **Tartan After Hours**: a date and time, Cohon Center location, **$12.00**, **24 seats remaining**, and **Buy** should appear.
3. Check **One More Frame**: it should show its date, McConomy Auditorium, **Free**, **35 seats remaining**, and **Buy**.
4. Check **The Fall Table**: it should show its date, Studio Theater, **$8.00**, **Sold out**, and **Join waitlist**, with no Buy button on this card.
5. Click **Join waitlist**. A message explains that enrollment is planned for Story 4; no enrollment occurs. Click **×** to dismiss it.
6. Click **Buy** on an available event. A message explains that purchases are planned for Story 3; no money moves and no inventory changes.
7. Click **Refresh events**. A loading announcement and then **Events are up to date.** should appear. The sample past event, Welcome Mixer, should never be listed.
8. Use Tab and Enter to reach and activate links and buttons. Resize to phone width to check the single-column event list.

Optional error check: after the initial load, set your browser's developer tools Network panel to Offline, then click Refresh events. The last loaded cards should remain and an error with **Try again** should appear. Restore connectivity and click Try again. To exercise the empty state, temporarily replace the return value of `createDemoEvents()` in `lib/events.mjs` with `[]`, restart, and look for **No upcoming events yet.** Restore the sample data afterward.

## Scope and limitations

- Stories 1 and 6 are implemented. Stories 2–5 are deferred. Buy and Join waitlist still display explanatory messages only. There is no checkout, reservation, waitlist enrollment, purchased ticket issuance, email, refund, or event management. Story 6 uses seeded fictional sample tickets and manual QR-token entry.
- No payment flow is needed for browsing or check-in, so there is no payment button, Stripe integration, or card collection. A later payment story must use a **Simulated payment** button under the requested constraints.
- Browsing and demo check-in are public. There is no sign-in provider, password, role enforcement, or real attendee data. Check-in requires a typed officer-name demo label, which is validated but not stored or authenticated. Do not enter real attendee or officer information.
- Public event data lives in server-process memory. Restarting reseeds sample dates relative to the server start date; data is not shared between processes and does not persist. If a server stays running for long enough, sample events move into the past and disappear. Refresh reloads server data; it is not a live inventory subscription.
- APIs: `GET /api/events` returns upcoming published events; `GET /api/checkin` returns public fictional sample tokens; `POST /api/checkin` validates a typed name and token, marks the sample used, or returns 400/404/409. All responses use `Cache-Control: no-store`. Other mutation endpoints remain absent.
- No AI API calls, secrets, database, analytics, external images, or remote fonts are used. Artwork is CSS and text.
- This is a local HTTP demo. It is not a production-ready ticketing service. No performance, 500-user load, comprehensive accessibility, or production security audit has been completed. Browser smoke checks and HTTP checks are recorded below.
- Named color tokens, visible keyboard focus, a skip link, semantic headings, text labels, live announcements, responsive layouts, and reduced-motion support are included. A browser check confirmed keyboard Enter activation of Refresh events, and desktop/390px mobile screenshots were inspected. Contrast and the complete keyboard/screen-reader flow still need a comprehensive accessibility audit.

## Tests written before implementation

The nine tests in `tests/story-1.test.mjs` were written and executed before the event service, API handler, or UI were created. They reference **Story 1** and cover:

- Only future, published events; chronological ordering and immutable results.
- Date, Pittsburgh time, location, price, seats remaining, and Buy presentation.
- Join waitlist replacing Buy for sold-out events, and clamping negative inventory.
- Free pricing, one remaining seat, and an empty upcoming list.
- Relative sample dates and paid/free/sold-out/past fixtures.
- The public API handler's response fields, upcoming filtering, and cache prevention.

The original tests use Node's built-in test runner and exercise the event service and API handler directly. `eventPresentation` supplies the labels that the cards render. Additional **post-implementation browser smoke checks** in `verification/browser-check.mjs` verify the rendered production app and hydrated interactions; they are separate from the nine tests written before implementation. With the server running and Chrome installed at its standard macOS location, run `node verification/browser-check.mjs` to reproduce them.

The three input files in `docs/` were read. The test spec references REQ-1.1 through REQ-8.5 for workflows that do not map to the six numbered stories in the requirements file (for example, club approval is not Story 1). Accordingly, tests follow the actual **Story 1 acceptance criteria**. Only Story 1 and the scoped Story 6 tests are claimed to pass; the complete production security test suite remains unimplemented. The security spec also references absent assumption IDs A1–A12. Its 90-day retention requirement conflicts with the requirements file's one-year personal data retention; neither policy is implemented; check-in uses fictional sample names only.

### Actual execution evidence

The authoring environment had no standalone Node or npm and could not resolve `nodejs.org` to download them. VS Code's bundled Node v24.21.0 was available, so the exact test command used was:

```sh
ELECTRON_RUN_AS_NODE=1 '/Applications/Visual Studio Code.app/Contents/MacOS/Code' --test tests/story-1.test.mjs
```

The initial failures are preserved. After the user installed Node/npm and the dependencies in their Mac terminal, `npm test` and `npm run build` both completed successfully with exit 0. Raw output is linked below:

| Run | Actual result | Evidence |
|---|---|---|
| Before implementation: bundled Node tests | `tests 1`, `pass 0`, `fail 1`; exit 1, `ERR_MODULE_NOT_FOUND` for the not-yet-created event module | [Failing output](verification/story-1-before.log) |
| Before implementation: `npm test` | `command not found: npm`; exit 127 | [Output](verification/npm-test-before.log) |
| After implementation: bundled Node tests | `tests 9`, `pass 9`, `fail 0`; exit 0 | [Passing output](verification/story-1-after.log) |
| After dependency installation: `npm test` | `tests 9`, `pass 9`, `fail 0`; exit 0 | [Passing output](verification/npm-test-after.log) |
| After dependency installation: `npm run build` | `Compiled successfully in 854ms`; `Generating static pages using 5 workers (2/2) in 125ms`; exit 0 | [Build output](verification/npm-build.log) |
| Initial `npm run dev` attempt | `command not found: npm`; exit 127 | [Original output](verification/npm-dev.log) |
| Initial sandboxed `npm run start` | `listen EPERM: operation not permitted 127.0.0.1:3000`; exit 1 | [Original startup output](verification/npm-start.log) |
| After permissions update: `npm start` | `Ready in 83ms`; running at `http://127.0.0.1:3000`; page and API return HTTP 200 | [Page headers](verification/home-headers.txt), [API headers](verification/api-headers.txt) |
| Headless Chrome browser verification | `Browser checks: 11 passed, 0 failed`; exit 0 | [Browser output](verification/browser-check.log) |

The earlier in-session installation retry failed because both download hosts could not resolve ([retry output](verification/install-retry.log)). The user subsequently installed Node/npm and the dependencies outside the sandbox. Those installation failures are historical; they no longer block tests or builds.

**Tests, build, local startup, and browser smoke verification are complete.** After the permission policy changed to allow reviewed sandbox escalation, `npm start` succeeded and the production app was left running at http://127.0.0.1:3000. The page and API both returned HTTP 200. The build reports `/` and `/api/events` as dynamic server-rendered routes. Git initialization and publication were deferred during the original Story 1 implementation; repository preparation is documented below.

Browser checks covered all card display fields, sold-out action replacement, exclusion of past events, the browse anchor, both deferred-action messages, loading and disabled-refresh states, successful refresh, failed-refresh recovery, the empty state, injected text escaping, Enter-key activation, a mobile single-column layout without horizontal overflow, and absence of uncaught browser exceptions. Loading/error/empty/injected-text responses were intercepted **only in the temporary browser session**; server sample data was not modified. Screenshots: [desktop](verification/desktop.png) and [mobile](verification/mobile.png). The browser used a fresh temporary profile, which was removed after verification.

## Security spec audit

This audits every requirement in `docs/Starter Spec A - Tartan Tickets - SECURITY_SPEC.md` against the Story 1 and scoped Story 6 homework prototype. “Not satisfied” includes deferred workflows; absence of a workflow does not establish its required protection. This is a source review, not a penetration test or independent human review.

| Requirement | Status | Explanation |
|---|---|---|
| SEC-1 — CMU SSO; no stored passwords | partly satisfied | No passwords are collected or stored. CMU SSO is absent; browsing is public as required for this limited demo. |
| SEC-2 — Eight-hour idle session expiration | not satisfied | The typed officer name is not a session or identity; no idle-expiration enforcement exists. |
| SEC-3 — HTTPS everywhere and HSTS | not satisfied | Local server uses HTTP. No HTTPS redirect or HSTS is configured. |
| SEC-4 — Server role and membership checks on every request | not satisfied | Public browsing and demo check-in have no server-side role or membership checks. Requiring a nonempty officer label is input validation, not authorization. |
| SEC-5 — Cross-club denial and logging | not satisfied | Public events are readable by anyone; protected club resources, permission checks, and denial logs are absent. |
| SEC-6 — Other student's ticket returns not found | not satisfied | Only public fictional sample tickets exist. Their tokens are exposed deliberately for the demo; there is no student ownership enforcement or protected ticket lookup. |
| SEC-7 — Stripe-hosted Checkout; no card data in servers/logs | partly satisfied | No card collection or payment logging exists. Stripe Checkout is intentionally absent under the demo constraints. |
| SEC-8 — Charges calculated from stored price on server | not satisfied | Prices for browsing come from server records, but no charge or quantity-validation flow exists. |
| SEC-9 — Verify webhook signatures; reject and log invalid ones | not satisfied | No Stripe webhook handler, signature verification, or rejection logging. |
| SEC-10 — Process Stripe event IDs at most once | not satisfied | No Stripe events, idempotency storage, ticket issuance, or refunds. |
| SEC-11 — Stripe keys in secrets manager, never source; live keys only in production | partly satisfied | No keys or environment files are required or included; `.gitignore` excludes `.env*` except `.env.example`. No secrets manager or production key policy is implemented. |
| SEC-12 — Two approvals for connected Stripe account changes | not satisfied | No connected accounts, roles, payout changes, or approval workflow. |
| SEC-13 — Random, PII-free QR tokens of at least 128 bits | partly satisfied | Live sample token identities are four public fixtures generated once from 16 random bytes (128 bits), with no PII; every instance recognizes the same catalog. The factory still supports random per-store tokens and its 100,000-token test passes. No QR images are encoded/scanned, and public fixtures provide no secrecy or authorization. |
| SEC-14 — Atomic check-in on simultaneous scans | partly satisfied | Check-and-mark is synchronous in one server process; automated unit and 50-request local HTTP checks each produce exactly one success. State is not shared across Vercel instances and resets on restart/deploy, so production exactly-once check-in is not guaranteed. |
| SEC-15 — Invalid scan limit and officer notification | not satisfied | Manual token check-in exists, but there are no verified accounts, invalid-scan rate limits, five-minute pauses, or officer notifications. |
| SEC-16 — Checkout hoarding limit | not satisfied | No checkout or per-account rate limiter. |
| SEC-17 — Only allowed purchase personal fields collected | partly satisfied | Browsing collects no purchaser personal data at all. There is no purchase schema or allowlist enforcing this rule for future purchases. |
| SEC-18 — Remove attendee names/emails 90 days after event | not satisfied | No attendee records or scheduled retention/anonymization process. In-memory resets are not a retention policy. |
| SEC-19 — Hosting-officer-only CSV export with limited fields and logging | not satisfied | Exports, officers, permission checks, and export logs are absent. |
| SEC-20 — Officer-entered event text displayed as plain text | fully satisfied | All event titles, descriptions, clubs, and locations render through React text interpolation; no HTML injection API is used. No officer editing is offered. A browser check confirmed an injected HTML event description appeared literally, created no image element, and executed no handler. |
| SEC-21 — Actor, change, timestamp audit log for sensitive actions | not satisfied | No listed sensitive actions or audit logger are implemented. |
| SEC-22 — Append-only, admin-only logs retained for a year | not satisfied | No audit-log storage, access control, immutability, or retention. |

Additional requirements-file security gaps: no per-user 100-request/minute limiter, IDOR protection, webhook security tests, or concurrent-buyer test exists. They remain outside the homework implementation; invalid-scan throttling for check-in is also unimplemented. The app does set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a restrictive referrer policy in Next.js configuration; their delivery was confirmed on both the page and API responses. These headers do not satisfy HTTPS, authentication, or authorization requirements.

## Public repository preparation

This repository contains Story 1 and the scoped Story 6 homework demo. `.gitignore` excludes `node_modules`, `.next`, and `.env*`, with an explicit exception for the secret-free `.env.example`. The example contains comments only; the app needs no configuration secrets. Generated dependencies and build output must stay untracked.

Before publication, the candidate files for the initial commit were checked with Gitleaks 8.30.1 using full redaction: no leaks found (exit 0). This checks known secret patterns; it is not a guarantee that every possible secret can be detected. The original failing test output, passing test/build output, browser verification, and screenshots remain in `verification/` as assignment evidence. These logs include local development paths but contain no required application secrets.

## HW3 scope and limitations

Part B adds **Story 6: Check-in** using manual QR-token entry and clearly labeled seeded sample tickets. Camera scanning and purchasing are out of scope.

- **Simulated payments only:** no real payments or card collection; check-in has no payment flow.
- **Typed names instead of authentication:** the officer name is a demo label, not verified identity or officer/club authorization. Use a fictional demo name.
- **Server-memory storage only:** public sample token identities are fixed demo fixtures; mutable used-ticket state resets on restart/deploy and is not shared across Vercel instances. One-process duplicate prevention is not reliable cross-instance duplicate prevention. Do not use this demo for real admission.

The persistence question and the user's answer are saved in [HW3 homework notes for Part E](docs/HW3_NOTES.md). No Part C work is included.

## HW3 Part B results and acceptance tests

Before the check-in implementation existed, all Story 6 tests were written in `tests/story-6.test.mjs`, and `npm test` failed with `ERR_MODULE_NOT_FOUND` for `lib/checkin.mjs`: **tests 10, pass 9, fail 1, exit 1**. The nine Story 1 tests passed; the Story 6 test file could not load yet. Its ten test cases were not individually executed in that failing run. No tests were deleted, skipped, or weakened afterward.

After implementation, `npm test` completed with **tests 19, pass 19, fail 0, skipped 0, exit 0** (nine Story 1 and ten Story 6 cases). `npm run build` reported **Compiled successfully in 372ms**, generated **3/3** static pages, included `/checkin` and `/api/checkin`, and exited **0**. These are actual local results, not Vercel or user manual-test results.

| Acceptance criterion / safeguard | Test name in `tests/story-6.test.mjs` | Result |
|---|---|---|
| Story 6: a valid token marks its ticket used | `story6_valid_scan_marks_ticket_used` | Passed |
| Story 6: subsequent scans are rejected without changing the first check-in time | `story6_duplicate_scan_rejected` | Passed |
| Unknown token rejects without mutation | `story6_invalid_scan_rejected_without_mutation` | Passed |
| One-process simultaneous check-in succeeds exactly once | `story6_concurrent_scans_single_checkin` | Passed |
| Token portion of SEC-13: random 128-bit PII-free tokens; 100,000 unique samples | `story6_tokens_random_and_pii_free` | Passed |
| Required typed name and bounded inputs | `story6_validation_rejects_missing_or_oversized_inputs` | Passed |
| Factory snapshots cannot mutate storage; default random factory reseeds (deployed catalog is now stable) | `story6_sample_records_are_copies_and_restart_reseeds` | Passed |
| Seeded used fixture is rejected | `story6_seeded_used_ticket_is_rejected` | Passed |
| API success, duplicate 409, invalid 404, no caching | `story6_api_valid_duplicate_invalid_and_no_cache` | Passed |
| API malformed JSON and missing name return 400 | `story6_api_malformed_json_and_missing_name_rejected` | Passed |

Additional **post-implementation local browser verification**: `node verification/hw3-part-b-browser.mjs` reported **11 passed, 0 failed**. It verified loading samples, visible limitations, required name, successful/duplicate/invalid submissions, pending-state disabling, offline failure and retry, Enter activation, mobile layout, and no uncaught exceptions. It also submitted 50 concurrent real HTTP check-in requests to one local process: **1 success, 49 duplicate rejections**. The offline case was intercepted in the temporary browser session. This does not prove distributed correctness or count as the user's live-site manual checks.

### Localhost click instructions

The updated production app is served at **http://127.0.0.1:3000** while its local server remains running. To restart later, run `npm run build` and `npm start` in this folder. Restarting clears used-ticket state while retaining the same public sample-token identities; it deliberately loses previous check-ins.

1. Open http://127.0.0.1:3000 and click **Demo check-in**, or open http://127.0.0.1:3000/checkin directly.
2. Enter **Demo Officer** in **Officer name (demo label)**.
3. Under **Seeded sample tickets**, select and copy the token for **Sample Alex** (or another **Unused sample**). Paste it into **QR token**.
4. Click **Check in ticket**. Expect **Checked in**, that sample attendee's name, and a timestamp. The sample changes to **Already used**.
5. Click **Check in ticket** again with the same token. Expect **Already used** and the original timestamp, with no new success.
6. Replace the token with **not-a-real-ticket**, then click **Check in ticket**. Expect **Invalid ticket**. No ticket should be changed.

The fourth seed, **Sample Drew**, starts used and can demonstrate a rejection without consuming another sample. This demo has no reset endpoint or ticket-creation workflow; restart the local server to restore fresh samples.

### Three manual checks for the live Vercel site — observed results

After Vercel deploys the pushed commit, use your live site's `/checkin` page. Record **actual observed results and pass/fail yourself**. The user reported the first failure below; the other manual outcomes remain unreported.

| # | Manual action | Expected result | Actual result |
|---|---|---|---|
| 1 | Enter **Demo Officer**, copy a currently unused sample token from the live page, and submit it. | **Checked in**, matching fictional attendee, and check-in timestamp. | **Failed on f68a4b6:** user submitted the exact unused Sample Alex token with Demo Officer; server returned **Invalid ticket**. |
| 2 | Immediately submit the same token again. | Required rejection: **Already used**, with the original timestamp, when both requests reach the same instance. | Not yet run |
| 3 | Submit **not-a-real-ticket** with the demo name entered. | Required rejection: **Invalid ticket**, with no admission confirmation. | Not yet run |

The user's valid-token rejection is preserved as a real failure; it is not treated as acceptable completion. The follow-up fix uses a process-wide store and stable public fixture identities so a different instance can recognize a shown token. A repeated token can still be accepted after a restart/instance change because mutable state is not shared. Record any such outcome accurately and do not claim the live duplicate check passed. Localhost remains the repeatable single-process acceptance environment.

### Exactly what to screenshot

In your terminal, display the saved, unedited outputs (no test rerun is needed):

```sh
cat verification/hw3-part-b-tests-before.log
cat verification/hw3-part-b-tests-after.log
cat verification/hw3-part-b-build.log
```

Take separate screenshots:

1. **Before implementation:** the missing-module error and bottom summary **tests 10 / pass 9 / fail 1 / Exit status: 1**.
2. **After implementation:** the named Story 6 passing tests and bottom summary **tests 19 / pass 19 / fail 0 / skipped 0 / Exit status: 0**.
3. **Build:** **Compiled successfully in 372ms**, the route list including **/checkin** and **/api/checkin**, and **Exit status: 0**.

Optional extra evidence: `cat verification/hw3-part-b-browser.log` shows **11 passed, 0 failed** and the 50-request local concurrency result. Local browser screenshots are [desktop](verification/hw3-part-b-desktop.png) and [mobile](verification/hw3-part-b-mobile.png). Their visible sample tokens are public fictional fixtures, not credentials.

## Part B follow-up: live valid-token rejection

**User-observed failure on f68a4b6:** the exact unused Sample Alex token, submitted with Demo Officer, returned **Invalid ticket**. The original live-check result above remains failed. [Homework notes](docs/HW3_NOTES.md) preserve the report, investigation, and persistence decision.

GET and POST originally shared a lexical store in one route module; separate module evaluations or processes nevertheless created different stores and random catalogs. Loading the route independently twice reproduced **GET 200 (unused Sample Alex) → POST 404 Invalid ticket** locally. An initial live probe reached a warm store and succeeded, so the original deployment's exact instance routing has not been proved.

The fix shares the mutable store via a process-wide symbol and uses four stable, public random sample-token fixtures across runtimes. Their identities are intentionally in source, not secrets. The state remains memory-only: **no database, no authentication, no reliable duplicate prevention across instances**. The default factory's random-token tests are unchanged. New isolated-runtime tests prove both token recognition and the continuing lack of shared used state.

Regression evidence:
- [Pre-fix tests](verification/hw3-part-b-checkin-fix-tests-before.log): **19 pass, 4 fail, exit 1**.
- [Post-fix tests](verification/hw3-part-b-checkin-fix-tests-after.log): **23 pass, 0 fail, skipped 0, exit 0**.
- [Independent-module reproduction](verification/hw3-part-b-checkin-fix-reproduction.json).
- [Initial live probe](verification/hw3-part-b-checkin-fix-live-before.json): did not reproduce the user's intermittent failure.
- [Follow-up build](verification/hw3-part-b-checkin-fix-build.log).

**Live automated verification passed on fix commit `e8931f8` at 2026-10-22 23:11 UTC.** Headless Chrome used the actual deployed form at https://tartan-tickets-five.vercel.app/checkin: exact displayed unused Sample Alex token plus Demo Officer returned **200 Checked in**; immediate repeat returned **409 Already used** with the original timestamp; an unknown token returned **404 Invalid ticket**. Five deployed-browser checks passed, exit 0. The three GET catalog probes and tested submissions observed one store ID; no live cross-instance guarantee is inferred. The original user-reported failure remains recorded above; a user manual retest is still pending. Reload the page before copying a token to discard any pre-fix random catalog retained by an old browser tab.

Evidence: [live browser output](verification/hw3-part-b-checkin-fix-live-browser.log), [structured results](verification/hw3-part-b-checkin-fix-live-after.json), and [live screenshot](verification/hw3-part-b-checkin-fix-live.png). Reproduce the automated live check with `node verification/checkin-live-verify.mjs https://tartan-tickets-five.vercel.app` while unused fixtures remain. This consumes sample tickets on the live instance. Independent-runtime regression tests provide separate proof of stable token recognition and the continuing used-state limitation. `X-Demo-Store-Id` identifies a runtime store for diagnosis; `X-Demo-Fixture-Version: hw3-v2` distinguishes the fixed catalog. These headers are diagnostic, not authorization. Original Part B logs remain historical evidence and are not overwritten.
