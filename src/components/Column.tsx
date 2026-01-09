import { memo, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ClaudeInstance, ColumnId } from '../types'
import InstanceCard from './InstanceCard'

interface ColumnProps {
  id: ColumnId
  title: string
  color: string
  instances: ClaudeInstance[]
  selectedId?: string
  onSelectInstance: (instance: ClaudeInstance) => void
  isDragging?: boolean
  isDropDisabled?: boolean
}

// Wrapper component to provide stable onClick handler per instance
const CardWrapper = memo(function CardWrapper({
  instance,
  isSelected,
  onSelect,
}: {
  instance: ClaudeInstance
  isSelected: boolean
  onSelect: (instance: ClaudeInstance) => void
}) {
  const handleClick = useCallback(() => {
    onSelect(instance)
  }, [instance, onSelect])

  return (
    <InstanceCard
      instance={instance}
      isSelected={isSelected}
      onClick={handleClick}
    />
  )
})

export default function Column({
  id,
  title,
  color,
  instances,
  selectedId,
  onSelectInstance,
  isDragging,
  isDropDisabled,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isDropDisabled,
  })

  const isValidDropTarget = isDragging && !isDropDisabled
  const isHovering = isOver && isValidDropTarget

  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h2 className="font-medium text-text-primary">{title}</h2>
        <span className="text-text-muted text-sm">({instances.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[100px] rounded-lg p-2 -m-2 transition-colors ${
          isHovering
            ? 'bg-blue-50 ring-2 ring-blue-300'
            : isValidDropTarget
              ? 'bg-gray-50'
              : ''
        }`}
      >
        {instances.map(instance => (
          <CardWrapper
            key={instance.id}
            instance={instance}
            isSelected={instance.id === selectedId}
            onSelect={onSelectInstance}
          />
        ))}
        {instances.length === 0 && id === 'inactive' && (
          <div className="text-center py-8 text-text-muted text-sm">
            <div className="mb-1">Drag cards here to hide</div>
            <div className="text-xs">from monitoring</div>
          </div>
        )}
      </div>
    </div>
  )
}
