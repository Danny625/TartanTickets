# HW3 Part C — SEC-23 request body limit

Scope: enforce a 2,048-byte maximum on POST /api/checkin while reading its body. No authentication, database, payments, additional user stories, Part D, or Part E implementation.

## EARS requirement added before implementation

SEC-23: WHEN a POST request to `/api/checkin` exceeds 2,048 body bytes, THE system SHALL stop reading the body, return HTTP 413, and neither parse the body as JSON nor change ticket state.

## Audit before implementation

| Requirement | Status | Explanation |
|---|---|---|
| SEC-23 — Limit check-in request body to 2,048 bytes | not satisfied | POST /api/checkin calls request.json() without counting body bytes; an oversized request can be parsed and can change ticket state. |

The original row is also preserved in `verification/hw3-part-c-audit-before.md`. Tests and implementation have not been written at this initial documentation stage.


## Actual test-first evidence

Twelve SEC-23 tests were written before the implementation changed. The actual pre-fix `npm test` run reported **35 tests, 28 passed, 7 failed, skipped 0, exit 1**. In `oversized_request_returns_413_without_changing_ticket_state`, the actual result was **status 200**, **ticketStateUnchanged false**, and **unboundedJsonCalls 1**, instead of 413 / true / 0. The raw failure output is preserved unchanged in `verification/hw3-part-c-tests-before.log`, including the test runner's whitespace.

After implementation, the same unchanged tests reported **35 tests, 35 passed, 0 failed, skipped 0, exit 0**. All original Story 1 and Story 6 tests were retained unchanged. `npm run build` reported **Compiled successfully in 216ms**, generated **3/3** static pages, and exited **0**. Raw passing outputs are `verification/hw3-part-c-tests-after.log` and `verification/hw3-part-c-build.log`.

## Implementation and verification

The check-in route reads `request.body` through a stream reader into a fixed 2,048-byte buffer. Each actual chunk's byte length is checked before copying; overflow cancels the reader and returns 413. Only an in-limit completed body is decoded and parsed as JSON, and only then may normal ticket validation/mutation occur. The implementation does not use Content-Length as its enforcement mechanism.

| Coverage | Test in `tests/sec-23-request-body-limit.test.mjs` | Result |
|---|---|---|
| Oversized valid-token body returns 413, avoids unbounded request.json(), leaves all ticket state unchanged | `oversized_request_returns_413_without_changing_ticket_state` | Passed |
| Exact byte boundary allowed | `body_at_exactly_2048_bytes_can_check_in_a_valid_ticket` | Passed |
| Below boundary reaches normal validation | `body_at_2047_bytes_reaches_normal_validation` | Passed |
| One byte above boundary rejected | `body_at_2049_bytes_is_rejected` | Passed |
| Stream without Content-Length cancelled at the first overflow chunk; later chunk never pulled | `streamed_body_without_content_length_stops_and_cancels_at_overflow` | Passed |
| Misleading small declared length cannot bypass byte counting | `falsely_small_content_length_cannot_bypass_actual_byte_limit` | Passed |
| One large chunk rejected and cancelled | `a_single_large_stream_chunk_is_rejected_and_cancelled` | Passed |
| UTF-8 measured in bytes, not JavaScript characters | `UTF8_byte_count_rejects_multibyte_body_under_2048_characters` | Passed |
| Multibyte UTF-8 character split across chunks parses correctly at exactly 2,048 bytes | `exact_limit_UTF8_json_split_inside_a_multibyte_character_still_parses` | Passed |
| Oversized malformed JSON gets 413 rather than a parse-error 400 | `oversized_malformed_json_returns_413_before_JSON_parsing` | Passed |
| In-limit malformed JSON and empty bodies retain 400 behavior | `within_limit_malformed_JSON_and_empty_body_still_return_400` | Passed |
| Read failure returns 400 without ticket mutation | `stream_read_failure_returns_400_without_changing_ticket_state` | Passed |

An additional real local production-server check (`node verification/hw3-part-c-http.mjs`) passed **5 checks, 0 failed, exit 0**. It verified 2,049 bytes → 413 with no ticket mutation, streamed body without Content-Length → 413 with no mutation, exactly 2,048 bytes → 200 for a valid sample, 2,047 bytes → normal unknown-token 404, and a multibyte over-limit body → 413. Output: `verification/hw3-part-c-http.log`.

The misleading-Content-Length case is a direct route-handler test: an HTTP server may independently reject a mismatched wire length before application code runs. The real streamed HTTP check does not declare Content-Length. This requirement limits application reading/buffering/parsing; it is not a claim that Vercel or an upstream server never buffers incoming network data, nor a complete denial-of-service defense.

## Audit after implementation

| Requirement | Status | Explanation |
|---|---|---|
| SEC-23 — Limit check-in request body to 2,048 bytes | fully satisfied | POST /api/checkin counts actual stream bytes, buffers at most 2,048 bytes, cancels on overflow, and returns 413 before JSON parsing or ticket mutation. Boundary, UTF-8, streamed, misleading Content-Length, cancellation, and unchanged-state tests pass. |

The before row remains preserved above and in `verification/hw3-part-c-audit-before.md`. The current README uses the fully satisfied after row, also preserved in `verification/hw3-part-c-audit-after.md`. No other security requirement is newly claimed satisfied. Authentication, payments, database persistence, and cross-instance duplicate prevention remain outside this change.

## C-why (draft)

The server must enforce the limit because a client can bypass the browser and send HTTP requests directly. A model prompt cannot restrict incoming bytes, so the handler must count the body as it reads and reject oversized input before JSON parsing or ticket changes.

## Screenshot instructions

Display these existing saved outputs; there is no need to rerun tests merely for a screenshot:

```sh
sed -n '38,73p' verification/hw3-part-c-tests-before.log
cat verification/hw3-part-c-tests-after.log
cat verification/hw3-part-c-build.log
cat verification/hw3-part-c-audit-before.md
cat verification/hw3-part-c-audit-after.md
```

1. **Before screenshot:** summary `35 tests / pass 28 / fail 7` plus the main failure showing actual `200`, `ticketStateUnchanged: false`, `unboundedJsonCalls: 1` versus expected `413`, `true`, `0`. The raw log's final exit status is **1**.
2. **After screenshot:** named SEC-23 passing tests and summary `35 tests / pass 35 / fail 0 / skipped 0 / Exit status: 0`.
3. **Build screenshot:** `Compiled successfully in 216ms`, route list including `/api/checkin`, and `Exit status: 0`.
4. **Audit screenshots:** preserved before row **not satisfied** and after row **fully satisfied**.

Optional: `cat verification/hw3-part-c-http.log` shows the five real HTTP checks. This Part C record contains no Part D or Part E work and asserts no new user manual live-test results.
