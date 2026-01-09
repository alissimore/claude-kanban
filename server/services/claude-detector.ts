import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ClaudeInstance, InstanceState, RawMessage } from '../types.js'

const execAsync = promisify(exec)

const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')
const TODOS_DIR = path.join(CLAUDE_DIR, 'todos')

export interface SystemStatus {
  claudeInstalled: boolean
  claudeDir: boolean
  projectsDir: boolean
  error?: string
}

/**
 * Check if Claude Code is installed and configured
 */
export async function checkSystemStatus(): Promise<SystemStatus> {
  const status: SystemStatus = {
    claudeInstalled: false,
    claudeDir: false,
    projectsDir: false,
  }

  try {
    // Check if claude command exists
    await execAsync('which claude')
    status.claudeInstalled = true
  } catch {
    status.error = 'Claude Code CLI not found. Install from https://claude.ai/code'
    return status
  }

  try {
    await fs.access(CLAUDE_DIR)
    status.claudeDir = true
  } catch {
    status.error = `Claude directory not found at ${CLAUDE_DIR}`
    return status
  }

  try {
    await fs.access(PROJECTS_DIR)
    status.projectsDir = true
  } catch {
    // Projects dir might not exist if no sessions yet
    status.projectsDir = false
  }

  return status
}

/**
 * Convert a filesystem path to Claude's directory naming convention
 * /Users/foo/bar -> -Users-foo-bar
 */
function pathToClaudeDir(fsPath: string): string {
  return fsPath.replace(/\//g, '-')
}

/**
 * Find all running Claude Code processes (excluding chrome-mcp)
 */
async function findRunningProcesses(): Promise<Array<{ pid: number; cwd: string }>> {
  try {
    const { stdout: psOutput } = await execAsync(
      `ps aux | grep '[c]laude' | grep -v 'chrome-mcp' | awk '{print $2}'`
    )

    const pids = psOutput.trim().split('\n').filter(Boolean).map(Number)
    const results: Array<{ pid: number; cwd: string }> = []

    for (const pid of pids) {
      try {
        const { stdout: lsofOutput } = await execAsync(
          `lsof -p ${pid} 2>/dev/null | grep cwd | awk '{print $NF}'`
        )
        const cwd = lsofOutput.trim()
        if (cwd) {
          results.push({ pid, cwd })
        }
      } catch {
        // Process might have exited
      }
    }

    return results
  } catch {
    return []
  }
}

/**
 * Find recently active conversation files for a working directory
 * Returns files modified in the last hour, sorted by most recent
 */
async function findConversationFiles(cwd: string): Promise<string[]> {
  const projectDir = path.join(PROJECTS_DIR, pathToClaudeDir(cwd))
  const oneHourAgo = Date.now() - 60 * 60 * 1000

  try {
    const files = await fs.readdir(projectDir)
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'))

    if (jsonlFiles.length === 0) return []

    const fileStats = await Promise.all(
      jsonlFiles.map(async f => {
        const filePath = path.join(projectDir, f)
        const stat = await fs.stat(filePath)
        return { file: filePath, mtime: stat.mtime.getTime() }
      })
    )

    // Filter to recently modified and sort by most recent
    return fileStats
      .filter(f => f.mtime > oneHourAgo)
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.file)
  } catch {
    return []
  }
}

/**
 * Parse the last N messages from a conversation file
 */
async function parseConversation(filePath: string, limit = 15): Promise<RawMessage[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const lastLines = lines.slice(-limit)

    const messages: RawMessage[] = []
    for (const line of lastLines) {
      try {
        const data = JSON.parse(line)
        messages.push({
          type: data.type,
          role: data.message?.role || data.type,
          content: data.message?.content || data.content,
          timestamp: data.timestamp,
          sessionId: data.sessionId,
          cwd: data.cwd,
          gitBranch: data.gitBranch,
          todos: data.todos || [],
          stopReason: data.message?.stop_reason,
        })
      } catch {
        // Skip malformed lines
      }
    }

    return messages
  } catch {
    return []
  }
}

/**
 * Extract readable text from message content
 */
function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const textParts = content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
    return textParts.join('\n').slice(0, 500)
  }
  return ''
}

/**
 * Check if message contains tool usage
 */
function hasToolUse(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  return content.some((c: any) => c.type === 'tool_use')
}

/**
 * Check if message contains specific tool types
 */
function getToolNames(content: unknown): string[] {
  if (!Array.isArray(content)) return []
  return content
    .filter((c: any) => c.type === 'tool_use')
    .map((c: any) => c.name)
}

/**
 * Check if message contains thinking block (still processing)
 */
function hasThinking(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  return content.some((c: any) => c.type === 'thinking')
}

/**
 * Get git status for a directory
 */
async function getGitInfo(cwd: string): Promise<{ branch: string; isDirty: boolean } | null> {
  try {
    const { stdout: branch } = await execAsync(
      `cd "${cwd}" && git rev-parse --abbrev-ref HEAD 2>/dev/null`
    )

    const { stdout: status } = await execAsync(
      `cd "${cwd}" && git status --porcelain 2>/dev/null`
    )

    return {
      branch: branch.trim(),
      isDirty: status.trim().length > 0,
    }
  } catch {
    return null
  }
}

/**
 * Get todos for a session
 */
async function getTodos(sessionId: string): Promise<Array<{ content: string; status: string; activeForm?: string }>> {
  try {
    const files = await fs.readdir(TODOS_DIR)
    const todoFile = files.find(f => f.startsWith(sessionId))

    if (!todoFile) return []

    const content = await fs.readFile(path.join(TODOS_DIR, todoFile), 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

/**
 * Classify the state of an instance based on its conversation
 */
function classifyState(messages: RawMessage[], todos: Array<{ status: string }>): InstanceState {
  if (messages.length === 0) return 'working'

  const lastMessage = messages[messages.length - 1]
  const lastContent = lastMessage.content
  const textContent = extractTextContent(lastContent).toLowerCase()

  // Check for error indicators in recent messages
  const recentMessages = messages.slice(-5)
  const hasRecentError = recentMessages.some(m => {
    const text = extractTextContent(m.content).toLowerCase()
    return (
      text.includes('error:') ||
      text.includes('failed to') ||
      text.includes('permission denied') ||
      text.includes('command failed') ||
      text.includes('cannot find') ||
      text.includes('does not exist')
    ) && m.type === 'assistant'
  })

  if (hasRecentError) {
    // But if the last message is from user, they might be fixing it
    if (lastMessage.type !== 'user') {
      return 'blocked'
    }
  }

  // If last message is from user, Claude is working on it
  if (lastMessage.type === 'user') {
    return 'working'
  }

  // Assistant message analysis
  if (lastMessage.type === 'assistant') {
    // Check if it's actively using tools (in progress)
    if (hasToolUse(lastContent)) {
      const tools = getToolNames(lastContent)

      // AskUserQuestion tool means waiting for user
      if (tools.includes('AskUserQuestion')) {
        return 'attention'
      }

      // Other tools mean it's working
      return 'working'
    }

    // Check if thinking (still processing)
    if (hasThinking(lastContent) && !lastMessage.stopReason) {
      return 'working'
    }

    // Check for explicit questions or prompts to user
    if (
      textContent.includes('?') ||
      textContent.includes('would you like') ||
      textContent.includes('should i') ||
      textContent.includes('do you want') ||
      textContent.includes('please confirm') ||
      textContent.includes('let me know') ||
      textContent.includes('ready to') ||
      textContent.includes('shall i')
    ) {
      return 'attention'
    }

    // Check for completion indicators
    const allTodosDone = todos.length > 0 && todos.every(t => t.status === 'completed')
    if (
      allTodosDone ||
      textContent.includes('all tasks completed') ||
      textContent.includes('all done') ||
      textContent.includes("i've completed") ||
      textContent.includes('successfully completed')
    ) {
      return 'done'
    }
  }

  // Default: working
  return 'working'
}

/**
 * Create display content from message
 */
function createDisplayContent(messages: RawMessage[]): { type: 'user' | 'assistant'; content: string } {
  // Find the last meaningful message to display
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const text = extractTextContent(msg.content)

    // Skip empty messages
    if (!text.trim()) continue

    // Skip tool results, show actual content
    if (msg.type === 'user' && text.startsWith('[')) continue

    return {
      type: msg.type as 'user' | 'assistant',
      content: text.slice(0, 300),
    }
  }

  return { type: 'assistant', content: '' }
}

/**
 * Detect all running Claude instances and their states
 */
export async function detectInstances(): Promise<ClaudeInstance[]> {
  const processes = await findRunningProcesses()
  const instances: ClaudeInstance[] = []
  const seenSessions = new Set<string>()

  // Group processes by cwd to avoid duplicate processing
  const cwdToProcesses = new Map<string, { pid: number; cwd: string }>()
  for (const proc of processes) {
    // Keep the first (usually most recent) process for each cwd
    if (!cwdToProcesses.has(proc.cwd)) {
      cwdToProcesses.set(proc.cwd, proc)
    }
  }

  for (const proc of cwdToProcesses.values()) {
    const conversationFiles = await findConversationFiles(proc.cwd)

    // Only take the most recent conversation file per directory
    // This is usually the active session
    const conversationFile = conversationFiles[0]
    if (!conversationFile) continue

    const messages = await parseConversation(conversationFile)
    if (messages.length === 0) continue

    // Get session ID from the most recent message
    const sessionId = messages[messages.length - 1].sessionId || messages[0].sessionId
    if (!sessionId || seenSessions.has(sessionId)) continue
    seenSessions.add(sessionId)

    const lastMessage = messages[messages.length - 1]
    const todos = await getTodos(sessionId)
    const gitInfo = await getGitInfo(proc.cwd)
    const state = classifyState(messages, todos)
    const displayContent = createDisplayContent(messages)

    instances.push({
      id: sessionId,
      pid: proc.pid,
      cwd: proc.cwd,
      name: path.basename(proc.cwd),
      state,
      lastActivity: new Date(lastMessage.timestamp),
      gitBranch: gitInfo?.branch || lastMessage.gitBranch || undefined,
      gitDirty: gitInfo?.isDirty,
      lastMessage: {
        type: displayContent.type,
        content: displayContent.content,
        timestamp: lastMessage.timestamp,
      },
      todos: {
        total: todos.length,
        completed: todos.filter(t => t.status === 'completed').length,
        inProgress: todos.find(t => t.status === 'in_progress')?.content,
        items: todos.slice(0, 5),
      },
      conversationFile: path.basename(conversationFile),
    })
  }

  // Sort by state priority, then by last activity
  const stateOrder: Record<InstanceState, number> = {
    attention: 0,
    blocked: 1,
    working: 2,
    done: 3,
  }

  instances.sort((a, b) => {
    const stateCompare = stateOrder[a.state] - stateOrder[b.state]
    if (stateCompare !== 0) return stateCompare
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  })

  return instances
}

// Run detection if called directly
if (process.argv[1]?.endsWith('claude-detector.ts')) {
  detectInstances().then(instances => {
    console.log('Detected Claude Instances:')
    console.log(JSON.stringify(instances, null, 2))
  })
}
