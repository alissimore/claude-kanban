import { ClaudeInstance } from '../types'
import InstanceCard from './InstanceCard'

interface ColumnProps {
  title: string
  color: string
  instances: ClaudeInstance[]
  selectedId?: string
  onSelectInstance: (instance: ClaudeInstance) => void
}

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
          <InstanceCard
            key={instance.id}
            instance={instance}
            isSelected={instance.id === selectedId}
            onClick={() => onSelectInstance(instance)}
          />
        ))}
      </div>
    </div>
  )
}
