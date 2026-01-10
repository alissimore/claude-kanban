import { useState, useEffect, useRef, useCallback } from 'react'
import { AskUserQuestionInput } from '../types'

interface AskUserQuestionBlockProps {
  toolId: string
  toolInput: AskUserQuestionInput
  onAnswer: (answer: string) => void
  isAnswered: boolean
  answeredText?: string
}

export default function AskUserQuestionBlock({
  toolInput,
  onAnswer,
  isAnswered,
  answeredText,
}: AskUserQuestionBlockProps) {
  const questions = toolInput?.questions || []
  const [activeTab, setActiveTab] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, Set<number>>>({})
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<number, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const currentQuestion = questions[activeTab]
  const isMultiSelect = currentQuestion?.multiSelect || false

  // Handle keyboard shortcuts
  useEffect(() => {
    if (isAnswered) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this component or its children are focused
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) {
        return
      }

      const key = e.key

      // Number keys 1-9 for option selection
      if (key >= '1' && key <= '9') {
        const optionIndex = parseInt(key) - 1
        if (currentQuestion && optionIndex < currentQuestion.options.length) {
          e.preventDefault()
          handleOptionClick(optionIndex)
        }
      }

      // Tab navigation for multi-question
      if (key === 'Tab' && questions.length > 1) {
        e.preventDefault()
        if (e.shiftKey) {
          setActiveTab(prev => (prev - 1 + questions.length) % questions.length)
        } else {
          setActiveTab(prev => (prev + 1) % questions.length)
        }
      }

      // Escape to clear selection
      if (key === 'Escape') {
        setSelectedOptions(prev => ({ ...prev, [activeTab]: new Set() }))
        setShowCustomInput(prev => ({ ...prev, [activeTab]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAnswered, activeTab, questions, currentQuestion])

  const handleOptionClick = useCallback((optionIndex: number) => {
    if (isAnswered) return

    if (isMultiSelect) {
      // Toggle selection for multi-select
      setSelectedOptions(prev => {
        const current = prev[activeTab] || new Set()
        const newSet = new Set(current)
        if (newSet.has(optionIndex)) {
          newSet.delete(optionIndex)
        } else {
          newSet.add(optionIndex)
        }
        return { ...prev, [activeTab]: newSet }
      })
      setShowCustomInput(prev => ({ ...prev, [activeTab]: false }))
    } else {
      // Single select - send immediately
      const option = currentQuestion.options[optionIndex]
      onAnswer(option.label)
    }
  }, [isAnswered, isMultiSelect, activeTab, currentQuestion, onAnswer])

  const handleCustomInputToggle = () => {
    if (isAnswered) return
    setShowCustomInput(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))
    setSelectedOptions(prev => ({ ...prev, [activeTab]: new Set() }))
  }

  const handleCustomSubmit = () => {
    const text = customInputs[activeTab]?.trim()
    if (text) {
      onAnswer(text)
    }
  }

  const handleMultiSelectSubmit = () => {
    const selected = selectedOptions[activeTab]
    if (!selected || selected.size === 0) return

    const labels = Array.from(selected)
      .sort((a, b) => a - b)
      .map(idx => currentQuestion.options[idx].label)
    onAnswer(labels.join(', '))
  }

  if (!questions.length) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="my-3 border border-amber-200 rounded-lg overflow-hidden bg-amber-50"
      tabIndex={0}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-amber-100 border-b border-amber-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-amber-800 text-sm">Question</span>
        {isAnswered && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Answered
          </span>
        )}
      </div>

      {/* Tabs for multiple questions */}
      {questions.length > 1 && (
        <div className="flex border-b border-amber-200 bg-amber-50">
          {questions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === idx
                  ? 'bg-white border-b-2 border-amber-500 text-amber-800'
                  : 'text-amber-600 hover:bg-amber-100'
              }`}
            >
              {q.header || `Question ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Question content */}
      <div className="p-3">
        {/* Question text */}
        <p className="text-sm font-medium text-gray-800 mb-3">
          {currentQuestion?.question}
        </p>

        {/* Answered state - show what was selected */}
        {isAnswered && answeredText && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            <span className="font-medium">Selected:</span> {answeredText}
          </div>
        )}

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion?.options.map((option, idx) => {
            const isSelected = selectedOptions[activeTab]?.has(idx)
            const optionNumber = idx + 1

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isAnswered
                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                    : isSelected
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    isAnswered
                      ? 'bg-gray-200 text-gray-500'
                      : isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSelected ? '✓' : optionNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}

          {/* Custom input option */}
          {!isAnswered && (
            <div className="mt-3">
              <button
                onClick={handleCustomInputToggle}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  showCustomInput[activeTab]
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    ...
                  </span>
                  <span className="text-sm text-gray-600">Type something else</span>
                </div>
              </button>

              {showCustomInput[activeTab] && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customInputs[activeTab] || ''}
                    onChange={e => setCustomInputs(prev => ({ ...prev, [activeTab]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCustomSubmit()
                      }
                    }}
                    placeholder="Type your response..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customInputs[activeTab]?.trim()}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit button for multi-select */}
        {isMultiSelect && !isAnswered && (selectedOptions[activeTab]?.size || 0) > 0 && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleMultiSelectSubmit}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Submit ({selectedOptions[activeTab]?.size} selected)
            </button>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        {!isAnswered && (
          <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
            <span>Press 1-{currentQuestion?.options.length || 0} to select</span>
            {questions.length > 1 && (
              <>
                <span>•</span>
                <span>Tab to switch questions</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
