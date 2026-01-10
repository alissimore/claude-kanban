interface KeyboardHelpProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['↑', 'k'], description: 'Move up' },
  { keys: ['↓', 'j'], description: 'Move down' },
  { keys: ['←', 'h'], description: 'Move left (previous column)' },
  { keys: ['→', 'l'], description: 'Move right (next column)' },
  { keys: ['Enter'], description: 'Open chat panel' },
  { keys: ['Esc'], description: 'Close panel / clear focus' },
  { keys: ['1-5'], description: 'Jump to column (1=Inactive, 2=Attention...)' },
  { keys: ['?'], description: 'Toggle this help' },
]

export default function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="px-6 py-4">
            <div className="space-y-3">
              {shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <span key={j} className="flex items-center">
                        {j > 0 && <span className="text-gray-400 text-xs mx-1">or</span>}
                        <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">?</kbd> anytime to toggle this help
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
