"use client";

import { useReducer, useState, useCallback } from "react";
import FieldEditor from "./FieldEditor";
import SectionEditor from "./SectionEditor";
import KeyFactsEditor from "./KeyFactsEditor";
import ListEditor from "./ListEditor";
import RawNotesPanel from "./RawNotesPanel";
import type { Article, BodySection, KeyFacts, ArticlePatch } from "@/lib/schema";

type EditableTextField = "title" | "hook" | "ethics_notes";

type EditorAction =
  | { type: "SET_FIELD"; field: EditableTextField; value: string | null }
  | { type: "SET_SECTIONS"; sections: BodySection[] }
  | { type: "SET_KEY_FACTS"; facts: KeyFacts }
  | { type: "SET_BEST_FOR"; items: string[] }
  | { type: "SET_NOT_FOR"; items: string[] }
  | { type: "RESET"; article: Article };

function editorReducer(state: Article, action: EditorAction): Article {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SECTIONS":
      return { ...state, body_sections: action.sections };
    case "SET_KEY_FACTS":
      return { ...state, key_facts: action.facts };
    case "SET_BEST_FOR":
      return { ...state, best_for: action.items };
    case "SET_NOT_FOR":
      return { ...state, not_for: action.items };
    case "RESET":
      return action.article;
    default:
      return state;
  }
}

interface ArticleEditorProps {
  article: Article;
}

export default function ArticleEditor({ article: initial }: ArticleEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, initial);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState(initial.updated_at);
  const [hasConflict, setHasConflict] = useState(false);

  const isDirty = JSON.stringify(state) !== JSON.stringify(initial);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    const patch: ArticlePatch = {
      title: state.title,
      hook: state.hook,
      body_sections: state.body_sections,
      best_for: state.best_for,
      not_for: state.not_for,
      ethics_notes: state.ethics_notes,
      key_facts: state.key_facts,
      expected_updated_at: lastKnownUpdatedAt,
    };

    try {
      const res = await fetch(`/api/articles/${state.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (res.status === 409) {
        setHasConflict(true);
        setSaveError("This article was updated elsewhere. Reload to see the latest version.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.message || "Save failed.");
        return;
      }

      const saved = await res.json();
      setLastKnownUpdatedAt(saved.updated_at);
      setHasConflict(false);
      setLastSaved(new Date().toLocaleTimeString());
    } catch {
      setSaveError("Network error. Your changes are unsaved.");
    } finally {
      setIsSaving(false);
    }
  }, [state, lastKnownUpdatedAt]);

  const rawNotes = state.raw_notes;
  const confidence = state.confidence;
  const sources = state.sources;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {state.filename}
          </p>
          {state.generation_error && (
            <div className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              Generation issue: {state.generation_error}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-400">Saved at {lastSaved}</span>
          )}
          {saveError && (
            <span className="text-xs text-red-500">{saveError}</span>
          )}
          {hasConflict && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 active:scale-[0.98] transition-all"
            >
              Reload
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty || hasConflict}
            className={`
              rounded-xl px-5 py-2.5 text-sm font-semibold transition-all
              ${isDirty && !hasConflict
                ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]"
                : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-600"
              }
            `}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Title */}
      <FieldEditor
        label="Title"
        value={state.title}
        confidence={confidence?.title}
        sourceQuote={sources?.title}
        rawNotes={rawNotes}
        onChange={(v) => dispatch({ type: "SET_FIELD", field: "title", value: v })}
      />

      {/* Hook */}
      <FieldEditor
        label="Hook / Intro"
        value={state.hook}
        confidence={confidence?.hook}
        sourceQuote={sources?.hook}
        rawNotes={rawNotes}
        onChange={(v) => dispatch({ type: "SET_FIELD", field: "hook", value: v })}
        multiline
      />

      {/* Body Sections */}
      <SectionEditor
        sections={state.body_sections}
        onChange={(sections) => dispatch({ type: "SET_SECTIONS", sections })}
      />

      {/* Best For / Not For */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListEditor
          label="Best For"
          items={state.best_for}
          confidence={confidence?.best_for}
          sourceQuote={sources?.best_for}
          rawNotes={rawNotes}
          onChange={(items) => dispatch({ type: "SET_BEST_FOR", items })}
        />
        <ListEditor
          label="Not For"
          items={state.not_for}
          confidence={confidence?.not_for}
          sourceQuote={sources?.not_for}
          rawNotes={rawNotes}
          onChange={(items) => dispatch({ type: "SET_NOT_FOR", items })}
        />
      </div>

      {/* Ethics Notes */}
      <FieldEditor
        label="Ethics & Safety Notes"
        value={state.ethics_notes}
        confidence={confidence?.ethics_notes}
        sourceQuote={sources?.ethics_notes}
        rawNotes={rawNotes}
        onChange={(v) => dispatch({ type: "SET_FIELD", field: "ethics_notes", value: v })}
        multiline
      />

      {/* Key Facts */}
      <KeyFactsEditor
        facts={state.key_facts}
        onChange={(facts) => dispatch({ type: "SET_KEY_FACTS", facts })}
      />

      {/* Raw Notes */}
      <RawNotesPanel rawNotes={rawNotes} />
    </div>
  );
}
