"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/upload/UploadZone";
import ParsedPreview from "@/components/upload/ParsedPreview";

interface UploadResult {
  raw_text: string;
  word_count: number;
  char_count: number;
  filename: string;
  warnings: string[];
}

export default function HomePage() {
  const router = useRouter();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleUploadSuccess = useCallback((result: UploadResult) => {
    setUploadResult(result);
    setGenerateError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploadResult) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: uploadResult.raw_text,
          filename: uploadResult.filename,
        }),
      });

      const data = await res.json();

      if (data.id) {
        router.push(`/articles/${data.id}`);
      } else {
        setGenerateError(data.message || "Generation failed.");
      }
    } catch {
      setGenerateError("Network error during generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [uploadResult, router]);

  const handleCancel = useCallback(() => {
    setUploadResult(null);
    setGenerateError(null);
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Turn rough notes into
          <br />
          <span className="text-teal-600">structured articles</span>
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400">
          Upload your .docx travel notes. AI extracts a structured magazine article
          with sourced claims, confidence ratings, and editable fields.
        </p>
      </div>

      {!uploadResult ? (
        <UploadZone onUploadSuccess={handleUploadSuccess} />
      ) : (
        <>
          <ParsedPreview
            rawText={uploadResult.raw_text}
            wordCount={uploadResult.word_count}
            filename={uploadResult.filename}
            warnings={uploadResult.warnings}
            onGenerate={handleGenerate}
            onCancel={handleCancel}
            isGenerating={isGenerating}
          />
          {generateError && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {generateError}
            </div>
          )}
        </>
      )}

      {/* How it works */}
      <div className="mt-16 grid grid-cols-3 gap-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
            1
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload .docx</p>
          <p className="text-xs text-gray-500">Rough notes, transcripts, anything</p>
        </div>
        <div>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
            2
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI structures it</p>
          <p className="text-xs text-gray-500">Sections, facts, sourced claims</p>
        </div>
        <div>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
            3
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Review & edit</p>
          <p className="text-xs text-gray-500">Edit any field, verify sources</p>
        </div>
      </div>
    </div>
  );
}
