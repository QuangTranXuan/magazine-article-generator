# Technical Issues & Fixes

Addressed feedback: *"token/context handling, an incomplete concurrent-edit implementation, retry logic that was mentioned but not built, and some database modelling decisions."*

---

## 1. Token / Context Handling

**Problem:** `rawNotes` was sent to the LLM with zero size guard. A 200K-character document would succeed but burn tokens and risk timeout. No truncation, no warning, no character limit anywhere in the pipeline.

**Where it was broken:**
- `app/api/generate/route.ts` — no input validation on `raw_text` length
- `lib/llm.ts:112` — `rawNotes` passed verbatim into the prompt

**Fix:**
- Added `MAX_RAW_TEXT_CHARS = 50,000` guard in `app/api/generate/route.ts` (~10K words)
- Added `InputTooLargeError` to `lib/errors.ts` with clear character/word count in the message
- Rejects before DB insert or LLM call — no wasted resources

**File changes:**
- `lib/errors.ts` — new `InputTooLargeError` class
- `app/api/generate/route.ts` — length check before processing

---

## 2. Incomplete Concurrent-Edit Implementation

**Problem:** The server had optimistic locking code that was permanently inert. Three compounding issues:

1. `ArticlePatchSchema` in `lib/schema.ts` did not declare `expected_updated_at`, so Zod stripped it from parsed input
2. The PATCH handler read `body.expected_updated_at` from the **raw** body after already using `parseResult.data` for everything else — mixed validated/unvalidated data
3. The client (`ArticleEditor.tsx`) never sent `expected_updated_at` at all

**Result:** Two tabs editing the same article would silently overwrite each other.

**Fix:**
- Added `expected_updated_at: z.string().datetime().optional()` to `ArticlePatchSchema`
- Server now destructures `expected_updated_at` from the **Zod-validated** result, not raw body
- Server returns `server_updated_at` in 409 response for debugging
- Client tracks `lastKnownUpdatedAt` state, initialized from the article prop
- Client sends `expected_updated_at` with every PATCH
- Client updates `lastKnownUpdatedAt` from each successful save response
- On 409 conflict: save button disabled, "Reload" button appears, clear error message shown

**File changes:**
- `lib/schema.ts` — `expected_updated_at` field added to `ArticlePatchSchema`
- `app/api/articles/[id]/route.ts` — conflict check uses Zod-validated field
- `components/article/ArticleEditor.tsx` — `lastKnownUpdatedAt` state, `hasConflict` state, 409 handling, Reload button

---

## 3. Retry Logic (Mentioned but Not Built)

**Problem:** `IMPLEMENTATION-PLAN.md` documented retry behavior for 429 (rate limit) and timeout errors, but `callLLM` had zero retry logic. A single transient failure would surface immediately to the user.

Additionally, `repairLLM` had an `AbortController` timeout but never classified the abort as `LLMTimeoutError` — it would throw a raw `AbortError` instead, which `toErrorResponse` would turn into a generic 500.

**Fix:**
- Extracted `callLLMOnce` as the single-attempt function
- `callLLM` now wraps it in a retry loop: up to `MAX_RETRIES = 2` additional attempts
- Exponential backoff: 2s, 4s between retries
- Only retries on `LLMTimeoutError` or `LLMRateLimitError` — other errors (auth, network) fail immediately
- Fixed `repairLLM` to catch `AbortError` and throw `LLMTimeoutError` with clear message

**File changes:**
- `lib/llm.ts` — `callLLMOnce`, retry loop in `callLLM`, `repairLLM` abort classification

---

## 4. Database Modelling Decisions

**Problem:** Several schema-level gaps:

| Issue | Risk |
|-------|------|
| `status` column has no CHECK constraint | Any string writable via direct SQL |
| No `updated_at` auto-trigger | Manual `updated_at = now()` in every UPDATE — fragile, easy to forget in migrations/hotfixes |
| JSONB columns (`body_sections`, `key_facts`, `sources`, `confidence`) read from DB as `unknown` with no validation | Malformed JSONB from partial saves or manual edits crashes the client at runtime |
| No index on `updated_at` | Conflict-check query unoptimized if table grows |

**Fix:**
- New migration `002_constraints_and_trigger.sql`:
  - `CHECK (status IN ('draft', 'generating', 'error', 'published'))` constraint
  - `update_updated_at_column()` trigger function — auto-sets `updated_at = now()` on every UPDATE
  - Index on `updated_at DESC`
- `lib/format.ts` — `safeParseJsonb()` helper validates JSONB columns through their Zod schemas before returning to client. Malformed data returns `null` instead of crashing.

**File changes:**
- `migrations/002_constraints_and_trigger.sql` — new migration
- `lib/format.ts` — Zod validation on JSONB read

---

## Summary

| Area | Before | After |
|------|--------|-------|
| Token handling | No limit, unbounded LLM calls | 50K char guard, clear error message |
| Concurrent edit | Dead code, always bypassed | Full optimistic locking: schema → server → client → UI |
| Retry logic | Zero retries, documented but unbuilt | 2 retries with exponential backoff for transient errors |
| DB modelling | No constraints, no trigger, unvalidated JSONB | CHECK constraint, auto-trigger, Zod validation on read |
