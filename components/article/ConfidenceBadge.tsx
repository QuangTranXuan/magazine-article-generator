"use client";

import type { ConfidenceLevel } from "@/lib/schema";

const CONFIG: Record<ConfidenceLevel, { label: string; className: string; tooltip: string }> = {
  high: {
    label: "High",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    tooltip: "Directly stated in the notes",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    tooltip: "Reasonably inferred from the notes",
  },
  low: {
    label: "Low",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    tooltip: "Weakly inferred — verify before publishing",
  },
  absent: {
    label: "Absent",
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    tooltip: "Not found in the notes",
  },
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export default function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const config = CONFIG[level];

  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
