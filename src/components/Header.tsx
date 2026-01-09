import { useState } from 'react'

interface NotificationSettings {
  browserEnabled: boolean
  audioEnabled: boolean
}

interface HeaderProps {
  attentionCount: number
  onRefresh: () => void
  onSpawnClick: () => void
  notificationSettings: NotificationSettings
  onNotificationSettingsChange: (settings: Partial<NotificationSettings>) => void
  notificationPermission: NotificationPermission
  onRequestNotificationPermission: () => Promise<boolean>
}

export default function Header({
  attentionCount,
  onRefresh,
  onSpawnClick,
  notificationSettings,
  onNotificationSettingsChange,
  notificationPermission,
  onRequestNotificationPermission,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false)

  const handleBrowserToggle = async () => {
    if (!notificationSettings.browserEnabled && notificationPermission !== 'granted') {
      const granted = await onRequestNotificationPermission()
      if (granted) {
        onNotificationSettingsChange({ browserEnabled: true })
      }
    } else {
      onNotificationSettingsChange({ browserEnabled: !notificationSettings.browserEnabled })
    }
  }

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Claude Kanban</h1>
        {attentionCount > 0 && (
          <span className="bg-status-attention text-white text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">
            {attentionCount} need attention
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {/* Notification Settings */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gray-100 text-gray-700' : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
            }`}
            title="Notification settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {(notificationSettings.browserEnabled || notificationSettings.audioEnabled) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900 text-sm">Notifications</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Get alerted when instances need attention</p>
                </div>
                <div className="p-2">
                  {/* Browser Notifications */}
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="text-sm text-gray-700">Browser notifications</span>
                    </div>
                    <button
                      onClick={handleBrowserToggle}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        notificationSettings.browserEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.browserEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                  {notificationPermission === 'denied' && (
                    <p className="text-xs text-red-500 px-2 pb-2">
                      Notifications blocked. Enable in browser settings.
                    </p>
                  )}

                  {/* Audio Notifications */}
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span className="text-sm text-gray-700">Sound alerts</span>
                    </div>
                    <button
                      onClick={() => onNotificationSettingsChange({ audioEnabled: !notificationSettings.audioEnabled })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        notificationSettings.audioEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationSettings.audioEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onSpawnClick}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Instance
        </button>
        <button
          onClick={onRefresh}
          className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>
    </header>
  )
}
