"use client";

import { useState } from "react";

interface SourceTooltipProps {
  sourceQuote: string | null;
  rawNotes: string;
}

function isSourceInNotes(quote: string, notes: string): boolean {
  if (!quote) return false;
  const normalizedQuote = quote.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedNotes = notes.toLowerCase().replace(/\s+/g, " ");

  // Direct substring match
  if (normalizedNotes.includes(normalizedQuote)) return true;

  // Token overlap check (80% threshold)
  const quoteTokens = normalizedQuote.split(" ").filter(Boolean);
  const noteTokens = new Set(normalizedNotes.split(" ").filter(Boolean));
  const matchCount = quoteTokens.filter((t) => noteTokens.has(t)).length;
  return quoteTokens.length > 0 && matchCount / quoteTokens.length >= 0.8;
}

export default function SourceTooltip({ sourceQuote, rawNotes }: SourceTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sourceQuote) return null;

  const found = isSourceInNotes(sourceQuote, rawNotes);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen((o) => !o)}
        className="ml-1 inline-flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="View source"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Source from notes:</p>
          <p className={`text-sm italic ${found ? "text-gray-700 dark:text-gray-300" : "text-red-600 dark:text-red-400"}`}>
            &ldquo;{sourceQuote}&rdquo;
          </p>
          {!found && (
            <p className="mt-1 text-xs font-medium text-red-500">
              Source quote not found in original notes — verify this claim.
            </p>
          )}
        </div>
      )}
    </span>
  );
}
