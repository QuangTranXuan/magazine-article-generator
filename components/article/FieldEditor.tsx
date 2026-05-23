"use client";

import { useState, useRef, useEffect } from "react";
import ConfidenceBadge from "./ConfidenceBadge";
import SourceTooltip from "./SourceTooltip";
import type { ConfidenceLevel } from "@/lib/schema";

interface FieldEditorProps {
  label: string;
  value: string | null;
  confidence?: ConfidenceLevel;
  sourceQuote?: string | null;
  rawNotes: string;
  onChange: (value: string | null) => void;
  multiline?: boolean;
}

export default function FieldEditor({
  label,
  value,
  confidence,
  sourceQuote,
  rawNotes,
  onChange,
  multiline = false,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Sync draft with external value changes when not editing (#7 stale draft fix)
  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    onChange(trimmed || null);
  };

  return (
    <div className="group rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
        {confidence && <ConfidenceBadge level={confidence} />}
        <SourceTooltip sourceQuote={sourceQuote ?? null} rawNotes={rawNotes} />
      </div>

      {isEditing ? (
        <div>
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(value ?? "");
                  setIsEditing(false);
                }
              }}
              rows={4}
              className="w-full rounded-lg border border-teal-300 bg-teal-50/30 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-teal-700 dark:bg-teal-950/20 dark:text-gray-200"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setDraft(value ?? "");
                  setIsEditing(false);
                }
              }}
              className="w-full rounded-lg border border-teal-300 bg-teal-50/30 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-teal-700 dark:bg-teal-950/20 dark:text-gray-200"
            />
          )}
        </div>
      ) : (
        <div
          onClick={() => {
            setDraft(value ?? "");
            setIsEditing(true);
          }}
          className="min-h-[2rem] cursor-text whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        >
          {value || (
            <span className="italic text-gray-400">Click to add content...</span>
          )}
        </div>
      )}
    </div>
  );
}
