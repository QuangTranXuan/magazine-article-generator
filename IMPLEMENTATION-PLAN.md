# Implementation Plan: Magazine Article Generator — Seek Sophie

## Overview

SaaS-style web tool: upload `.docx` rough travel notes → LLM extracts fully structured article → editable review UI → persist for later viewing. Prioritizes unhappy-path handling and hallucination transparency over visual polish.

---

## Technology Decision: TypeScript + Next.js

**Choice: TypeScript with Next.js (App Router) + Node. Not Java/Spring Boot.**

| Factor | TypeScript/Next.js | Java/Spring Boot |
|---|---|---|
| LLM SDK | First-class (`@anthropic-ai/sdk`, Vercel AI SDK with streaming) | Community wrappers, less streaming support |
| Deployment | `git push` to Vercel, done | Docker build + Railway/Render, separate frontend |
| `.docx` parsing | `mammoth` — lightweight, fast | Apache POI — heavy, JVM startup overhead |
| Full-stack | API routes + React in one project | Separate backend + frontend repos or Thymeleaf |
| Boilerplate | Minimal | Significant (annotations, config, DTOs) |
| "Build like your SaaS" | Small-team shipping velocity | Enterprise ceremony |

**Conclusion:** Next.js eliminates operational overhead, ships faster, and has better LLM ecosystem support. Spring Boot would spend budget on boilerplate the evaluators won't reward.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js App (Vercel)                        │
│                                              │
│  /app                                        │
│    /page.tsx              Upload UI          │
│    /articles/page.tsx     Article list       │
│    /articles/[id]/page.tsx  Article view     │
│                                              │
│  /app/api                                    │
│    /upload/route.ts       Parse .docx        │
│    /generate/route.ts     LLM call           │
│    /articles/route.ts     CRUD               │
│    /articles/[id]/route.ts Single article    │
└──────────────┬──────────────────────────────┘
               │
        ┌──────▼──────┐
        │  Postgres    │  (Neon serverless)
        │  articles    │
        └─────────────┘
```

No separate file storage. `.docx` parsed in-memory; plain text stored in DB. Original binary not persisted.

---

## Database Schema

```sql
CREATE TABLE articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',  -- draft | generating | error | published
  raw_notes         TEXT NOT NULL,
  filename          TEXT NOT NULL,
  hook              TEXT,
  body_sections     JSONB,       -- [{heading, content}]
  best_for          TEXT[],
  not_for           TEXT[],
  ethics_notes      TEXT,        -- nullable if not in notes
  key_facts         JSONB,       -- {price_range, duration, best_season, ...}
  sources           JSONB,       -- {field_name: "quote from notes"}
  confidence        JSONB,       -- {field_name: "high|medium|low|absent"}
  llm_model         TEXT,
  llm_raw_response  TEXT,        -- for debugging
  generation_error  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

Key decisions:
- `body_sections` is JSONB array, not a text column — truly structured, not prose with headings
- `sources` maps every field to exact quote from raw notes — hallucination audit trail
- `confidence` is separate from content — UI renders warning badges without polluting editable text
- `llm_raw_response` stored for debugging (rotate after 30 days in production)
- `generation_error` is first-class column, not just a log — UI reads it

---

## API Design

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/upload` | POST | Accept `.docx`, parse to text, return `{raw_text, word_count, filename}` |
| `/api/generate` | POST | Accept `{raw_text, filename}`, call LLM, create/update article, return structured result |
| `/api/articles` | GET | List articles (title, filename, status, created_at) |
| `/api/articles/[id]` | GET | Full article with all structured fields |
| `/api/articles/[id]` | PATCH | Update editable fields only (validated — no overwrite of llm_model, confidence) |
| `/api/articles/[id]` | DELETE | Hard delete |

**Key decision:** Upload and generation are **separate steps**. User sees parsed text before committing to LLM call. Enables retry without re-upload.

---

## LLM Prompt Strategy

### Single-pass structured extraction (not multi-pass)

Multi-pass (generate prose → extract fields) causes hallucination in second pass because model extracts from its own output. Single-pass forces grounding in source notes.

### Provider: Anthropic Claude

- `claude-3-5-haiku` for speed/cost, `claude-sonnet-4-20250514` for quality
- Fallback to OpenAI `gpt-4o-mini` if Anthropic unavailable
- Claude follows JSON-only instructions more reliably than GPT-4o

### System prompt (core rules)

```
You are a magazine editor for Seek Sophie, a Singapore-based travel marketplace.

RULES:
1. Every field must be directly supported by the provided notes.
2. If information is absent, set field to null — do NOT invent content.
3. For every non-null field, provide a "source" entry: a direct quote (≤40 words) from notes.
4. Assign confidence per field: "high" (directly stated), "medium" (inferred), "low" (weakly inferred), "absent" (null).
5. Do not add information you know about a destination that is not in the notes.
6. Voice: warm, specific, non-hyperbolic, for discerning independent travelers.

OUTPUT: Return ONLY valid JSON matching the schema. No prose before or after.
```

### JSON validation after extraction

1. Parse LLM response with `JSON.parse`
2. Validate with **Zod** against article schema
3. If validation fails → repair pass: re-prompt with Zod error message
4. If repair also fails → save partial result with `generation_error`, show user what was recovered

---

## Hallucination Handling (4 Layers)

| Layer | Mechanism | How |
|---|---|---|
| 1. Prompt grounding | System prompt forbids inventing content, requires null for absent fields | Preventive |
| 2. Source citation | Every field has parallel `sources` entry. UI shows quote on hover. If quote not found in raw notes → red flag | Detective |
| 3. Confidence display | Low-confidence fields show yellow warning badge | Informative |
| 4. Raw notes panel | Collapsible panel shows original notes alongside article. User verifies claims against source | Manual audit |

**Not in scope:** external fact-checking (e.g., verifying prices against internet). Would require separate tool.

---

## Error Handling: All Unhappy Paths

| Scenario | Detection | Response |
|---|---|---|
| Not `.docx` | MIME type + extension | 400: "Only .docx files accepted" |
| File > 5 MB | Size check | 400: file size feedback |
| Corrupt/password-protected `.docx` | mammoth throws | 422: "Could not read file. Password-protected?" |
| Empty text after parse | `trim().length === 0` | 422: "No readable text found" |
| Very short notes (<100 words) | Word count | Warning (not block): "Notes are short — article may be incomplete" |
| Non-English notes | `franc` language detection | Info: "Notes appear non-English — article generated in that language" |
| LLM timeout (>60s) | `AbortSignal` | Save with `generation_error`. Show retry button |
| LLM returns non-JSON | `JSON.parse` throws | Attempt repair pass. If fails, show raw in debug panel |
| LLM JSON fails Zod | Zod error | Attempt repair pass. Save partial result |
| LLM returns all nulls | All confidence = "absent" | Warning: "LLM could not extract structured data" |
| API key missing | Env var check at startup | 500 + "Service configuration error" |
| LLM rate limit (429) | API error code | Retry after 5s, once. Then: "Generation busy — try again in a minute" |
| Database unavailable | Connection error | 503. Return generated article to client even if save fails |
| Save fails on edit | PATCH 5xx | Optimistic rollback: "Save failed — changes unsaved" + retry |
| Article not found | 404 | Friendly: "This article may have been deleted" |
| Concurrent edit (two tabs) | `updated_at` check on PATCH | 409: "Updated elsewhere. Reload to see latest" |

---

## Component Architecture

```
app/
├── page.tsx                      Upload page
├── articles/
│   ├── page.tsx                  Article list
│   └── [id]/page.tsx             Article review/edit
├── api/
│   ├── upload/route.ts
│   ├── generate/route.ts
│   └── articles/
│       ├── route.ts
│       └── [id]/route.ts
├── layout.tsx
├── error.tsx
└── globals.css

components/
├── upload/
│   ├── UploadZone.tsx
│   └── ParsedPreview.tsx
├── article/
│   ├── ArticleEditor.tsx         Main container (useReducer for state)
│   ├── FieldEditor.tsx           Single editable field + confidence badge
│   ├── SourceTooltip.tsx         Shows source quote on hover
│   ├── ConfidenceBadge.tsx       high/medium/low/absent indicator
│   ├── SectionEditor.tsx         Body sections with heading + content
│   ├── KeyFactsEditor.tsx        Grid of key fact fields
│   └── RawNotesPanel.tsx         Collapsible original notes
└── ui/
    ├── Button.tsx
    ├── Badge.tsx
    └── Spinner.tsx

lib/
├── schema.ts                     Zod schema (contract between LLM, DB, UI)
├── db.ts                         Postgres client (Neon)
├── docx.ts                       mammoth wrapper + error handling
├── llm.ts                        Anthropic client + retry + repair
├── env.ts                        Env var validation at startup
└── errors.ts                     Typed error hierarchy

hooks/
├── useArticleEditor.ts           Edit state + optimistic save + rollback
└── useGenerationStatus.ts        Poll generation status
```

---

## Implementation Phases

### Phase 1: Foundation
1. Initialize Next.js: `npx create-next-app@latest --typescript --tailwind --app`
2. Set up Neon Postgres + run migration SQL
3. Define Zod schema (`lib/schema.ts`) — this is the contract everything derives from
4. Install deps: `mammoth @anthropic-ai/sdk zod pg`
5. Create `lib/env.ts`, `lib/errors.ts`, `lib/db.ts`

### Phase 2: Upload Pipeline
6. Build `lib/docx.ts` — mammoth wrapper with typed errors (CorruptFileError, EmptyDocumentError)
7. Build `POST /api/upload` — MIME check, size check, parse, return text
8. Build `UploadZone.tsx` — drag-drop, `.docx` only, error messages
9. Build `ParsedPreview.tsx` — show extracted text preview, word count, language detection

### Phase 3: LLM Generation
10. Build `lib/llm.ts` — Anthropic client, 60s timeout, 429 retry, repair pass
11. Write full system prompt with JSON schema and few-shot example
12. Build `POST /api/generate` — create article row → call LLM → validate → update row
13. Handle all generation failure modes (timeout, bad JSON, all nulls)

### Phase 4: Review + Edit UI
14. Build `ConfidenceBadge.tsx` — green/amber/red/gray
15. Build `SourceTooltip.tsx` — quote on hover, red flag if not found in notes
16. Build `FieldEditor.tsx` — textarea with confidence badge + source tooltip
17. Build `SectionEditor.tsx` — body sections array with add/remove
18. Build `KeyFactsEditor.tsx` — grid of nullable fact fields
19. Build `RawNotesPanel.tsx` — collapsible panel showing original notes
20. Build `ArticleEditor.tsx` — container with `useReducer`, explicit save button
21. Build `/articles/[id]/page.tsx` — server component fetch, pass to editor

### Phase 5: Persistence + List
22. Build `GET/PATCH/DELETE /api/articles/[id]` with conflict detection
23. Build `GET /api/articles` — list with status filter
24. Build `/articles/page.tsx` — table/card list, empty state with upload CTA
25. Build `useArticleEditor.ts` — optimistic save + rollback

### Phase 6: Hardening + Deploy
26. Wire up full upload flow on `/page.tsx` — upload → preview → generate → redirect
27. Add `error.tsx` error boundaries
28. Deploy to Vercel with `maxDuration: 60` for generate route
29. Run migration on Neon
30. Test with real `.docx` files

---

## What's Cut and Why

| Cut | Reason |
|---|---|
| Original `.docx` binary storage (S3) | Parsed text is what we use. Binary adds cost + complexity. Add R2 later if needed. |
| Streaming LLM response | Polling (2s interval) is simpler and more reliable. Streaming needs edge functions + client-side JSON parser. |
| Multi-user auth | Not in brief. Articles accessible by ID (obscure URL). Add Clerk in one day if needed. |
| Edit version history | Too much DB complexity for scope. Track `updated_at` only. |
| PDF / plain text upload | Brief says `.docx`. PDF needs different parser + cloud API. |
| Diff highlighting (notes vs article) | Token-level alignment is high cost, medium value. |
| Multi-LLM provider toggle in UI | Pick one (Anthropic). Fallback is code-level, not user-facing. |
| Rate limiting | Demo with one deployment. First production addition. |

---

## Edge Cases Surfaced (Not in Brief)

1. **PII in notes.** Interview transcripts contain names, prices paid. Sent to third-party LLM API. Mitigation: use Anthropic zero-data-retention agreement. Flag in writeup.

2. **Slack thread exports as `.docx`.** Timestamps, usernames, reactions inline → garbled text. Mitigation: regex pre-processing strip. Not built in Phase 1.

3. **Notes reference other articles** ("as we covered in our Bali piece"). LLM has no context. Will hallucinate or skip. Confidence system should flag as low.

4. **Mixed-language notes** (English + Vietnamese interview quotes). LLM handles it but confidence degrades. Surface as warning.

5. **Very long notes (>10K words).** Claude handles it but cost increases. Consider truncation warning at 8K words. Phase 1: use full context.

6. **LLM invents price ranges** for well-known destinations even when not in notes. Most likely hallucination mode. Source citation check catches this: if `sources.key_facts` doesn't match a span in raw notes, flag red.

---

## 3 Questions for the Client

1. **Who is the user?** Internal authors only, or guest contributors? Determines auth timeline and PII handling (notes sent to LLM API = legal concern for external users).

2. **What's the downstream format?** Does "saved" mean CMS import? If Contentful/WordPress, output schema should match their content model.

3. **Different article types = different templates?** Host profile vs. destination guide vs. experience review have different structures. Current prompt uses one template. If types differ, prompt needs branching.

---

## Deployment

- **Platform:** Vercel (hobby or pro)
- **Database:** Neon serverless Postgres (free tier: 3 GB)
- **Steps:** Push to GitHub → Connect Vercel → Set env vars (`DATABASE_URL`, `ANTHROPIC_API_KEY`) → `vercel.json` with `maxDuration: 60` → Run migration via `psql` → Verify

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Vercel 60s function timeout not enough for long notes | Medium | Use `claude-3-5-haiku` (fast). Move to background job if needed. |
| Zod schema too strict → false repair passes | Medium | Make arrays accept empty `[]` in addition to null. Test against 5 real docs. |
| Anthropic rate limit on free tier | Low | OpenAI fallback in `lib/llm.ts`. |
| Neon cold-start (~500ms) | Low | Use pooling endpoint. Invisible for demo. |

---

## Trade-offs

### 1. Single-pass LLM extraction vs. Multi-pass pipeline

**Chose:** Single prompt that extracts all structured fields at once.
**Alternative:** First pass generates prose article, second pass extracts structured fields from it.
**Why:** Multi-pass doubles LLM cost and latency. Worse, the second pass extracts from generated prose — not original notes — so hallucinations in pass 1 become "grounded facts" in pass 2. Single-pass forces every field to derive directly from source notes.
**Downside:** Single-pass produces slightly less polished prose in `body_sections` compared to a dedicated writing pass. Acceptable — authors will edit anyway.

### 2. Separate upload + generate steps vs. Single upload-to-article flow

**Chose:** Two discrete API calls — upload returns parsed text, user confirms, then generate runs.
**Alternative:** One endpoint: upload file → immediately generate article.
**Why:** Separating gives the user a preview checkpoint. They can catch wrong-file mistakes before burning an LLM call (~$0.01–0.05 per generation). Also enables retry-generation without re-upload.
**Downside:** Extra click in the flow. Slightly slower happy path. Worth it for error recovery.

### 3. Postgres (Neon) vs. SQLite / file-based storage

**Chose:** Neon serverless Postgres.
**Alternative:** SQLite via Turso, or JSON files on disk.
**Why:** Postgres handles concurrent reads/writes, JSONB querying, and `updated_at` conflict detection natively. Neon's free tier is generous (3 GB) and works with Vercel's serverless functions without connection pool hacks. SQLite on Vercel requires Turso (adds a vendor), and file-based storage doesn't survive Vercel's ephemeral filesystem.
**Downside:** Neon has ~500ms cold-start on free tier. Invisible for a demo but noticeable at scale.

### 4. Anthropic Claude vs. OpenAI GPT-4o

**Chose:** Anthropic Claude (haiku for speed, sonnet for quality) as primary. OpenAI as silent fallback.
**Alternative:** OpenAI as primary, or let user choose.
**Why:** Claude follows "return ONLY valid JSON" instructions more reliably. The structured extraction prompt demands strict JSON compliance — no preamble text, no markdown fences. GPT-4o occasionally wraps JSON in ```json blocks despite instructions. Claude's instruction-following for constrained output is stronger.
**Downside:** Anthropic's free-tier rate limits are tighter than OpenAI's. Mitigated by fallback.

### 5. Explicit save button vs. Auto-save on edit

**Chose:** Explicit save button with `isDirty` tracking.
**Alternative:** Debounced auto-save (2s after last keypress).
**Why:** Auto-save creates anxiety when editing LLM output — users want to review all changes before committing. Auto-save also generates many PATCH requests, and if one fails mid-edit the article is in a half-saved state. Explicit save is predictable.
**Downside:** User can lose edits if they close the tab without saving. Mitigated by browser `beforeunload` warning when dirty.

### 6. Zod repair pass vs. Fail immediately on bad LLM JSON

**Chose:** On Zod validation failure, re-prompt LLM with the error and ask for corrected JSON.
**Alternative:** Fail immediately and show error to user.
**Why:** LLM JSON failures are often minor — a missing field, a string where an array was expected. One repair pass fixes ~80% of these. Failing immediately wastes the user's time and the initial LLM cost.
**Downside:** Repair pass adds 5–15s latency on failure cases. Doubles LLM cost for that request. Acceptable because it only triggers on failures (~10-15% of requests).

### 7. No auth vs. Full auth system

**Chose:** No authentication. Articles accessible by UUID (obscure URL).
**Alternative:** Add Clerk/NextAuth with email login.
**Why:** Brief doesn't mention multi-user. Auth adds 4+ hours of implementation (signup flow, session management, article ownership filtering, protected routes). UUID-based access is sufficient for a demo — URLs are unguessable.
**Downside:** Anyone with a link can view/edit any article. No per-user article isolation. First thing to add for production.

### 8. Store parsed text only vs. Store original .docx binary

**Chose:** Parse `.docx` server-side, store only the extracted plain text in Postgres.
**Alternative:** Upload binary to S3/R2, store reference.
**Why:** The original binary is never needed after parsing. Storing it adds blob storage dependency (S3/R2), upload/download API complexity, and cost. The plain text in `raw_notes` is the source of truth for hallucination checking.
**Downside:** User cannot re-download original file. If mammoth misparses formatting (tables, images), the original is lost. Acceptable — the tool processes text notes, not formatted documents.

### 9. Polling for generation status vs. Server-Sent Events / WebSocket streaming

**Chose:** Client polls `/api/articles/[id]` every 2s during generation.
**Alternative:** Stream LLM tokens to client via SSE, show article building in real-time.
**Why:** Streaming requires edge runtime, client-side incremental JSON parsing, and partial UI rendering of incomplete structured data. Polling is 20 lines of code, works everywhere, and the generation takes 10–30s — not long enough for streaming to matter much.
**Downside:** 2s polling granularity means user sees "Generating..." for up to 2s after completion. No real-time progress indicator. User experience is slightly less "magical."

### 10. Fixed article template vs. Multiple article types

**Chose:** One template (destination/experience article) with fixed fields.
**Alternative:** Let user pick article type (host profile, destination guide, experience review) with different field schemas per type.
**Why:** Brief describes one article format. Multiple templates multiply the prompt engineering, Zod schemas, editor components, and testing surface. Ship one well, then branch.
**Downside:** Host profiles and listicles don't fit the "best for / not for" structure. Authors would need to delete irrelevant fields manually.

---

## Testing Strategy

**Unit:** `lib/docx.ts` (valid/corrupt/empty/protected), `lib/schema.ts` (Zod parse/reject), `lib/llm.ts` (mock: timeout, 429, repair)

**Integration:** Upload route (various file types), Generate route (mock LLM), PATCH conflict detection

**E2E (Playwright):** Happy path (upload → generate → edit → save → list). Error paths (PDF upload, LLM timeout).

**Visual:** Upload page and article review at 768 and 1440.
