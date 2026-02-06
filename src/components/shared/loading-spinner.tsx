interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div
          className={`animate-spin ${sizeMap[size]} border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4`}
        />
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  )
}
