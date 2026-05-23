# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Magazine Article Generator for Seek Sophie — a tool that converts rough .docx travel notes into structured magazine articles using AI (Anthropic Claude). Built as a Next.js App Router application with TypeScript, Tailwind CSS, and Neon Postgres.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (type-checks included)
npm run lint         # ESLint
```

## Architecture

```
app/
├── page.tsx                    Upload flow (client component)
├── articles/page.tsx           Article list
├── articles/[id]/page.tsx      Article review/edit
├── api/upload/route.ts         POST: parse .docx → text
├── api/generate/route.ts       POST: text → LLM → structured article
├── api/articles/route.ts       GET: list articles
├── api/articles/[id]/route.ts  GET/PATCH/DELETE single article

lib/
├── schema.ts     Zod schemas — the contract between LLM, DB, and UI
├── llm.ts        Anthropic client, prompt, retry/repair logic
├── docx.ts       mammoth wrapper with typed errors
├── db.ts         Postgres connection pool
├── env.ts        Environment variable validation
├── errors.ts     Typed error hierarchy (AppError subclasses)

components/
├── upload/       UploadZone, ParsedPreview
├── article/      ArticleEditor, FieldEditor, SectionEditor, KeyFactsEditor,
                  ListEditor, ConfidenceBadge, SourceTooltip, RawNotesPanel
```

## Key Design Decisions

- **Upload and generation are separate API calls** — user previews parsed text before LLM call
- **Single-pass LLM extraction** — avoids hallucination amplification from multi-pass
- **Zod schema is the contract** — LLM output validated, repair pass on failure, partial results saved
- **4-layer hallucination handling** — prompt grounding, source citations, confidence badges, raw notes panel
- **ArticleEditor uses useReducer** for immutable state updates

## Environment Variables

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

## Database

Migration: `migrations/001_initial.sql` — run against Neon Postgres.
Single `articles` table with JSONB for body_sections, key_facts, sources, confidence.
