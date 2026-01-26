'use client'

import { useState } from 'react'
import { useDiagramStore } from '@/stores/diagramStore'
import type { DiagramType, DiagramVisibility } from '@/types/diagram'

interface DiagramToolbarProps {
  title: string
  description: string
  diagramType: DiagramType
  visibility: DiagramVisibility
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onTypeChange: (type: DiagramType) => void
  onVisibilityChange: (visibility: DiagramVisibility) => void
  onSave: () => void
  onExport: () => void
  isSaving?: boolean
  isNew?: boolean
}

export default function DiagramToolbar({
  title,
  description,
  diagramType,
  visibility,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onVisibilityChange,
  onSave,
  onExport,
  isSaving = false,
  isNew = false,
}: DiagramToolbarProps) {
  const { isDirty } = useDiagramStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Title input */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Diagram"
            className="text-lg font-semibold w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-sm text-gray-500 mr-2">Unsaved changes</span>
          )}

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-colors ${
              showSettings
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Export button */}
          <button
            onClick={onExport}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export
          </button>

          {/* Save button */}
          <button
            onClick={onSave}
            disabled={isSaving || (!isDirty && !isNew)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Diagram Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagram Type
            </label>
            <select
              value={diagramType}
              onChange={(e) => onTypeChange(e.target.value as DiagramType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="FLOWCHART">Flowchart</option>
              <option value="DECISION_TREE">Decision Tree</option>
              <option value="CONCEPT_MAP">Concept Map</option>
              <option value="LESSON_FLOW">Lesson Flow</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => onVisibilityChange(e.target.value as DiagramVisibility)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PRIVATE">Private (Only me)</option>
              <option value="CLASS">Class (Class members)</option>
              <option value="SCHOOL">School (All school users)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
