import { memo } from 'react'
import { ClaudeInstance } from '../types'

interface InstanceCardProps {
  instance: ClaudeInstance
  isSelected?: boolean
  onClick?: () => void
}

// Memoize to prevent re-renders during polling that can interrupt click events

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const stateStyles = {
  attention: 'border-l-4 border-l-status-attention',
  working: 'border-l-4 border-l-status-working',
  blocked: 'border-l-4 border-l-status-blocked',
  done: 'border-l-4 border-l-status-done',
}

const InstanceCard = memo(function InstanceCard({ instance, isSelected, onClick }: InstanceCardProps) {
  const todoProgress = instance.todos.total > 0
    ? Math.round((instance.todos.completed / instance.todos.total) * 100)
    : null

  const needsAttention = instance.state === 'attention'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  return (
    <div
      className={`bg-card-bg border rounded-lg p-4 cursor-pointer transition-all select-none ${stateStyles[instance.state]} ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
          : 'border-border hover:border-gray-300 hover:shadow-sm'
      } ${needsAttention ? 'animate-attention-pulse' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{instance.name}</h3>
          <div className="text-xs text-text-muted truncate" title={instance.cwd}>
            {instance.cwd.replace(/^\/Users\/[^/]+\//, '~/')}
          </div>
        </div>
        <div className="text-xs text-text-muted ml-2 flex-shrink-0">
          {formatTimeAgo(instance.lastMessage.timestamp)}
        </div>
      </div>

      {/* Git info */}
      {instance.gitBranch && (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
            <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
          </svg>
          <span className="truncate">{instance.gitBranch}</span>
          {instance.gitDirty && (
            <span className="text-status-blocked flex-shrink-0" title="Uncommitted changes">
              *
            </span>
          )}
        </div>
      )}

      {/* Current in-progress task */}
      {instance.todos.inProgress && (
        <div className="text-xs text-status-working flex items-center gap-1.5 mb-2 bg-blue-50 rounded px-2 py-1">
          <span className="animate-pulse">●</span>
          <span className="truncate">{instance.todos.inProgress}</span>
        </div>
      )}

      {/* Last message preview */}
      <div className="text-sm text-text-secondary mb-3 line-clamp-2">
        {instance.lastMessage.type === 'user' && (
          <span className="text-blue-600 font-medium">You: </span>
        )}
        {instance.lastMessage.content || (
          <span className="text-text-muted italic">No content</span>
        )}
      </div>

      {/* Todo progress */}
      {todoProgress !== null && instance.todos.total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Tasks</span>
            <span>{instance.todos.completed}/{instance.todos.total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-status-done rounded-full transition-all duration-300"
              style={{ width: `${todoProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* State badge for attention/blocked */}
      {(instance.state === 'attention' || instance.state === 'blocked') && (
        <div className="mt-3 pt-2 border-t border-border">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              instance.state === 'attention'
                ? 'bg-red-50 text-status-attention'
                : 'bg-amber-50 text-status-blocked'
            }`}
          >
            {instance.state === 'attention' ? 'Waiting for input' : 'Blocked'}
          </span>
        </div>
      )}
    </div>
  )
})

export default InstanceCard
