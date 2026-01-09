import { useEffect, useRef, useCallback, useState } from 'react'
import { ClaudeInstance } from '../types'

interface NotificationSettings {
  browserEnabled: boolean
  audioEnabled: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  browserEnabled: true,
  audioEnabled: true,
}

const STORAGE_KEY = 'claude-kanban-notifications'

// Load settings from localStorage
function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

// Save settings to localStorage
function saveSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export function useNotifications(instances: ClaudeInstance[]) {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const prevAttentionIdsRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    audioRef.current = null // We'll use Web Audio API instead
  }, [])

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  // Update document title based on attention count
  const attentionCount = instances.filter(i => i.state === 'attention').length

  useEffect(() => {
    const baseTitle = 'Claude Kanban'
    if (attentionCount > 0) {
      document.title = `(${attentionCount}) ${baseTitle}`
    } else {
      document.title = baseTitle
    }
  }, [attentionCount])

  // Play notification sound
  const playSound = useCallback(() => {
    if (!settings.audioEnabled) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.1

      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch {
      // Audio not supported
    }
  }, [settings.audioEnabled])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false

    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)
      return permission === 'granted'
    } catch {
      return false
    }
  }, [])

  // Show browser notification
  const showNotification = useCallback((instance: ClaudeInstance) => {
    if (!settings.browserEnabled) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const notification = new Notification(`Claude needs attention`, {
      body: `${instance.name}: ${instance.lastMessage.content?.slice(0, 100) || 'Waiting for input'}`,
      icon: '/favicon.ico',
      tag: instance.id, // Prevent duplicate notifications for same instance
      requireInteraction: false,
    })

    notification.onclick = () => {
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }, [settings.browserEnabled])

  // Track attention state changes and notify
  useEffect(() => {
    const currentAttentionIds = new Set(
      instances.filter(i => i.state === 'attention').map(i => i.id)
    )

    // Find newly added attention instances
    const newAttentionInstances = instances.filter(
      i => i.state === 'attention' && !prevAttentionIdsRef.current.has(i.id)
    )

    // Notify for each new attention instance
    if (newAttentionInstances.length > 0) {
      playSound()
      newAttentionInstances.forEach(instance => {
        showNotification(instance)
      })
    }

    prevAttentionIdsRef.current = currentAttentionIds
  }, [instances, playSound, showNotification])

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      saveSettings(updated)
      return updated
    })
  }, [])

  return {
    settings,
    updateSettings,
    permissionStatus,
    requestPermission,
    attentionCount,
  }
}
