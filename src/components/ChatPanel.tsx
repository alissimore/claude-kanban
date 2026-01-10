import { useState, useEffect, useRef, KeyboardEvent, memo, useCallback, useMemo } from 'react'
import { ClaudeInstance, Conversation } from '../types'
import ChatMessage from './ChatMessage'
import ConfirmDialog from './ConfirmDialog'

// Memoized message input component to prevent re-renders during polling
interface MessageInputProps {
  pid: number
  onError: (error: string) => void
  onFocusTerminal: () => void
}

const MessageInput = memo(function MessageInput({ pid, onError, onFocusTerminal }: MessageInputProps) {
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return

    setSending(true)

    try {
      const response = await fetch(`http://localhost:3001/api/instances/${pid}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageInput.trim() }),
      })
      const data = await response.json()

      if (data.success) {
        setMessageInput('')
        inputRef.current?.focus()
      } else {
        onError(data.error || 'Failed to send message')
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to Claude... (Enter to send)"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={sending}
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || sending}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
        >
          {sending ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          Send
        </button>
        <button
          onClick={onFocusTerminal}
          className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs font-medium flex items-center gap-1"
          title="Open in Terminal"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Terminal
        </button>
      </div>
    </div>
  )
})

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
  const [sendError, setSendError] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef<number>(0)
  const isNearBottomRef = useRef<boolean>(true)

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

    // Poll for updates every 3 seconds (reduced from 2s for better performance)
    const interval = setInterval(fetchConversation, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Track scroll position to know if user is near bottom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Consider "near bottom" if within 100px of the bottom
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100
      isNearBottomRef.current = nearBottom
      setShowScrollButton(!nearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto-scroll to bottom only when NEW messages arrive AND user is near bottom
  useEffect(() => {
    const messageCount = conversation?.messages?.length ?? 0
    const hasNewMessages = messageCount > prevMessageCountRef.current
    prevMessageCountRef.current = messageCount

    if (hasNewMessages && isNearBottomRef.current && messagesEndRef.current) {
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

  const handleFocusTerminal = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/instances/${instance.pid}/focus`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!data.success) {
        setSendError(data.error || 'Failed to focus terminal')
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to focus terminal')
    }
  }, [instance.pid])

  const handleSendError = useCallback((error: string) => {
    setSendError(error)
  }, [])

  // Build a set of answered tool IDs and a map of toolId -> answer text
  const { answeredToolIds, toolAnswers } = useMemo(() => {
    const ids = new Set<string>()
    const answers: Record<string, string> = {}

    if (!conversation?.messages) return { answeredToolIds: ids, toolAnswers: answers }

    for (const message of conversation.messages) {
      if (message.type === 'user') {
        for (const content of message.content) {
          if (content.type === 'tool_result' && content.toolId) {
            ids.add(content.toolId)
            // Extract the answer from the tool result text
            // Format: 'User has answered your questions: "Question?"="Answer". ...'
            const text = content.text || ''
            const match = text.match(/="([^"]+)"/)
            if (match) {
              answers[content.toolId] = match[1]
            }
          }
        }
      }
    }

    return { answeredToolIds: ids, toolAnswers: answers }
  }, [conversation?.messages])

  const getAnswerForToolId = useCallback((toolId: string) => {
    return toolAnswers[toolId]
  }, [toolAnswers])

  // Handle answering questions by sending the answer to Claude
  const handleAnswerQuestion = useCallback(async (answer: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/instances/${instance.pid}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: answer }),
      })
      const data = await response.json()
      if (!data.success) {
        setSendError(data.error || 'Failed to send answer')
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send answer')
    }
  }, [instance.pid])

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
                <ChatMessage
                  key={message.id}
                  message={message}
                  onAnswerQuestion={handleAnswerQuestion}
                  answeredToolIds={answeredToolIds}
                  getAnswerForToolId={getAnswerForToolId}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-8 p-2 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-all"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
          {/* Error message */}
          {sendError && (
            <div className="mb-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{sendError}</span>
              <button onClick={() => setSendError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input area - memoized to prevent re-renders during polling */}
          <MessageInput
            pid={instance.pid}
            onError={handleSendError}
            onFocusTerminal={handleFocusTerminal}
          />

          {/* Footer metadata */}
          <div className="mt-2 flex items-center justify-between">
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
