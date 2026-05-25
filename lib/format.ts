import type { QueryResultRow } from "pg";
import { z } from "zod";
import { BodySectionSchema, KeyFactsSchema, SourcesSchema, ConfidenceMapSchema } from "./schema";

export interface ArticleRow extends QueryResultRow {
  id: string;
  title: string | null;
  status: string;
  raw_notes: string;
  filename: string;
  hook: string | null;
  body_sections: unknown;
  best_for: string[] | null;
  not_for: string[] | null;
  ethics_notes: string | null;
  key_facts: unknown;
  sources: unknown;
  confidence: unknown;
  llm_model: string | null;
  llm_raw_response: string | null;
  generation_error: string | null;
  created_at: string;
  updated_at: string;
}

function safeParseJsonb<T>(schema: z.ZodType<T>, value: unknown): T | null {
  if (value === null || value === undefined) return null;
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export function formatArticleRow(row: ArticleRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    raw_notes: row.raw_notes,
    filename: row.filename,
    hook: row.hook,
    body_sections: safeParseJsonb(z.array(BodySectionSchema), row.body_sections),
    best_for: row.best_for,
    not_for: row.not_for,
    ethics_notes: row.ethics_notes,
    key_facts: safeParseJsonb(KeyFactsSchema, row.key_facts),
    sources: safeParseJsonb(SourcesSchema, row.sources),
    confidence: safeParseJsonb(ConfidenceMapSchema, row.confidence),
    llm_model: row.llm_model,
    generation_error: row.generation_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
