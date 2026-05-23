export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class CorruptFileError extends AppError {
  constructor(message = "Could not read this file. Is it password-protected or corrupted?") {
    super(message, 422, "CORRUPT_FILE");
    this.name = "CorruptFileError";
  }
}

export class EmptyDocumentError extends AppError {
  constructor(message = "No readable text found in this document.") {
    super(message, 422, "EMPTY_DOCUMENT");
    this.name = "EmptyDocumentError";
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(message = "Only .docx files are accepted.") {
    super(message, 400, "INVALID_FILE_TYPE");
    this.name = "InvalidFileTypeError";
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxMB = 5) {
    super(`File exceeds the ${maxMB} MB size limit.`, 400, "FILE_TOO_LARGE");
    this.name = "FileTooLargeError";
  }
}

export class LLMTimeoutError extends AppError {
  constructor(message = "Article generation timed out. Please try again.") {
    super(message, 504, "LLM_TIMEOUT");
    this.name = "LLMTimeoutError";
  }
}

export class LLMParseError extends AppError {
  constructor(message = "Failed to parse the generated article. A repair was attempted but also failed.") {
    super(message, 502, "LLM_PARSE_ERROR");
    this.name = "LLMParseError";
  }
}

export class LLMRateLimitError extends AppError {
  constructor(message = "Article generation is busy. Please try again in a minute.") {
    super(message, 429, "LLM_RATE_LIMIT");
    this.name = "LLMRateLimitError";
  }
}

export function toErrorResponse(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, statusCode: error.statusCode };
  }
  console.error("Unexpected error:", error);
  return { message: "An unexpected error occurred.", code: "INTERNAL_ERROR", statusCode: 500 };
}
