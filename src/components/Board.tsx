import { ClaudeInstance, InstanceState } from '../types'
import Column from './Column'

interface BoardProps {
  instances: ClaudeInstance[]
  selectedId?: string
  onSelectInstance: (instance: ClaudeInstance) => void
}

const COLUMNS: { state: InstanceState; title: string; color: string }[] = [
  { state: 'attention', title: 'Needs Me Now', color: 'bg-status-attention' },
  { state: 'working', title: 'Working Autonomously', color: 'bg-status-working' },
  { state: 'blocked', title: 'Blocked / Error', color: 'bg-status-blocked' },
  { state: 'done', title: 'Done', color: 'bg-status-done' },
]

export default function Board({ instances, selectedId, onSelectInstance }: BoardProps) {
  const groupedInstances = COLUMNS.map(col => ({
    ...col,
    instances: instances.filter(i => i.state === col.state),
  }))

  if (instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-text-secondary mb-2">No Claude instances detected</div>
          <div className="text-text-muted text-sm">
            Start a Claude Code session to see it here
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groupedInstances.map(col => (
        <Column
          key={col.state}
          title={col.title}
          color={col.color}
          instances={col.instances}
          selectedId={selectedId}
          onSelectInstance={onSelectInstance}
        />
      ))}
    </div>
  )
}
