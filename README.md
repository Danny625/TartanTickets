# Tartan Tickets

A Next.js App Router prototype implementing **Story 1: Browse events** only. Students can browse upcoming published club events with date, Pittsburgh time, location, price, and seats remaining. Sold-out events show **Join waitlist** in place of **Buy**.

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

- Story 1 is implemented in source. Stories 2–6 are deferred. The Buy and Join waitlist buttons display explanatory messages only. There is no checkout, reservation, waitlist storage, ticket issuance, email, refund, event management, or check-in.
- No payment flow is needed for browsing, so there is no payment button, Stripe integration, or card collection. A later payment story must use a **Simulated payment** button under the requested constraints.
- Browsing is public. There is no sign-in screen, provider, password, or user data collection. Any future demo identity flow must use a typed name and must not be treated as authenticated identity.
- Public event data lives in server-process memory. Restarting reseeds sample dates relative to the server start date; data is not shared between processes and does not persist. If a server stays running for long enough, sample events move into the past and disappear. Refresh reloads server data; it is not a live inventory subscription.
- API: only `GET /api/events` is implemented. It returns upcoming published events and `Cache-Control: no-store`. Mutation endpoints from later stories are absent.
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

The three input files in `docs/` were read. The test spec references REQ-1.1 through REQ-8.5 for workflows that do not map to the six numbered stories in the requirements file (for example, club approval is not Story 1). Accordingly, tests follow the actual **Story 1 acceptance criteria**. Later-story and security tests are not claimed to pass. The security spec also references absent assumption IDs A1–A12. Its 90-day retention requirement conflicts with the requirements file's one-year personal data retention; neither policy is implemented because this story stores no attendee data.

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

This audits every requirement in `docs/Starter Spec A - Tartan Tickets - SECURITY_SPEC.md` against this Story 1 prototype. “Not satisfied” includes deferred workflows; absence of a workflow does not establish its required protection. This is a source review, not a penetration test or independent human review.

| Requirement | Status | Explanation |
|---|---|---|
| SEC-1 — CMU SSO; no stored passwords | partly satisfied | No passwords are collected or stored. CMU SSO is absent; browsing is public as required for this limited demo. |
| SEC-2 — Eight-hour idle session expiration | not satisfied | No identity or sessions, hence no idle-expiration enforcement. |
| SEC-3 — HTTPS everywhere and HSTS | not satisfied | Local server uses HTTP. No HTTPS redirect or HSTS is configured. |
| SEC-4 — Server role and membership checks on every request | not satisfied | Only public browsing exists. There are no roles or membership checks. |
| SEC-5 — Cross-club denial and logging | not satisfied | Public events are readable by anyone; protected club resources, permission checks, and denial logs are absent. |
| SEC-6 — Other student's ticket returns not found | not satisfied | No tickets or ownership checks exist. Missing routes are not a ticket authorization implementation. |
| SEC-7 — Stripe-hosted Checkout; no card data in servers/logs | partly satisfied | No card collection or payment logging exists. Stripe Checkout is intentionally absent under the demo constraints. |
| SEC-8 — Charges calculated from stored price on server | not satisfied | Prices for browsing come from server records, but no charge or quantity-validation flow exists. |
| SEC-9 — Verify webhook signatures; reject and log invalid ones | not satisfied | No Stripe webhook handler, signature verification, or rejection logging. |
| SEC-10 — Process Stripe event IDs at most once | not satisfied | No Stripe events, idempotency storage, ticket issuance, or refunds. |
| SEC-11 — Stripe keys in secrets manager, never source; live keys only in production | partly satisfied | No keys or environment files are required or included; `.gitignore` excludes `.env*` except `.env.example`. No secrets manager or production key policy is implemented. |
| SEC-12 — Two approvals for connected Stripe account changes | not satisfied | No connected accounts, roles, payout changes, or approval workflow. |
| SEC-13 — Random, PII-free QR tokens of at least 128 bits | not satisfied | No QR codes, tickets, or token generation. |
| SEC-14 — Atomic check-in on simultaneous scans | not satisfied | No scanner, ticket state, or atomic check-in. |
| SEC-15 — Invalid scan limit and officer notification | not satisfied | No accounts, scanning, rate limiter, or notifications. |
| SEC-16 — Checkout hoarding limit | not satisfied | No checkout or per-account rate limiter. |
| SEC-17 — Only allowed purchase personal fields collected | partly satisfied | Browsing collects no purchaser personal data at all. There is no purchase schema or allowlist enforcing this rule for future purchases. |
| SEC-18 — Remove attendee names/emails 90 days after event | not satisfied | No attendee records or scheduled retention/anonymization process. In-memory resets are not a retention policy. |
| SEC-19 — Hosting-officer-only CSV export with limited fields and logging | not satisfied | Exports, officers, permission checks, and export logs are absent. |
| SEC-20 — Officer-entered event text displayed as plain text | fully satisfied | All event titles, descriptions, clubs, and locations render through React text interpolation; no HTML injection API is used. No officer editing is offered. A browser check confirmed an injected HTML event description appeared literally, created no image element, and executed no handler. |
| SEC-21 — Actor, change, timestamp audit log for sensitive actions | not satisfied | No listed sensitive actions or audit logger are implemented. |
| SEC-22 — Append-only, admin-only logs retained for a year | not satisfied | No audit-log storage, access control, immutability, or retention. |

Additional requirements-file security gaps: no per-user 100-request/minute limiter, IDOR protection, webhook security tests, or concurrent-buyer test exists. They require workflows beyond Story 1. The app does set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a restrictive referrer policy in Next.js configuration; their delivery was confirmed on both the page and API responses. These headers do not satisfy HTTPS, authentication, or authorization requirements.

## Public repository preparation

This repository contains Story 1 only. `.gitignore` excludes `node_modules`, `.next`, and `.env*`, with an explicit exception for the secret-free `.env.example`. The example contains comments only; the app needs no configuration secrets. Generated dependencies and build output must stay untracked.

Before publication, the candidate files for the initial commit were checked with Gitleaks 8.30.1 using full redaction: no leaks found (exit 0). This checks known secret patterns; it is not a guarantee that every possible secret can be detected. The original failing test output, passing test/build output, browser verification, and screenshots remain in `verification/` as assignment evidence. These logs include local development paths but contain no required application secrets.
