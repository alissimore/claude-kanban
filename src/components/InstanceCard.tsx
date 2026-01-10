import { memo, useRef, useEffect, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ClaudeInstance } from '../types'

interface InstanceCardProps {
  instance: ClaudeInstance
  isSelected?: boolean
  isFocused?: boolean
  onClick?: () => void
  isDragOverlay?: boolean
}

function formatElapsedTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 60) return `${diffSecs}s`

  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m`

  const diffHours = Math.floor(diffMins / 60)
  const remainingMins = diffMins % 60
  if (diffHours < 24) return `${diffHours}h ${remainingMins}m`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

// Map tool names to shorter display names
const toolDisplayNames: Record<string, string> = {
  Read: 'Read',
  Edit: 'Edit',
  Write: 'Write',
  Bash: 'Bash',
  Glob: 'Glob',
  Grep: 'Grep',
  Task: 'Task',
  TodoWrite: 'Todo',
  WebFetch: 'Web',
  WebSearch: 'Search',
  AskUserQuestion: 'Ask',
}

// Get display name for a tool, handling MCP tools
function getToolDisplayName(toolName: string): string {
  // Check direct mapping first
  if (toolDisplayNames[toolName]) {
    return toolDisplayNames[toolName]
  }

  // Handle MCP tools: mcp__server__tool_name -> tool_name (shortened)
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__')
    if (parts.length >= 3) {
      // Get the tool name part and shorten it
      const mcpToolName = parts.slice(2).join('_')
      // Take first meaningful word or abbreviate
      const shortName = mcpToolName
        .replace(/_/g, ' ')
        .split(' ')
        .slice(0, 2)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1, 4))
        .join('')
      return shortName || 'MCP'
    }
    return 'MCP'
  }

  // Fallback: truncate long names
  return toolName.length > 8 ? toolName.slice(0, 6) + '..' : toolName
}

const stateStyles = {
  attention: 'border-l-4 border-l-status-attention',
  working: 'border-l-4 border-l-status-working',
  blocked: 'border-l-4 border-l-status-blocked',
  done: 'border-l-4 border-l-status-done',
}

const InstanceCard = memo(function InstanceCard({
  instance,
  isSelected,
  isFocused,
  onClick,
  isDragOverlay,
}: InstanceCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: instance.id,
    disabled: isDragOverlay,
  })

  const cardRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  // Combine refs for dnd-kit and our card ref
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node)
    ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }, [setNodeRef])

  // Auto-scroll focused card into view
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isFocused])

  const todoProgress =
    instance.todos.total > 0
      ? Math.round((instance.todos.completed / instance.todos.total) * 100)
      : null

  const needsAttention = instance.state === 'attention'

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on drag handle
    if (dragHandleRef.current?.contains(e.target as Node)) {
      return
    }
    e.stopPropagation()
    e.preventDefault()
    onClick?.()
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`bg-card-bg border rounded-lg p-4 transition-all select-none relative cursor-pointer ${stateStyles[instance.state]} ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
          : isFocused
            ? 'border-purple-400 ring-2 ring-purple-100 shadow-sm'
            : 'border-border hover:border-gray-300 hover:shadow-sm'
      } ${needsAttention ? 'animate-attention-pulse' : ''} ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOverlay ? 'shadow-xl cursor-grabbing rotate-2' : ''}`}
      onMouseDown={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      {/* Drag handle - only this area is draggable */}
      {!isDragOverlay && (
        <div
          ref={dragHandleRef}
          {...listeners}
          {...attributes}
          className="absolute top-2 right-2 p-1.5 cursor-grab hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 touch-none"
          title="Drag to move"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 pr-8">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{instance.name}</h3>
          <div className="text-xs text-text-muted truncate" title={instance.cwd}>
            {instance.cwd.replace(/^\/Users\/[^/]+\//, '~/')}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
          {/* Elapsed time with clock icon */}
          {instance.stateStartedAt && (
            <div className="flex items-center gap-1 text-xs text-text-secondary" title="Time in current state">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatElapsedTime(instance.stateStartedAt)}</span>
            </div>
          )}
          {/* Current tool badge */}
          {instance.currentTool && instance.state === 'working' && (
            <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>{getToolDisplayName(instance.currentTool)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Git info */}
      {instance.gitBranch && (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
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

      {/* File changes - git style */}
      {instance.fileChanges && instance.fileChanges.length > 0 && (() => {
        const totalAdded = instance.fileChanges.reduce((sum, f) => sum + f.linesAdded, 0)
        const totalRemoved = instance.fileChanges.reduce((sum, f) => sum + f.linesRemoved, 0)
        const fileList = instance.fileChanges
          .slice(0, 5)
          .map(f => f.path.split('/').pop())
          .join(', ')
        const moreCount = instance.fileChanges.length > 5 ? instance.fileChanges.length - 5 : 0

        return (
          <div
            className="flex items-center gap-2 text-xs mb-2 cursor-default"
            title={`Files: ${fileList}${moreCount > 0 ? ` +${moreCount} more` : ''}`}
          >
            <span className="text-green-600 font-medium">+{totalAdded}</span>
            <span className="text-red-500 font-medium">-{totalRemoved}</span>
            <span className="text-text-muted">
              ({instance.fileChanges.length} file{instance.fileChanges.length !== 1 ? 's' : ''})
            </span>
          </div>
        )
      })()}

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
            <span>
              {instance.todos.completed}/{instance.todos.total}
            </span>
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
