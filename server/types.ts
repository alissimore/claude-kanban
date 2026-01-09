export type InstanceState = 'attention' | 'working' | 'blocked' | 'done'

export interface RawMessage {
  type: 'user' | 'assistant'
  role: string
  content: unknown
  timestamp: string
  sessionId: string
  cwd: string
  gitBranch?: string
  todos: Array<{ content: string; status: string }>
  stopReason?: string | null
}

export interface ConversationMessage {
  type: 'user' | 'assistant'
  role: string
  content: string
  timestamp: string
  sessionId: string
  cwd: string
  gitBranch?: string
  todos: Array<{ content: string; status: string }>
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

export interface ClaudeInstance {
  id: string
  pid: number
  cwd: string
  name: string
  state: InstanceState
  lastActivity: Date
  gitBranch?: string
  gitDirty?: boolean
  lastMessage: {
    type: 'user' | 'assistant'
    content: string
    timestamp: string
  }
  todos: {
    total: number
    completed: number
    inProgress?: string
    items: Array<{ content: string; status: string }>
  }
  conversationFile?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
