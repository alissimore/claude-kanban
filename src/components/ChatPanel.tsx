import { useState, useEffect, useRef } from 'react'
import { ClaudeInstance, Conversation } from '../types'
import ChatMessage from './ChatMessage'
import ConfirmDialog from './ConfirmDialog'

interface ChatPanelProps {
  instance: ClaudeInstance
  onClose: () => void
}

export default function ChatPanel({ instance, onClose }: ChatPanelProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showKillConfirm, setShowKillConfirm] = useState(false)
  const [killing, setKilling] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract session ID from instance
  const sessionId = instance.conversationFile?.split('/').pop()?.replace('.jsonl', '') || instance.id

  useEffect(() => {
    async function fetchConversation() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`http://localhost:3001/api/instances/${sessionId}/conversation`)
        const data = await response.json()

        if (data.success && data.data) {
          setConversation(data.data)
        } else {
          setError(data.error || 'Failed to load conversation')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch conversation')
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchConversation, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && conversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation?.messages])

  const stateColors: Record<string, string> = {
    attention: 'bg-orange-500',
    working: 'bg-blue-500',
    blocked: 'bg-red-500',
    done: 'bg-green-500',
  }

  const handleKill = async () => {
    setKilling(true)
    try {
      const response = await fetch(`http://localhost:3001/api/instances/${instance.pid}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })
      const data = await response.json()
      if (data.success) {
        onClose()
      } else {
        setError(data.error || 'Failed to terminate instance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate instance')
    } finally {
      setKilling(false)
      setShowKillConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-gray-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stateColors[instance.state]}`} />
              <div>
                <h2 className="font-semibold text-gray-900">{instance.name}</h2>
                <p className="text-sm text-gray-500 truncate max-w-md">{instance.cwd}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Git info */}
          {instance.gitBranch && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-600">{instance.gitBranch}</span>
              {instance.gitDirty && (
                <span className="text-orange-500 text-xs font-medium">(uncommitted changes)</span>
              )}
            </div>
          )}

          {/* Todo progress */}
          {instance.todos.total > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Tasks</span>
                <span className="font-medium text-gray-900">
                  {instance.todos.completed}/{instance.todos.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(instance.todos.completed / instance.todos.total) * 100}%` }}
                />
              </div>
              {instance.todos.inProgress && (
                <p className="mt-1 text-xs text-blue-600 truncate">
                  Working: {instance.todos.inProgress}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !conversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 font-medium">Error loading conversation</p>
                <p className="text-gray-500 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : conversation?.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500">No messages yet</p>
              </div>
            </div>
          ) : (
            <>
              {conversation?.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>PID: {instance.pid}</span>
              <span>Session: {sessionId.slice(0, 8)}...</span>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                <span>{loading ? 'Syncing...' : 'Live'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowKillConfirm(true)}
              disabled={killing}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Terminate
            </button>
          </div>
        </div>
      </div>

      {/* Kill Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showKillConfirm}
        title="Terminate Instance"
        message={`Are you sure you want to terminate the Claude instance in "${instance.name}"? Any unsaved work will be lost.`}
        confirmLabel={killing ? 'Terminating...' : 'Terminate'}
        variant="danger"
        onConfirm={handleKill}
        onCancel={() => setShowKillConfirm(false)}
      />
    </div>
  )
}
