import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");

    let sql = `SELECT id, title, filename, status, generation_error, created_at, updated_at
               FROM articles`;
    const params: string[] = [];

    if (status) {
      sql += ` WHERE status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}
