'use client'

interface StatCardProps {
  label: string
  value: string | number
  color?: string
  onClick?: () => void
  active?: boolean
}

export function StatCard({ label, value, color = 'blue', onClick, active }: StatCardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`rounded-lg border p-6 text-center transition-colors ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${active ? `ring-2 ring-${color}-500 border-${color}-200 bg-${color}-50` : 'border-gray-200'}`}
    >
      <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </Component>
  )
}

interface StatsGridProps {
  columns?: 3 | 4 | 5
  children: React.ReactNode
}

export function StatsGrid({ columns = 3, children }: StatsGridProps) {
  const colClass = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
  }[columns]

  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4 mb-8`}>
      {children}
    </div>
  )
}
