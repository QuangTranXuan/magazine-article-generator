# Code Review — Magazine Article Generator

**Date:** 2026-05-23
**Verdict:** BLOCK → fixed CRITICAL and HIGH issues below

---

## CRITICAL (2) — FIXED

### 1. No authentication or rate limiting on API routes
**Files:** All `app/api/` routes
**Risk:** Anyone can exhaust Anthropic credits via `/api/generate`, delete all articles, exfiltrate notes.
**Fix:** Added API key middleware check via `X-API-Key` header (configurable) and in-memory rate limiter on `/api/generate`.

### 2. Orphaned "generating" status articles
**File:** `app/api/generate/route.ts`
**Risk:** If UPDATE fails after INSERT, article permanently stuck in `generating` status.
**Fix:** Wrapped LLM+UPDATE block in try/catch that sets `status = 'error'` on any failure before rethrowing.

---

## HIGH (9) — FIXED

### 3. `repairLLM` has no timeout
**File:** `lib/llm.ts`
**Fix:** Added `AbortController` with 30s timeout to `repairLLM`.

### 4. `formatArticleRow` duplicated and typed as `any`
**Files:** `app/api/generate/route.ts`, `app/api/articles/[id]/route.ts`
**Fix:** Extracted to `lib/format.ts` with proper typing.

### 5. `SET_FIELD` reducer accepts arbitrary string key
**File:** `components/article/ArticleEditor.tsx`
**Fix:** Changed `field: string` to `field: "title" | "hook" | "ethics_notes"`.

### 6. `articles/page.tsx` swallows fetch errors
**File:** `app/articles/page.tsx`
**Fix:** Added error state, display error message on fetch failure.

### 7. `FieldEditor` stale draft after external reset
**File:** `components/article/FieldEditor.tsx`
**Fix:** Added `useEffect` to sync draft with value prop when not editing.

### 8. `handleSave` sends unvalidated state
**File:** `components/article/ArticleEditor.tsx`
**Fix:** Tightened via typed reducer field union (issue #5 fix covers this).

### 9. `articles/page.tsx` fetch doesn't check `r.ok`
**File:** `app/articles/page.tsx`
**Fix:** Added `r.ok` check before parsing JSON (merged with issue #6 fix).

### 10. Missing `pg` pool error handler
**File:** `lib/db.ts`
**Fix:** Added `pool.on('error', ...)` handler.

### 11. `layout.tsx` uses `<a>` instead of `<Link>`
**File:** `app/layout.tsx`
**Fix:** Replaced all `<a>` with Next.js `<Link>`.

---

## MEDIUM (8) — NOT FIXED (lower priority)

### 12. Unused `LLMParseError` import in `lib/llm.ts`
### 13. `expected_updated_at` read from unvalidated body
### 14. `isDirty` computed via `JSON.stringify` on every render
### 15. Index as key in SectionEditor/ListEditor
### 16. SourceTooltip not keyboard-accessible
### 17. `/api/generate` no max-length check on `raw_text`
### 18. `ssl: { rejectUnauthorized: false }` hardcoded
### 19. No UUID validation on client before fetch

## LOW (4) — NOT FIXED

### 20. `console.error` not structured logging
### 21. Mutable module-level singletons
### 22. Missing bodyParser size limit config
### 23. Client never sends `expected_updated_at`
