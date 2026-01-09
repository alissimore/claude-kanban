import { useState, useCallback, useEffect } from 'react'
import { ClaudeInstance } from '../types'

const STORAGE_KEY = 'claude-kanban-inactive'

interface InactiveStorage {
  version: 1
  inactiveIds: string[]
  lastUpdated: string
}

function loadInactiveIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored) as InactiveStorage
      return new Set(data.inactiveIds)
    }
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

function saveInactiveIds(ids: Set<string>) {
  try {
    const data: InactiveStorage = {
      version: 1,
      inactiveIds: Array.from(ids),
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

export function useInactiveState(instances: ClaudeInstance[]) {
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => loadInactiveIds())

  // Clean up orphaned IDs when instances change
  useEffect(() => {
    const currentInstanceIds = new Set(instances.map(i => i.id))
    const orphanedIds = [...inactiveIds].filter(id => !currentInstanceIds.has(id))

    if (orphanedIds.length > 0) {
      const cleaned = new Set([...inactiveIds].filter(id => currentInstanceIds.has(id)))
      setInactiveIds(cleaned)
      saveInactiveIds(cleaned)
    }
  }, [instances, inactiveIds])

  const addInactive = useCallback((id: string) => {
    setInactiveIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveInactiveIds(next)
      return next
    })
  }, [])

  const removeInactive = useCallback((id: string) => {
    setInactiveIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      saveInactiveIds(next)
      return next
    })
  }, [])

  return {
    inactiveIds,
    addInactive,
    removeInactive,
  }
}
