"use client";

import { useState } from "react";

interface RawNotesPanelProps {
  rawNotes: string;
}

export default function RawNotesPanel({ rawNotes }: RawNotesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Original Notes
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {rawNotes}
          </pre>
        </div>
      )}
    </div>
  );
}
