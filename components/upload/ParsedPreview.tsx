"use client";

interface ParsedPreviewProps {
  rawText: string;
  wordCount: number;
  filename: string;
  warnings: string[];
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export default function ParsedPreview({
  rawText,
  wordCount,
  filename,
  warnings,
  onGenerate,
  onCancel,
  isGenerating,
}: ParsedPreviewProps) {
  const previewText =
    rawText.length > 800 ? rawText.slice(0, 800) + "..." : rawText;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {filename}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {wordCount.toLocaleString()} words extracted
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Upload different file
        </button>
      </div>

      {warnings.map((w, i) => (
        <div
          key={i}
          className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        >
          {w}
        </div>
      ))}

      <div className="mb-6 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">
        {previewText}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`
            flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white
            transition-all duration-200
            ${isGenerating
              ? "cursor-not-allowed bg-teal-400"
              : "bg-teal-600 hover:bg-teal-700 active:scale-[0.98]"
            }
          `}
        >
          {isGenerating && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isGenerating ? "Generating article..." : "Generate Article"}
        </button>
      </div>
    </div>
  );
}
