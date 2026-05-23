import { NextRequest, NextResponse } from "next/server";
import { parseDocx } from "@/lib/docx";
import { InvalidFileTypeError, FileTooLargeError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errors";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "No file provided.", code: "NO_FILE" },
        { status: 400 }
      );
    }

    // Validate file type
    const isDocxExtension = file.name.toLowerCase().endsWith(".docx");
    const isDocxMime = file.type === DOCX_MIME || file.type === "application/octet-stream";
    if (!isDocxExtension && !isDocxMime) {
      throw new InvalidFileTypeError();
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError();
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocx(buffer);

    const warnings: string[] = [];
    if (parsed.wordCount < 100) {
      warnings.push("These notes are quite short — the generated article may be incomplete.");
    }

    return NextResponse.json({
      raw_text: parsed.rawText,
      word_count: parsed.wordCount,
      char_count: parsed.charCount,
      filename: file.name,
      warnings,
    });
  } catch (error) {
    const err = toErrorResponse(error);
    return NextResponse.json(
      { message: err.message, code: err.code },
      { status: err.statusCode }
    );
  }
}
