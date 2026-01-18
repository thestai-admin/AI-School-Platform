'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { SUPPORTED_LANGUAGES, type LanguageInfo } from '@/lib/bhashini/languages'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

interface LanguagePickerProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: BhashiniLanguageCode
  onChange: (language: BhashiniLanguageCode) => void
  languages?: LanguageInfo[]
  showNativeName?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const LanguagePicker = forwardRef<HTMLSelectElement, LanguagePickerProps>(
  (
    {
      value,
      onChange,
      languages = SUPPORTED_LANGUAGES,
      showNativeName = true,
      label,
      size = 'md',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value as BhashiniLanguageCode)}
          disabled={disabled}
          className={`
            block w-full rounded-md border border-gray-300 bg-white
            focus:border-blue-500 focus:ring-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${sizeStyles[size]}
          `}
          {...props}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {showNativeName
                ? `${lang.nativeName} (${lang.name})`
                : lang.name}
            </option>
          ))}
        </select>
      </div>
    )
  }
)

LanguagePicker.displayName = 'LanguagePicker'

// Compact pill-style language selector
interface LanguagePillsProps {
  value: BhashiniLanguageCode
  onChange: (language: BhashiniLanguageCode) => void
  languages?: LanguageInfo[]
  className?: string
}

function LanguagePills({
  value,
  onChange,
  languages = SUPPORTED_LANGUAGES,
  className = '',
}: LanguagePillsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${
              value === lang.code
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span className="mr-1">{lang.nativeName}</span>
          <span className="text-xs opacity-70">({lang.name})</span>
        </button>
      ))}
    </div>
  )
}

export { LanguagePicker, LanguagePills }
