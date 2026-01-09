export type InstanceState = 'attention' | 'working' | 'blocked' | 'done'
export type ColumnId = InstanceState | 'inactive'

export interface ClaudeInstance {
  id: string
  pid: number
  cwd: string
  name: string
  state: InstanceState
  lastActivity: string
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

// Conversation types
export interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  toolName?: string
  toolInput?: unknown
  toolId?: string
  thinking?: string
}

export interface ToolUseBlock {
  id: string
  name: string
  input: unknown
}

export interface ConversationMessage {
  id: string
  type: 'user' | 'assistant'
  timestamp: string
  content: MessageContent[]
  toolUse?: ToolUseBlock[]
  thinking?: string
}

export interface Conversation {
  messages: ConversationMessage[]
  sessionId: string
  filePath: string
}
