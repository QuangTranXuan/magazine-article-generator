"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
      >
        Try again
      </button>
    </div>
  );
}
