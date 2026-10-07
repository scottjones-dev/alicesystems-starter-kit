---
title: Errors
description: The one error shape every API response uses, and why Sentry privacy rules are a separate package.
---

# Errors: plan

## Requirements
- Users see calm, predictable errors. Clients branch on a stable `code`, never on message text.
- A bug never leaks its message, stack or cause to a client.
- The same contract works for web, native and any other client (POS tablets, field devices).
- Offline clients need a way to learn "your edit is based on an old copy".

## Design
`@repo/errors` is the contract only: pure code with one dependency (`zod`).

- `codes.ts`: nine error codes and the HTTP status each is sent with.
- `app-error.ts`: `AppError` (an error we expect and can explain), `errorBodySchema` (the JSON shape clients parse) and `toErrorBody()` (turns anything thrown into a status and a safe body).

```json
{ "error": { "code": "NOT_FOUND", "message": "Post not found", "requestId": "..." } }
```

| Code | Status | When |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | no valid session |
| `FORBIDDEN` | 403 | signed in, not allowed |
| `NOT_FOUND` | 404 | unknown route or record |
| `CONFLICT` | 409 | clashes with existing data |
| `STALE_VERSION` | 412 | an edit used an old `If-Match` version (offline sync) |
| `VALIDATION_FAILED` | 422 | input failed validation; may carry `fields` (paths only, never values) |
| `RATE_LIMITED` | 429 | too many requests |
| `INTERNAL` | 500 | a bug |
| `UNAVAILABLE` | 503 | a dependency (payments, mail) is down; safe to retry later |

## Decisions and trade-offs
- **Only expected errors are explained.** An `AppError` shows its message; everything else becomes `INTERNAL` with a generic message. `toErrorBody` accepts `unknown`, because JavaScript can throw any value.
- **`STALE_VERSION` and `UNAVAILABLE` are in the base set** because the platforms we build (field service, POS) sync offline and call payment providers. Each code is a permanent part of every client's contract, so add new ones sparingly.
- **Sentry privacy rules are not here.** Scrubbing is domain-specific (what counts as sensitive differs between a nursery and a pub), so it lives in the separate [`@repo/observability`](/docs/packages/observability) package with a small generic base list that each platform extends. next-forge's defaults (Session Replay, local variables, console logs sent to Sentry) are deliberately not used.
- **No HTTP framework code.** Mapping an `AppError` to a response belongs to the API app, not this package, so it works with any framework.

## Scale
No runtime cost beyond building a small object when an error happens.
