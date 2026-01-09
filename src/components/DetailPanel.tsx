import { ClaudeInstance } from '../types'

interface DetailPanelProps {
  instance: ClaudeInstance
  onClose: () => void
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig = {
  attention: { label: 'Needs Attention', color: 'bg-status-attention', textColor: 'text-white' },
  working: { label: 'Working', color: 'bg-status-working', textColor: 'text-white' },
  blocked: { label: 'Blocked', color: 'bg-status-blocked', textColor: 'text-white' },
  done: { label: 'Done', color: 'bg-status-done', textColor: 'text-white' },
}

export default function DetailPanel({ instance, onClose }: DetailPanelProps) {
  const status = statusConfig[instance.state]

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${status.color} ${status.textColor}`}>
            {status.label}
          </span>
          <h2 className="font-semibold text-text-primary">{instance.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Path & Git */}
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Location</h3>
          <div className="text-sm text-text-primary font-mono bg-gray-50 rounded p-2 break-all">
            {instance.cwd}
          </div>
          {instance.gitBranch && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 16 16">
                <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
              </svg>
              <span className="text-text-primary">{instance.gitBranch}</span>
              {instance.gitDirty && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  uncommitted changes
                </span>
              )}
            </div>
          )}
        </div>

        {/* Todos */}
        {instance.todos.total > 0 && (
          <div>
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Tasks ({instance.todos.completed}/{instance.todos.total})
            </h3>
            <div className="space-y-2">
              {instance.todos.items.map((todo, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                    todo.status === 'completed'
                      ? 'bg-green-50'
                      : todo.status === 'in_progress'
                      ? 'bg-blue-50'
                      : 'bg-gray-50'
                  }`}
                >
                  {todo.status === 'completed' ? (
                    <svg className="w-4 h-4 text-status-done flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : todo.status === 'in_progress' ? (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <span className="w-2 h-2 bg-status-working rounded-full animate-pulse" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 border border-gray-300 rounded flex-shrink-0 mt-0.5" />
                  )}
                  <span className={todo.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'}>
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Message */}
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
            Last Message
            <span className="ml-2 font-normal normal-case">
              {formatTime(instance.lastMessage.timestamp)}
            </span>
          </h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">
              {instance.lastMessage.type === 'user' ? 'You' : 'Claude'}
            </div>
            <div className="text-sm text-text-primary whitespace-pre-wrap">
              {instance.lastMessage.content || <span className="text-text-muted italic">No content</span>}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-text-muted">PID</div>
            <div className="text-text-primary font-mono">{instance.pid}</div>
            <div className="text-text-muted">Session</div>
            <div className="text-text-primary font-mono text-xs truncate" title={instance.id}>
              {instance.id.slice(0, 8)}...
            </div>
            {instance.conversationFile && (
              <>
                <div className="text-text-muted">File</div>
                <div className="text-text-primary font-mono text-xs truncate" title={instance.conversationFile}>
                  {instance.conversationFile.slice(0, 12)}...
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-lg text-sm font-medium transition-colors"
          onClick={() => {
            // TODO: Open terminal to this session
            alert(`Open terminal at: ${instance.cwd}`)
          }}
        >
          Open in Terminal
        </button>
      </div>
    </div>
  )
}
