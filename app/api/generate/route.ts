import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateArticle } from "@/lib/llm";
import { toErrorResponse } from "@/lib/errors";
import { formatArticleRow, type ArticleRow } from "@/lib/format";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raw_text, filename } = body;

    if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json(
        { message: "raw_text is required.", code: "MISSING_RAW_TEXT" },
        { status: 400 }
      );
    }
    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { message: "filename is required.", code: "MISSING_FILENAME" },
        { status: 400 }
      );
    }

    // Create article row with generating status
    const insertResult = await query<{ id: string }>(
      `INSERT INTO articles (raw_notes, filename, status)
       VALUES ($1, $2, 'generating')
       RETURNING id`,
      [raw_text, filename]
    );
    const articleId = insertResult.rows[0].id;

    // Call LLM — wrapped in try/catch to prevent orphaned "generating" rows
    try {
      const result = await generateArticle(raw_text);

      if ("article" in result) {
        // Success
        const a = result.article;
        await query(
          `UPDATE articles SET
            title = $1, hook = $2, body_sections = $3,
            best_for = $4, not_for = $5, ethics_notes = $6,
            key_facts = $7, sources = $8, confidence = $9,
            llm_model = $10, llm_raw_response = $11,
            status = 'draft', updated_at = now()
          WHERE id = $12`,
          [
            a.title,
            a.hook,
            JSON.stringify(a.body_sections),
            a.best_for,
            a.not_for,
            a.ethics_notes,
            JSON.stringify(a.key_facts),
            JSON.stringify(a.sources),
            JSON.stringify(a.confidence),
            result.model,
            result.rawResponse,
            articleId,
          ]
        );

        const articleResult = await query<ArticleRow>(
          `SELECT * FROM articles WHERE id = $1`,
          [articleId]
        );

        return NextResponse.json(formatArticleRow(articleResult.rows[0]));
      } else {
        // LLM returned error — save partial result
        const partial = result.partialArticle;
        await query(
          `UPDATE articles SET
            title = $1, hook = $2, body_sections = $3,
            best_for = $4, not_for = $5, ethics_notes = $6,
            key_facts = $7,
            llm_raw_response = $8, generation_error = $9,
            status = 'error', updated_at = now()
          WHERE id = $10`,
          [
            partial?.title ?? null,
            partial?.hook ?? null,
            partial?.body_sections ? JSON.stringify(partial.body_sections) : null,
            partial?.best_for ?? null,
            partial?.not_for ?? null,
            partial?.ethics_notes ?? null,
            partial?.key_facts ? JSON.stringify(partial.key_facts) : null,
            result.rawResponse,
            result.error,
            articleId,
          ]
        );

        const articleResult = await query<ArticleRow>(
          `SELECT * FROM articles WHERE id = $1`,
          [articleId]
        );

        return NextResponse.json(formatArticleRow(articleResult.rows[0]), { status: 207 });
      }
    } catch (genError) {
      // Prevent orphaned "generating" rows — mark as error
      await query(
        `UPDATE articles SET status = 'error', generation_error = $1, updated_at = now() WHERE id = $2`,
        [genError instanceof Error ? genError.message : "Unknown generation error", articleId]
      ).catch(() => {
        // If even the error update fails, log but don't mask the original error
      });
      throw genError;
    }
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}
