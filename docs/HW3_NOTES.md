# HW3 homework notes

## Part B scope decision — saved for Part E

Persistence question asked before implementation:
> Is a single-server demonstration acceptable? Reliable check-in across deployed instances requires shared state.

User answer:
> Server-memory storage is acceptable for this homework. Document that it resets on restart/deploy and is not shared across Vercel instances. Do not claim production authorization or reliable cross-instance duplicate prevention.

Agreed implementation scope: Story 6 with manual QR-token entry, clearly labeled seeded sample tickets, a typed officer-name demo label, no purchasing, no real authentication, and no database. Camera scanning is not explicitly required by the acceptance criterion and will not be added. No real attendee data should be entered. Payments, if ever introduced, must be simulated.

This records the decision for later Part E reflection; it does not start Part C or assert results for the user's live-site manual checks.
