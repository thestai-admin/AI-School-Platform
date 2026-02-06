const defaultColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  GRADED: 'bg-green-100 text-green-800',
  LATE: 'bg-orange-100 text-orange-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-gray-100 text-gray-800',
  PRIVATE: 'bg-gray-100 text-gray-700',
  CLASS: 'bg-blue-100 text-blue-700',
  SCHOOL: 'bg-purple-100 text-purple-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

interface StatusBadgeProps {
  status: string
  label?: string
  colorMap?: Record<string, string>
}

export function StatusBadge({ status, label, colorMap }: StatusBadgeProps) {
  const colors = colorMap || defaultColors
  const colorClass = colors[status] || 'bg-gray-100 text-gray-800'
  const displayLabel = label || status.replace(/_/g, ' ')

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {displayLabel}
    </span>
  )
}
