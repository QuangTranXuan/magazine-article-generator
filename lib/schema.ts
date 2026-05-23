import { z } from "zod";

// --- Confidence levels ---
export const ConfidenceLevel = z.enum(["high", "medium", "low", "absent"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

// --- Body section ---
export const BodySectionSchema = z.object({
  heading: z.string(),
  content: z.string(),
});
export type BodySection = z.infer<typeof BodySectionSchema>;

// --- Key facts (all nullable) ---
export const KeyFactsSchema = z.object({
  price_range: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  best_season: z.string().nullable().default(null),
  difficulty: z.string().nullable().default(null),
  group_size: z.string().nullable().default(null),
  booking_notes: z.string().nullable().default(null),
});
export type KeyFacts = z.infer<typeof KeyFactsSchema>;

// --- Sources map ---
export const SourcesSchema = z.object({
  title: z.string().nullable().default(null),
  hook: z.string().nullable().default(null),
  best_for: z.string().nullable().default(null),
  not_for: z.string().nullable().default(null),
  ethics_notes: z.string().nullable().default(null),
  key_facts: z.string().nullable().default(null),
});
export type Sources = z.infer<typeof SourcesSchema>;

// --- Confidence map ---
export const ConfidenceMapSchema = z.object({
  title: ConfidenceLevel.default("absent"),
  hook: ConfidenceLevel.default("absent"),
  best_for: ConfidenceLevel.default("absent"),
  not_for: ConfidenceLevel.default("absent"),
  ethics_notes: ConfidenceLevel.default("absent"),
  key_facts: ConfidenceLevel.default("absent"),
});
export type ConfidenceMap = z.infer<typeof ConfidenceMapSchema>;

// --- LLM response schema (what LLM returns) ---
export const LLMArticleSchema = z.object({
  title: z.string().nullable().default(null),
  hook: z.string().nullable().default(null),
  body_sections: z.array(BodySectionSchema).nullable().default(null),
  best_for: z.array(z.string()).nullable().default(null),
  not_for: z.array(z.string()).nullable().default(null),
  ethics_notes: z.string().nullable().default(null),
  key_facts: KeyFactsSchema.nullable().default(null),
  sources: SourcesSchema.nullable().default(null),
  confidence: ConfidenceMapSchema.nullable().default(null),
});
export type LLMArticle = z.infer<typeof LLMArticleSchema>;

// --- Full article (DB row) ---
export const ArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  status: z.enum(["draft", "generating", "error", "published"]),
  raw_notes: z.string(),
  filename: z.string(),
  hook: z.string().nullable(),
  body_sections: z.array(BodySectionSchema).nullable(),
  best_for: z.array(z.string()).nullable(),
  not_for: z.array(z.string()).nullable(),
  ethics_notes: z.string().nullable(),
  key_facts: KeyFactsSchema.nullable(),
  sources: SourcesSchema.nullable(),
  confidence: ConfidenceMapSchema.nullable(),
  llm_model: z.string().nullable(),
  llm_raw_response: z.string().nullable(),
  generation_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Article = z.infer<typeof ArticleSchema>;

// --- Patch schema (user-editable fields only) ---
export const ArticlePatchSchema = z.object({
  title: z.string().nullable().optional(),
  hook: z.string().nullable().optional(),
  body_sections: z.array(BodySectionSchema).nullable().optional(),
  best_for: z.array(z.string()).nullable().optional(),
  not_for: z.array(z.string()).nullable().optional(),
  ethics_notes: z.string().nullable().optional(),
  key_facts: KeyFactsSchema.nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});
export type ArticlePatch = z.infer<typeof ArticlePatchSchema>;
