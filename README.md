# Magazine Article Generator

A tool built that converts rough `.docx` travel notes into structured magazine articles using AI.

Authors upload unstructured notes — interview transcripts, Google Doc dumps, scattered observations — and get back a fully structured article with sourced claims, confidence ratings, and editable fields.

## Features

- **Upload .docx** — drag-and-drop or click to upload rough travel notes
- **AI-powered structuring** — Anthropic Claude extracts structured fields in a single pass (not prose with a schema on top)
- **Structured output** — title, hook, sectioned body, "best for" / "not for", ethics notes, key facts
- **Source citations** — every field links back to the exact quote from the original notes
- **Confidence ratings** — high / medium / low badges per field so authors know what to verify
- **Hallucination detection** — source quotes are checked against original notes; mismatches flagged in red
- **Inline editing** — click any field to edit before saving
- **Article persistence** — saved articles are viewable and editable later

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon serverless) |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Validation | Zod |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env.local

# Run the database migration
psql $DATABASE_URL -f migrations/001_initial.sql

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## How It Works

1. **Upload** — user drops a `.docx` file. The server parses it with `mammoth` and returns the extracted text for preview.
2. **Generate** — user confirms, and the text is sent to Claude with a structured extraction prompt. The LLM returns JSON validated against a Zod schema. If validation fails, a repair pass re-prompts the LLM with the error.
3. **Review** — the structured article is displayed with confidence badges and source tooltips. Every field is click-to-edit.
4. **Save** — edits are persisted to Postgres. Articles are listed and accessible later.

## Error Handling

The app handles 14+ unhappy paths including:

- Invalid file types, corrupt/password-protected files, empty documents
- LLM timeouts, rate limits, malformed JSON responses
- Zod validation failures with automatic repair pass
- Database unavailability, concurrent edit conflicts
- Short notes warnings, non-English language detection

## Key Design Decisions

- **Single-pass extraction** over multi-pass — avoids hallucination amplification from the model extracting from its own output
- **Separate upload and generate steps** — user previews parsed text before committing to an LLM call
- **Zod schema as the contract** — shared between LLM output validation, database, and UI
- **4-layer hallucination handling** — prompt grounding, source citations, confidence display, raw notes panel

See [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) for the full architecture, trade-offs, and scope decisions.

See [CODE-REVIEW.md](./CODE-REVIEW.md) for the comprehensive code review covering architecture, security, code quality, and silent failure analysis.

## Project Structure

```
app/
  page.tsx                    Upload flow
  articles/page.tsx           Article list
  articles/[id]/page.tsx      Article review/edit
  api/upload/route.ts         Parse .docx
  api/generate/route.ts       LLM structured extraction
  api/articles/               CRUD endpoints

lib/
  schema.ts                   Zod schemas (LLM, DB, patch)
  llm.ts                      Anthropic client + prompt + repair
  docx.ts                     mammoth wrapper + error handling
  db.ts                       Postgres connection pool
  format.ts                   Shared row formatter
  errors.ts                   Typed error hierarchy

components/
  upload/                     UploadZone, ParsedPreview
  article/                    ArticleEditor, FieldEditor, SectionEditor,
                              KeyFactsEditor, ListEditor, ConfidenceBadge,
                              SourceTooltip, RawNotesPanel
```

## Deployment

```bash
# Vercel (recommended)
vercel

# Set environment variables in Vercel dashboard:
# DATABASE_URL, ANTHROPIC_API_KEY
```

The `/api/generate` route is configured with `maxDuration: 60` in `vercel.json` for LLM calls.
