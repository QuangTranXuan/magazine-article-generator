"use client";

import type { KeyFacts } from "@/lib/schema";

const FACT_LABELS: Record<keyof KeyFacts, string> = {
  price_range: "Price Range",
  duration: "Duration",
  best_season: "Best Season",
  difficulty: "Difficulty",
  group_size: "Group Size",
  booking_notes: "Booking Notes",
};

interface KeyFactsEditorProps {
  facts: KeyFacts | null;
  onChange: (facts: KeyFacts) => void;
}

export default function KeyFactsEditor({ facts, onChange }: KeyFactsEditorProps) {
  const current: KeyFacts = facts ?? {
    price_range: null,
    duration: null,
    best_season: null,
    difficulty: null,
    group_size: null,
    booking_notes: null,
  };

  const updateFact = (key: keyof KeyFacts, value: string) => {
    onChange({ ...current, [key]: value.trim() || null });
  };

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Key Facts
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(FACT_LABELS) as Array<keyof KeyFacts>).map((key) => (
          <div
            key={key}
            className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
          >
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {FACT_LABELS[key]}
            </label>
            <input
              type="text"
              value={current[key] ?? ""}
              onChange={(e) => updateFact(key, e.target.value)}
              placeholder="Not available"
              className="w-full bg-transparent text-sm text-gray-700 focus:outline-none dark:text-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
