"use client";

import { useState } from "react";
import ConfidenceBadge from "./ConfidenceBadge";
import SourceTooltip from "./SourceTooltip";
import type { ConfidenceLevel } from "@/lib/schema";

interface ListEditorProps {
  label: string;
  items: string[] | null;
  confidence?: ConfidenceLevel;
  sourceQuote?: string | null;
  rawNotes: string;
  onChange: (items: string[]) => void;
}

export default function ListEditor({
  label,
  items,
  confidence,
  sourceQuote,
  rawNotes,
  onChange,
}: ListEditorProps) {
  const [newItem, setNewItem] = useState("");
  const list = items ?? [];

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...list, trimmed]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    onChange(list.map((item, i) => (i === index ? value : item)));
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
        {confidence && <ConfidenceBadge level={confidence} />}
        <SourceTooltip sourceQuote={sourceQuote ?? null} rawNotes={rawNotes} />
      </div>

      <div className="space-y-2">
        {list.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-teal-300 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1 rounded-lg border border-dashed border-gray-200 bg-transparent px-3 py-1.5 text-sm text-gray-700 focus:border-teal-300 focus:outline-none dark:border-gray-700 dark:text-gray-300"
        />
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}
