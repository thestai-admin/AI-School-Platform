'use client'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-red-800">
          Something went wrong
        </h2>
        <p className="mt-2 text-red-600">
          {error.message || 'An error occurred while loading this page.'}
        </p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
