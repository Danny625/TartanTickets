# Part C security audit before implementation

This row was added to the README audit after SEC-23 was added to the security spec, before tests or implementation. It is preserved unchanged as before evidence.

| Requirement | Status | Explanation |
|---|---|---|
| SEC-23 — Limit check-in request body to 2,048 bytes | not satisfied | POST /api/checkin calls request.json() without counting body bytes; an oversized request can be parsed and can change ticket state. |
