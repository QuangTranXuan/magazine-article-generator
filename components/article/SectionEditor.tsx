"use client";

import { useState } from "react";
import type { BodySection } from "@/lib/schema";

interface SectionEditorProps {
  sections: BodySection[] | null;
  onChange: (sections: BodySection[]) => void;
}

export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const items = sections ?? [];

  const updateSection = (index: number, field: keyof BodySection, value: string) => {
    const updated = items.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange(updated);
  };

  const addSection = () => {
    onChange([...items, { heading: "", content: "" }]);
  };

  const removeSection = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Article Sections ({items.length})
        </h3>
        <button
          type="button"
          onClick={addSection}
          className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:hover:bg-teal-900/50"
        >
          + Add Section
        </button>
      </div>

      {items.map((section, index) => (
        <SectionItem
          key={index}
          section={section}
          index={index}
          onUpdate={(field, value) => updateSection(index, field, value)}
          onRemove={() => removeSection(index)}
        />
      ))}

      {items.length === 0 && (
        <p className="py-4 text-center text-sm italic text-gray-400">
          No sections yet. Click &ldquo;Add Section&rdquo; to start.
        </p>
      )}
    </div>
  );
}

function SectionItem({
  section,
  index,
  onUpdate,
  onRemove,
}: {
  section: BodySection;
  index: number;
  onUpdate: (field: keyof BodySection, value: string) => void;
  onRemove: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
        <input
          type="text"
          value={section.heading}
          onChange={(e) => onUpdate("heading", e.target.value)}
          placeholder="Section heading..."
          className="flex-1 bg-transparent text-sm font-semibold text-gray-800 focus:outline-none dark:text-gray-200"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500"
          title="Remove section"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <textarea
            value={section.content}
            onChange={(e) => onUpdate("content", e.target.value)}
            placeholder="Section content..."
            rows={6}
            className="w-full resize-y rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          />
        </div>
      )}
    </div>
  );
}
