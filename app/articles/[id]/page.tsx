"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ArticleEditor from "@/components/article/ArticleEditor";
import type { Article } from "@/lib/schema";

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          setError(data.message || "Failed to load article.");
          return;
        }
        const data = await r.json();
        setArticle(data);
      })
      .catch(() => setError("Network error loading article."))
      .finally(() => setLoading(false));
  }, [id]);

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
          Article not found
        </h1>
        <p className="mb-6 text-gray-500">{error}</p>
        <Link
          href="/articles"
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Back to Articles
        </Link>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="py-8">
      <div className="mx-auto mb-6 max-w-4xl">
        <Link
          href="/articles"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; All Articles
        </Link>
      </div>
      <ArticleEditor article={article} />
    </div>
  );
}
