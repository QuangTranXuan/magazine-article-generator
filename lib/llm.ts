import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "./env";
import { LLMArticleSchema, type LLMArticle } from "./schema";
import { LLMTimeoutError, LLMRateLimitError } from "./errors";

const MODEL = "claude-sonnet-4-20250514";
const TIMEOUT_MS = 60_000;
const REPAIR_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are a magazine editor for Seek Sophie, a Singapore-based travel marketplace for handpicked experiences across Asia.
Your task is to convert rough travel notes into a structured article JSON object.

RULES:
1. Every field you populate must be directly supported by the provided notes.
2. If information for a field is absent from the notes, set the field to null — do NOT invent content.
3. For every non-null field, provide a "source" entry: a direct quote (≤40 words) from the notes that justifies the content.
4. Assign a confidence level to each field: "high" (directly stated), "medium" (reasonably inferred), "low" (weakly inferred), or "absent" (null field).
5. Do not add information you know about a destination that is not present in the notes.
6. Write in Seek Sophie's voice: warm, specific, non-hyperbolic, for discerning independent travelers.

OUTPUT: Return ONLY valid JSON matching the schema below. No prose, no markdown fences, no text before or after the JSON.

SCHEMA:
{
  "title": string | null,
  "hook": string | null,
  "body_sections": [
    {
      "heading": string,
      "content": string
    }
  ] | null,
  "best_for": string[] | null,
  "not_for": string[] | null,
  "ethics_notes": string | null,
  "key_facts": {
    "price_range": string | null,
    "duration": string | null,
    "best_season": string | null,
    "difficulty": string | null,
    "group_size": string | null,
    "booking_notes": string | null
  },
  "sources": {
    "title": string | null,
    "hook": string | null,
    "best_for": string | null,
    "not_for": string | null,
    "ethics_notes": string | null,
    "key_facts": string | null
  },
  "confidence": {
    "title": "high" | "medium" | "low" | "absent",
    "hook": "high" | "medium" | "low" | "absent",
    "best_for": "high" | "medium" | "low" | "absent",
    "not_for": "high" | "medium" | "low" | "absent",
    "ethics_notes": "high" | "medium" | "low" | "absent",
    "key_facts": "high" | "medium" | "low" | "absent"
  }
}`;

export interface GenerationResult {
  article: LLMArticle;
  model: string;
  rawResponse: string;
}

export interface GenerationError {
  error: string;
  rawResponse: string | null;
  partialArticle: Partial<LLMArticle> | null;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getAnthropicApiKey() });
  }
  return client;
}

function extractJSON(text: string): string {
  // Try to find JSON in the response — handle markdown fences, preamble text
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

async function callLLM(rawNotes: string): Promise<string> {
  const anthropic = getClient();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here are the rough travel notes to convert into a structured article:\n\n${rawNotes}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "";
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LLMTimeoutError();
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new LLMRateLimitError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function repairLLM(rawResponse: string, zodError: string): Promise<string> {
  const anthropic = getClient();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REPAIR_TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        system: "You are a JSON repair assistant. Fix the JSON to match the required schema. Return ONLY the corrected JSON, nothing else.",
        messages: [
          {
            role: "user",
            content: `Your previous response did not match the required schema.\n\nYour response:\n${rawResponse}\n\nValidation error:\n${zodError}\n\nReturn the corrected JSON only.`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateArticle(rawNotes: string): Promise<GenerationResult | GenerationError> {
  let rawResponse: string;

  try {
    rawResponse = await callLLM(rawNotes);
  } catch (error) {
    if (error instanceof LLMTimeoutError || error instanceof LLMRateLimitError) {
      return { error: error.message, rawResponse: null, partialArticle: null };
    }
    return {
      error: `LLM call failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      rawResponse: null,
      partialArticle: null,
    };
  }

  // First parse attempt
  const jsonStr = extractJSON(rawResponse);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try repair
    try {
      const repaired = await repairLLM(rawResponse, "Response is not valid JSON");
      const repairedJson = extractJSON(repaired);
      parsed = JSON.parse(repairedJson);
    } catch {
      return {
        error: "Failed to parse LLM response as JSON, even after repair attempt.",
        rawResponse,
        partialArticle: null,
      };
    }
  }

  // Zod validation
  const result = LLMArticleSchema.safeParse(parsed);
  if (result.success) {
    return { article: result.data, model: MODEL, rawResponse };
  }

  // Repair pass
  const zodErrorStr = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");

  try {
    const repaired = await repairLLM(rawResponse, zodErrorStr);
    const repairedJson = extractJSON(repaired);
    const repairedParsed = JSON.parse(repairedJson);
    const repairedResult = LLMArticleSchema.safeParse(repairedParsed);

    if (repairedResult.success) {
      return { article: repairedResult.data, model: MODEL, rawResponse };
    }

    // Partial recovery: return whatever fields parsed correctly
    return {
      error: `Article generated but some fields did not validate: ${zodErrorStr}`,
      rawResponse,
      partialArticle: parsed as Partial<LLMArticle>,
    };
  } catch {
    return {
      error: `Repair pass failed: ${zodErrorStr}`,
      rawResponse,
      partialArticle: parsed as Partial<LLMArticle>,
    };
  }
}
