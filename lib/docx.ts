import mammoth from "mammoth";
import { CorruptFileError, EmptyDocumentError } from "./errors";

const DOCX_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04]; // PK zip header

export interface ParsedDocument {
  rawText: string;
  wordCount: number;
  charCount: number;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // Validate PK zip header (docx is a zip archive)
  if (buffer.length < 4) {
    throw new CorruptFileError();
  }
  for (let i = 0; i < DOCX_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== DOCX_MAGIC_BYTES[i]) {
      throw new CorruptFileError("This file does not appear to be a valid .docx document.");
    }
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.trim();

    if (!rawText) {
      throw new EmptyDocumentError();
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const charCount = rawText.length;

    return { rawText, wordCount, charCount };
  } catch (error) {
    if (error instanceof EmptyDocumentError) throw error;
    throw new CorruptFileError();
  }
}
