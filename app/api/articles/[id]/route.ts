import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ArticlePatchSchema } from "@/lib/schema";
import { toErrorResponse } from "@/lib/errors";
import { formatArticleRow, type ArticleRow } from "@/lib/format";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query<ArticleRow>(`SELECT * FROM articles WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Article not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatArticleRow(result.rows[0]));
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate patch body
    const parseResult = ArticlePatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Invalid update data.",
          code: "VALIDATION_ERROR",
          errors: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const patch = parseResult.data;

    // Check article exists and get current updated_at
    const existing = await query<{ updated_at: string }>(
      `SELECT updated_at FROM articles WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { message: "Article not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Concurrent edit check
    if (body.expected_updated_at) {
      const dbTime = new Date(existing.rows[0].updated_at).getTime();
      const clientTime = new Date(body.expected_updated_at).getTime();
      if (dbTime > clientTime) {
        return NextResponse.json(
          {
            message: "This article was updated elsewhere. Reload to see the latest version.",
            code: "CONFLICT",
          },
          { status: 409 }
        );
      }
    }

    // Build dynamic update
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (patch.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(patch.title);
    }
    if (patch.hook !== undefined) {
      setClauses.push(`hook = $${paramIndex++}`);
      values.push(patch.hook);
    }
    if (patch.body_sections !== undefined) {
      setClauses.push(`body_sections = $${paramIndex++}`);
      values.push(JSON.stringify(patch.body_sections));
    }
    if (patch.best_for !== undefined) {
      setClauses.push(`best_for = $${paramIndex++}`);
      values.push(patch.best_for);
    }
    if (patch.not_for !== undefined) {
      setClauses.push(`not_for = $${paramIndex++}`);
      values.push(patch.not_for);
    }
    if (patch.ethics_notes !== undefined) {
      setClauses.push(`ethics_notes = $${paramIndex++}`);
      values.push(patch.ethics_notes);
    }
    if (patch.key_facts !== undefined) {
      setClauses.push(`key_facts = $${paramIndex++}`);
      values.push(JSON.stringify(patch.key_facts));
    }
    if (patch.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(patch.status);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { message: "No fields to update.", code: "NO_CHANGES" },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = now()`);
    values.push(id);

    const updateSql = `UPDATE articles SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    const updateResult = await query<ArticleRow>(updateSql, values);

    return NextResponse.json(formatArticleRow(updateResult.rows[0]));
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(`DELETE FROM articles WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Article not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}
