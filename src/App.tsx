import { useEffect, useState, useCallback } from 'react'
import Board from './components/Board'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import SpawnDialog from './components/SpawnDialog'
import { ClaudeInstance } from './types'
import { useNotifications } from './hooks/useNotifications'

interface SystemStatus {
  claudeInstalled: boolean
  claudeDir: boolean
  projectsDir: boolean
  error?: string
}

type ConnectionState = 'connected' | 'disconnected' | 'checking'

function App() {
  const [instances, setInstances] = useState<ClaudeInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<ClaudeInstance | null>(null)
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking')
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Notifications
  const {
    settings: notificationSettings,
    updateSettings: updateNotificationSettings,
    permissionStatus,
    requestPermission,
    attentionCount,
  } = useNotifications(instances)

  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/instances')
      const data = await response.json()

      setConnectionState('connected')
      setRetryCount(0)

      if (data.success) {
        setInstances(data.data)
        setError(null)

        // Update selected instance if it still exists
        if (selectedInstance) {
          const updated = data.data.find((i: ClaudeInstance) => i.id === selectedInstance.id)
          if (updated) {
            setSelectedInstance(updated)
          }
        }
      } else {
        setError(data.error || 'Failed to fetch instances')
      }
    } catch (err) {
      setConnectionState('disconnected')
      setRetryCount(prev => prev + 1)

      if (retryCount < 3) {
        setError('Connecting to server...')
      } else {
        setError('Unable to connect to server. Make sure the backend is running on port 3001.')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedInstance, retryCount])

  // Check system status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/status')
        const data = await response.json()
        if (data.success) {
          setSystemStatus(data.data)
        }
      } catch {
        // Server not available yet
      }
    }
    checkStatus()
  }, [connectionState])

  useEffect(() => {
    fetchInstances()
    const interval = setInterval(fetchInstances, 1500)
    return () => clearInterval(interval)
  }, [fetchInstances])

  const handleSelectInstance = (instance: ClaudeInstance) => {
    setSelectedInstance(instance)
  }

  const handleCloseDetail = () => {
    setSelectedInstance(null)
  }

  return (
    <div className="min-h-screen bg-board-bg">
      <Header
        attentionCount={attentionCount}
        onRefresh={fetchInstances}
        onSpawnClick={() => setShowSpawnDialog(true)}
        notificationSettings={notificationSettings}
        onNotificationSettingsChange={updateNotificationSettings}
        notificationPermission={permissionStatus}
        onRequestNotificationPermission={requestPermission}
      />
      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-text-secondary">Loading instances...</div>
            </div>
          </div>
        ) : connectionState === 'disconnected' ? (
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Lost</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchInstances}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : systemStatus?.error ? (
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Required</h2>
              <p className="text-gray-600 mb-4">{systemStatus.error}</p>
              <a
                href="https://claude.ai/code"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Get Claude Code
              </a>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchInstances}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <Board
            instances={instances}
            selectedId={selectedInstance?.id}
            onSelectInstance={handleSelectInstance}
          />
        )}
      </main>

      {/* Connection Status Indicator */}
      {connectionState === 'disconnected' && !loading && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Reconnecting...
        </div>
      )}

      {/* Chat Panel */}
      {selectedInstance && (
        <ChatPanel
          instance={selectedInstance}
          onClose={handleCloseDetail}
        />
      )}

      {/* Spawn Dialog */}
      <SpawnDialog
        isOpen={showSpawnDialog}
        onClose={() => setShowSpawnDialog(false)}
        onSpawn={fetchInstances}
      />
    </div>
  )
}

export default App
