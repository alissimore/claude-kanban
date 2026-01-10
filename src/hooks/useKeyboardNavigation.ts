import { useEffect, useCallback, useState } from 'react'
import { ClaudeInstance, ColumnId } from '../types'

interface KeyboardNavigationOptions {
  instances: ClaudeInstance[]
  inactiveInstances: ClaudeInstance[]
  selectedInstance: ClaudeInstance | null
  onSelectInstance: (instance: ClaudeInstance) => void
  onClosePanel: () => void
  isInputFocused?: boolean
}

// Column order for navigation
const COLUMN_ORDER: ColumnId[] = ['inactive', 'attention', 'working', 'blocked', 'done']

export function useKeyboardNavigation({
  instances,
  inactiveInstances,
  selectedInstance,
  onSelectInstance,
  onClosePanel,
  isInputFocused = false,
}: KeyboardNavigationOptions) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  // Get all instances organized by column
  const getInstancesByColumn = useCallback((): Map<ColumnId, ClaudeInstance[]> => {
    const map = new Map<ColumnId, ClaudeInstance[]>()

    map.set('inactive', inactiveInstances)
    map.set('attention', instances.filter(i => i.state === 'attention'))
    map.set('working', instances.filter(i => i.state === 'working'))
    map.set('blocked', instances.filter(i => i.state === 'blocked'))
    map.set('done', instances.filter(i => i.state === 'done'))

    return map
  }, [instances, inactiveInstances])

  // Find which column and index an instance is in
  const findInstancePosition = useCallback((id: string): { column: ColumnId; index: number } | null => {
    const byColumn = getInstancesByColumn()

    for (const column of COLUMN_ORDER) {
      const columnInstances = byColumn.get(column) || []
      const index = columnInstances.findIndex(i => i.id === id)
      if (index !== -1) {
        return { column, index }
      }
    }
    return null
  }, [getInstancesByColumn])

  // Get first instance in a column
  const getFirstInColumn = useCallback((column: ColumnId): ClaudeInstance | null => {
    const byColumn = getInstancesByColumn()
    const columnInstances = byColumn.get(column) || []
    return columnInstances[0] || null
  }, [getInstancesByColumn])

  // Navigate to next/previous column
  const navigateColumn = useCallback((direction: 'left' | 'right') => {
    const byColumn = getInstancesByColumn()
    let currentColumn: ColumnId = 'attention'
    let currentIndex = 0

    if (focusedId) {
      const pos = findInstancePosition(focusedId)
      if (pos) {
        currentColumn = pos.column
        currentIndex = pos.index
      }
    }

    const currentColIndex = COLUMN_ORDER.indexOf(currentColumn)
    let newColIndex = direction === 'right'
      ? currentColIndex + 1
      : currentColIndex - 1

    // Wrap around
    if (newColIndex < 0) newColIndex = COLUMN_ORDER.length - 1
    if (newColIndex >= COLUMN_ORDER.length) newColIndex = 0

    // Find a column with instances
    for (let i = 0; i < COLUMN_ORDER.length; i++) {
      const checkIndex = (newColIndex + (direction === 'right' ? i : -i) + COLUMN_ORDER.length) % COLUMN_ORDER.length
      const checkColumn = COLUMN_ORDER[checkIndex]
      const columnInstances = byColumn.get(checkColumn) || []

      if (columnInstances.length > 0) {
        // Try to maintain vertical position, or go to first/last
        const targetIndex = Math.min(currentIndex, columnInstances.length - 1)
        setFocusedId(columnInstances[targetIndex].id)
        return
      }
    }
  }, [focusedId, findInstancePosition, getInstancesByColumn])

  // Navigate up/down within column
  const navigateVertical = useCallback((direction: 'up' | 'down') => {
    const byColumn = getInstancesByColumn()

    if (!focusedId) {
      // No focus - focus first attention or first available
      for (const column of COLUMN_ORDER) {
        const columnInstances = byColumn.get(column) || []
        if (columnInstances.length > 0) {
          setFocusedId(columnInstances[0].id)
          return
        }
      }
      return
    }

    const pos = findInstancePosition(focusedId)
    if (!pos) return

    const columnInstances = byColumn.get(pos.column) || []
    let newIndex = direction === 'down' ? pos.index + 1 : pos.index - 1

    // Wrap within column
    if (newIndex < 0) newIndex = columnInstances.length - 1
    if (newIndex >= columnInstances.length) newIndex = 0

    if (columnInstances[newIndex]) {
      setFocusedId(columnInstances[newIndex].id)
    }
  }, [focusedId, findInstancePosition, getInstancesByColumn])

  // Jump to column by number
  const jumpToColumn = useCallback((columnIndex: number) => {
    const column = COLUMN_ORDER[columnIndex]
    if (!column) return

    const instance = getFirstInColumn(column)
    if (instance) {
      setFocusedId(instance.id)
    }
  }, [getFirstInColumn])

  // Select the focused instance (open chat panel)
  const selectFocused = useCallback(() => {
    if (!focusedId) return

    const allInstances = [...instances, ...inactiveInstances]
    const instance = allInstances.find(i => i.id === focusedId)
    if (instance) {
      onSelectInstance(instance)
    }
  }, [focusedId, instances, inactiveInstances, onSelectInstance])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if input is focused (except Escape)
      if (isInputFocused && e.key !== 'Escape') return

      // Don't handle if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key !== 'Escape') return
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'h': // vim-style
          e.preventDefault()
          navigateColumn('left')
          break

        case 'ArrowRight':
        case 'l': // vim-style
          e.preventDefault()
          navigateColumn('right')
          break

        case 'ArrowUp':
        case 'k': // vim-style
          e.preventDefault()
          navigateVertical('up')
          break

        case 'ArrowDown':
        case 'j': // vim-style
          e.preventDefault()
          navigateVertical('down')
          break

        case 'Enter':
          if (focusedId) {
            e.preventDefault()
            selectFocused()
          }
          break

        case 'Escape':
          e.preventDefault()
          if (selectedInstance) {
            onClosePanel()
          } else if (showHelp) {
            setShowHelp(false)
          } else {
            setFocusedId(null)
          }
          break

        case '?':
          e.preventDefault()
          setShowHelp(prev => !prev)
          break

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault()
          jumpToColumn(parseInt(e.key) - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isInputFocused,
    focusedId,
    selectedInstance,
    showHelp,
    navigateColumn,
    navigateVertical,
    selectFocused,
    jumpToColumn,
    onClosePanel,
  ])

  // Sync focused with selected
  useEffect(() => {
    if (selectedInstance && !focusedId) {
      setFocusedId(selectedInstance.id)
    }
  }, [selectedInstance, focusedId])

  return {
    focusedId,
    setFocusedId,
    showHelp,
    setShowHelp,
  }
}
