import { useState, useEffect } from 'react'

interface SpawnDialogProps {
  isOpen: boolean
  onClose: () => void
  onSpawn: () => void
}

export default function SpawnDialog({ isOpen, onClose, onSpawn }: SpawnDialogProps) {
  const [cwd, setCwd] = useState('')
  const [prompt, setPrompt] = useState('')
  const [skipPermissions, setSkipPermissions] = useState(false)
  const [recentDirs, setRecentDirs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Fetch recent directories when dialog opens
      fetch('http://localhost:3001/api/recent-directories')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRecentDirs(data.data)
          }
        })
        .catch(() => {
          // Ignore errors for recent dirs
        })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cwd,
          prompt: prompt || undefined,
          dangerouslySkipPermissions: skipPermissions,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCwd('')
        setPrompt('')
        setSkipPermissions(false)
        onSpawn()
        onClose()
      } else {
        setError(data.error || 'Failed to spawn instance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn instance')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Claude Instance</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Working Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {recentDirs.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Recent directories:</p>
                <div className="flex flex-wrap gap-1">
                  {recentDirs.slice(0, 5).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setCwd(dir)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 truncate max-w-[200px]"
                      title={dir}
                    >
                      {dir.split('/').pop()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Initial Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Prompt (optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should Claude work on?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Skip Permissions */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skipPermissions"
              checked={skipPermissions}
              onChange={(e) => setSkipPermissions(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="skipPermissions" className="text-sm text-gray-700">
              Skip permission prompts
            </label>
            <span className="text-xs text-orange-500">(use with caution)</span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !cwd}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Spawning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Spawn Instance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
