"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ArticleSummary {
  id: string;
  title: string | null;
  filename: string;
  status: string;
  generation_error: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  generating: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/articles")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.message || `Server error (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load articles.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          Failed to load articles
        </h1>
        <p className="mb-6 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Articles
        </h1>
        <Link
          href="/"
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
          <p className="mb-2 text-lg font-medium text-gray-600 dark:text-gray-400">
            No articles yet
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Upload your first .docx to generate a structured article.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Upload Notes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {article.title || article.filename}
                  </h2>
                  {article.title && (
                    <p className="mt-0.5 text-xs text-gray-500">{article.filename}</p>
                  )}
                  {article.generation_error && (
                    <p className="mt-1 text-xs text-red-500">{article.generation_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[article.status] ?? STATUS_STYLES.draft}`}
                  >
                    {article.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(article.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
