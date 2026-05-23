"use client";

import Link from "next/link";

export default function ArticleErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
        Could not load article
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {error.message || "This article may have been deleted or the link is invalid."}
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Try again
        </button>
        <Link
          href="/articles"
          className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          All Articles
        </Link>
      </div>
    </div>
  );
}
