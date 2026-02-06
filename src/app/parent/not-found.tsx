import Link from 'next/link'

export default function ParentNotFound() {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="mt-2 text-gray-600">
          This page does not exist.
        </p>
        <Link
          href="/parent"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
