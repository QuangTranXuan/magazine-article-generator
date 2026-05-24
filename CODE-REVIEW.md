# Code Review Report

Comprehensive review of the Magazine Article Generator codebase covering architecture, code quality, security, and silent failure analysis.

**Date:** 2026-05-24
**Verdict:** BLOCK — 2 CRITICAL + 12 HIGH issues. Must resolve CRITICAL before any production exposure.

---

## Architecture Strengths

- **Zod-as-contract** — single schema in `lib/schema.ts` drives LLM prompt, DB validation, and client types. Changing a field cascades everywhere with TypeScript enforcement.
- **Typed error hierarchy** — `AppError` subclasses in `lib/errors.ts` + `toErrorResponse` give consistent HTTP semantics across all routes without repetition.
- **Orphan row protection** — `app/api/generate/route.ts` wraps the LLM call in nested try/catch to guarantee `generating` rows get flipped to `error` even on unexpected throws.
- **Repair-pass LLM** — `lib/llm.ts:repairLLM` issues a second Anthropic call on Zod failure before returning a partial result. Graceful degradation instead of hard errors.
- **Parameterized SQL everywhere** — no SQL injection vectors in any query.
- **Magic-byte validation** — `lib/docx.ts` validates PK zip header before mammoth runs, catching renamed/corrupt files early.
- **Concurrent edit conflict check** — PATCH uses `expected_updated_at` timestamp comparison.
- **Immutable reducer** — `ArticleEditor` uses `useReducer` with spread operators, never mutates state.

---

## CRITICAL Issues

### 1. No authentication or authorization on any API route

**Files:** All `app/api/` routes
**Impact:** Every endpoint (upload, generate, list, read, patch, delete) is publicly accessible. Anyone who can reach the server can upload files, trigger LLM calls (burning Anthropic API budget), read all stored articles, and delete content.

**Remediation:** Add authentication middleware. For an internal tool, a static `Authorization: Bearer <TOKEN>` header check against a server-side env variable provides meaningful protection. For multi-user, use NextAuth.js or similar.

### 2. No rate limiting on LLM generation endpoint

**File:** `app/api/generate/route.ts`
**Impact:** `POST /api/generate` triggers a 60-second Anthropic API call and writes to the database. Without rate limiting, there is no protection against cost amplification attacks or DoS via row creation. Compounded by the missing auth above.

**Remediation:** Add rate limiting (e.g., `next-rate-limit`) with a low per-IP limit (5 requests per 10 minutes) on this route.

---

## HIGH Issues

### 3. JSONB bypasses Zod validation on read

**File:** `lib/format.ts:24-44`
**Impact:** `body_sections`, `key_facts`, `sources`, and `confidence` are typed `unknown` from the DB row and returned to the client without Zod parsing. Malformed JSONB (from partial error saves, manual DB edits, or migrations) will crash `ArticleEditor` at runtime.

**Fix:** Run `ArticleSchema.safeParse(row)` in `formatArticleRow` before returning.

### 4. `isDirty` uses `JSON.stringify` comparison

**File:** `components/article/ArticleEditor.tsx:50`
**Impact:** `JSON.stringify` key order is insertion-order dependent. If the server returns fields in a different key order than the initial client state, `isDirty` is permanently `true` even with no user changes. Save button always appears active.

**Fix:** Replace with a deep-equal utility or field-by-field comparison.

### 5. No pagination on `GET /api/articles`

**File:** `app/api/articles/route.ts:9`
**Impact:** Query fetches all rows with no `LIMIT`. Silent time-bomb — the articles list will slow and eventually fail as data grows.

**Fix:** Add `LIMIT`/`OFFSET` pagination with a default page size.

### 6. `expected_updated_at` not in `ArticlePatchSchema`

**Files:** `lib/schema.ts`, `app/api/articles/[id]/route.ts:68`
**Impact:** The conflict check reads `body.expected_updated_at` directly from the raw body after Zod validation has already stripped it (schema doesn't declare this field). The check silently never fires if the schema is tightened with `.strict()`.

**Fix:** Add `expected_updated_at` as an optional field in `ArticlePatchSchema`.

### 7. `key={index}` on mutable lists

**Files:** `components/article/SectionEditor.tsx:44`, `components/article/ListEditor.tsx:55`
**Impact:** When a middle item is removed, React reuses existing DOM nodes and local state (e.g., `isExpanded`) attaches to the wrong section. Causes visible user-facing bugs.

**Fix:** Use a stable unique key — `crypto.randomUUID()` assigned at creation time, or a content-based key.

### 8. Floating fetch promises + spinner stuck on errors

**Files:** `app/articles/page.tsx:27-44`, `app/articles/[id]/page.tsx:14-27`
**Impact:** Both pages launch `.then()` promise chains inside `useEffect` with no cleanup on unmount. In `ArticlePage`, the `!r.ok` error path does not reliably clear loading state, so the spinner persists indefinitely on error.

**Fix:** Add abort controller cleanup. Ensure all error paths set `loading = false`.

### 9. `callLLM` returns empty string silently

**File:** `lib/llm.ts:120`
**Impact:** If Anthropic returns a response with no `text`-type content block, the function returns `""`. This triggers `JSON.parse("")` failure, activating the repair path with an empty string — burning a second LLM call for nothing. No log is emitted.

**Fix:** Throw a descriptive error (`"LLM returned no text block"`) instead of returning `""`.

### 10. `rejectUnauthorized: false` on DB SSL

**File:** `lib/db.ts:10`
**Impact:** Disabling certificate verification leaves the Postgres TLS connection vulnerable to man-in-the-middle attacks. Common dev workaround but dangerous in production.

**Fix:** Remove the option or gate behind `NODE_ENV`: `ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' }`.

### 11. No security headers / CSP configured

**File:** `next.config.ts`
**Impact:** No Content-Security-Policy, no `X-Frame-Options`, no `Strict-Transport-Security`, no `X-Content-Type-Options`. Any XSS vector has no CSP backstop.

**Fix:** Add a `headers()` export to `next.config.ts` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive CSP.

### 12. `llm_raw_response` leaked to client

**File:** `lib/format.ts`
**Impact:** `formatArticleRow` includes `llm_raw_response` in every GET/PATCH response. This field contains the full raw LLM output and is sent to the browser. It has no UI purpose and leaks implementation details.

**Fix:** Remove `llm_raw_response` from `formatArticleRow`.

### 13. Unvalidated `status` query param

**File:** `app/api/articles/route.ts:7`
**Impact:** `status` from query params is passed to the query without validation against the allowed enum (`draft`, `generating`, `error`, `published`). Can produce unexpected query behavior.

**Fix:** Validate against `ArticleSchema.shape.status` enum before use.

### 14. Unchecked `rows[0]` after INSERT

**File:** `app/api/generate/route.ts:34`
**Impact:** `insertResult.rows[0].id` is accessed without checking `rows.length > 0`. If the INSERT unexpectedly returns zero rows, this throws `TypeError: Cannot read properties of undefined`.

**Fix:** Add a guard: `if (!insertResult.rows[0]) throw new Error("Insert returned no rows")`.

---

## MEDIUM Issues

### 15. No size limit on `raw_text` in generate route

**File:** `app/api/generate/route.ts:14-19`
**Impact:** Upload enforces 5MB on `.docx`, but `/api/generate` accepts `raw_text` directly with no length cap. A caller can send megabytes of text, inflating Anthropic costs and exhausting the 60s function timeout.

**Fix:** Add `MAX_RAW_TEXT_CHARS` guard (e.g., 50,000 characters) before calling `generateArticle`.

### 16. 207 partial-error not surfaced in UI

**File:** `app/page.tsx:44-49`
**Impact:** The generate route returns 207 on partial success. The client only checks `data.id` and navigates — the user lands on an error-state article without warning that generation partially failed.

**Fix:** Check `res.status === 207` and show a warning before navigating, or pass a query param to the article page.

### 17. Swallowed error in generate cleanup

**File:** `app/api/generate/route.ts:110-112`
**Impact:** The `.catch(() => {})` comment says "log but don't mask" but the handler does neither. If the DB UPDATE to mark status as `error` fails, the row stays stuck in `generating` forever with no diagnostic trail.

**Fix:** Add `console.error("Failed to mark article as error:", e)` inside the catch.

### 18. `repairLLM` timeout not classified

**File:** `lib/llm.ts:134-161`
**Impact:** `repairLLM` has an `AbortController` timeout but abort errors are not converted to `LLMTimeoutError`. A repair timeout surfaces as a misleading "JSON parse failure."

**Fix:** Mirror the abort/rate-limit handling from `callLLM` inside `repairLLM`.

### 19. `articles/page.tsx` should be a server component

**File:** `app/articles/page.tsx`
**Impact:** Currently a `"use client"` page fetching on mount. Could be a server component making a direct DB call, eliminating the client round-trip and loading spinner waterfall.

---

## LOW Issues

### 20. `UploadResult` type duplicated

**Files:** `app/page.tsx:8-14`, `components/upload/UploadZone.tsx:6-11`
**Fix:** Extract to a shared type in `lib/schema.ts` or `lib/types.ts`.

### 21. Unstructured server-side error logging

**Files:** `lib/errors.ts:65`, `lib/db.ts:14`
**Impact:** `console.error` logs full error objects which may include connection strings in structured logging environments.

### 22. Zero test coverage

**Impact:** No test files exist at any level (unit, integration, E2E). The LLM repair logic, schema validation, and `formatArticleRow` are the highest-value test targets.

---

## Missing Patterns

| Pattern | Current State | Recommendation |
|---------|--------------|----------------|
| **Repository layer** | DB queries inlined in every route | Extract `ArticleRepository` with `findById`, `create`, `updateGenerated`, `patch` |
| **API response envelope** | Routes return raw objects | Standardize on `{data, error, meta}` envelope |
| **Test coverage** | Zero tests | Add unit tests for `llm.ts`, `schema.ts`, `format.ts` first |
| **Upload state persistence** | Raw text held in React state | Save raw text to DB on upload, reference by `upload_id` |

---

## Priority Fix Order

| Priority | Issue(s) | Effort |
|----------|----------|--------|
| **P0** | #1 Auth + #2 Rate limiting | Medium |
| **P1** | #3 Validate JSONB on read | Small |
| **P1** | #7 Fix `key={index}` | Small |
| **P1** | #5 Add pagination | Small |
| **P1** | #8 Fix loading/error states | Small |
| **P2** | #11 Security headers | Small |
| **P2** | #14 Unchecked `rows[0]` | Small |
| **P2** | #9 Empty LLM response | Small |
| **P2** | #15 Size-limit `raw_text` | Small |
| **P2** | #6 Schema fix for `expected_updated_at` | Small |
| **P3** | #4 Replace `isDirty` stringify | Small |
| **P3** | #12 Remove `llm_raw_response` from response | Small |
| **P3** | #22 Add tests | Large |

---

## Positive Notes

- All SQL queries are fully parameterized — no injection risk
- `ANTHROPIC_API_KEY` is correctly server-side only (no `NEXT_PUBLIC_` prefix)
- `.env*` is correctly gitignored
- Zod validation applied on PATCH bodies
- Error handling covers 14+ unhappy paths
- `useReducer` with immutable updates is well-implemented
- The overall architecture is sound for an internal tool — issues are about hardening, not fundamental design flaws
