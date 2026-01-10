import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { ClaudeInstance, ColumnId } from '../types'
import Column from './Column'
import InstanceCard from './InstanceCard'

interface BoardProps {
  instances: ClaudeInstance[]
  inactiveInstances: ClaudeInstance[]
  selectedId?: string
  focusedId?: string | null
  onSelectInstance: (instance: ClaudeInstance) => void
  onMoveToInactive: (id: string) => void
  onReactivate: (id: string) => void
}

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: 'inactive', title: 'Inactive', color: 'bg-status-inactive' },
  { id: 'attention', title: 'Needs Me Now', color: 'bg-status-attention' },
  { id: 'working', title: 'Working Autonomously', color: 'bg-status-working' },
  { id: 'blocked', title: 'Blocked / Error', color: 'bg-status-blocked' },
  { id: 'done', title: 'Done', color: 'bg-status-done' },
]

export default function Board({
  instances,
  inactiveInstances,
  selectedId,
  focusedId,
  onSelectInstance,
  onMoveToInactive,
  onReactivate,
}: BoardProps) {
  // Require 10px movement AND 150ms delay before drag starts, allowing clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const [sourceColumn, setSourceColumn] = useState<ColumnId | null>(null)

  const allInstances = [...instances, ...inactiveInstances]
  const draggedInstance = activeId
    ? allInstances.find(i => i.id === activeId)
    : null

  const groupedInstances = COLUMNS.map(col => ({
    ...col,
    instances:
      col.id === 'inactive'
        ? inactiveInstances
        : instances.filter(i => i.state === col.id),
  }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)
    // Determine source column
    if (inactiveInstances.some(i => i.id === id)) {
      setSourceColumn('inactive')
    } else {
      const instance = instances.find(i => i.id === id)
      if (instance) {
        setSourceColumn(instance.state)
      }
    }
  }, [instances, inactiveInstances])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setSourceColumn(null)

      if (!over) return

      const instanceId = active.id as string
      const targetColumn = over.id as ColumnId

      // Check if instance is currently inactive
      const isInactive = inactiveInstances.some(i => i.id === instanceId)

      if (isInactive) {
        // From inactive: only allow dropping on 'attention' to reactivate
        if (targetColumn === 'attention') {
          onReactivate(instanceId)
        }
      } else {
        // From active: only allow dropping on 'inactive'
        if (targetColumn === 'inactive') {
          onMoveToInactive(instanceId)
        }
      }
    },
    [inactiveInstances, onMoveToInactive, onReactivate]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setSourceColumn(null)
  }, [])

  // Determine which columns can accept drops
  const getDropDisabled = useCallback(
    (columnId: ColumnId): boolean => {
      if (!sourceColumn) return true
      if (sourceColumn === 'inactive') {
        // From inactive, only 'attention' is a valid target
        return columnId !== 'attention'
      } else {
        // From active columns, only 'inactive' is a valid target
        return columnId !== 'inactive'
      }
    },
    [sourceColumn]
  )

  if (allInstances.length === 0) {
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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groupedInstances.map(col => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            instances={col.instances}
            selectedId={selectedId}
            focusedId={focusedId}
            onSelectInstance={onSelectInstance}
            isDragging={activeId !== null}
            isDropDisabled={getDropDisabled(col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {draggedInstance && (
          <InstanceCard
            instance={draggedInstance}
            isSelected={false}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
