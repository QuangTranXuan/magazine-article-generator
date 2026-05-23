import type { QueryResultRow } from "pg";

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

export function formatArticleRow(row: ArticleRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    raw_notes: row.raw_notes,
    filename: row.filename,
    hook: row.hook,
    body_sections: row.body_sections,
    best_for: row.best_for,
    not_for: row.not_for,
    ethics_notes: row.ethics_notes,
    key_facts: row.key_facts,
    sources: row.sources,
    confidence: row.confidence,
    llm_model: row.llm_model,
    generation_error: row.generation_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
