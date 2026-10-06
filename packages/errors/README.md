# @repo/errors

The error shape every API response uses.

## Why it exists

Users should see calm, predictable errors, and clients need something stable to branch on. This package defines the error codes, the `AppError` class and the JSON body once, so the API, web and native apps agree. It has no framework or Sentry dependency. The reasoning is in [`docs/content/docs/errors.md`](../../docs/content/docs/errors.md).

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/errors/codes` | `errorCodeNames`, `ErrorCode`, `statusByCode` (the HTTP status of each code) |
| `@repo/errors/app-error` | `AppError`, `errorBodySchema` (zod), `ErrorBody`, `toErrorBody()` |

## Use it

```ts
import { AppError, toErrorBody } from "@repo/errors/app-error";

// In a handler: an error we expect and can explain.
throw new AppError("NOT_FOUND", "Post not found");

// In the API's error handler: turn anything thrown into a safe response.
const { body, status } = toErrorBody(error, requestId);
```

A body looks like `{ "error": { "code": "NOT_FOUND", "message": "...", "requestId": "..." } }`. Clients branch on `code`. A `VALIDATION_FAILED` body may carry `fields` (the paths of the invalid inputs, never their values).

Anything that is not an `AppError` is treated as a bug: the client sees code `INTERNAL` and a generic message, never the real message or stack.

## Tests

`pnpm --filter @repo/errors test` covers the code table (every code has a distinct error status), `AppError` (defaults, `expose`, `cause`), `toErrorBody` (exposed and hidden messages, `fields`, plain errors and non-Error throws leaking nothing, output always matching the schema) and `errorBodySchema`.

`pnpm --filter @repo/errors check-types` for types.

## Depends on / used by

Depends on `zod` and `@repo/typescript-config`. Used by the API app (not built yet) and by clients that parse its errors.
