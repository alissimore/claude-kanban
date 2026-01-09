import { memo, useCallback } from 'react'
import { ClaudeInstance } from '../types'
import InstanceCard from './InstanceCard'

interface ColumnProps {
  title: string
  color: string
  instances: ClaudeInstance[]
  selectedId?: string
  onSelectInstance: (instance: ClaudeInstance) => void
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

export default function Column({ title, color, instances, selectedId, onSelectInstance }: ColumnProps) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h2 className="font-medium text-text-primary">{title}</h2>
        <span className="text-text-muted text-sm">({instances.length})</span>
      </div>
      <div className="space-y-3">
        {instances.map(instance => (
          <CardWrapper
            key={instance.id}
            instance={instance}
            isSelected={instance.id === selectedId}
            onSelect={onSelectInstance}
          />
        ))}
      </div>
    </div>
  )
}
