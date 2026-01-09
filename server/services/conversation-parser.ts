import * as fs from 'fs/promises'
import * as path from 'path'

const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

export interface ConversationMessage {
  id: string
  type: 'user' | 'assistant'
  timestamp: string
  content: MessageContent[]
  toolUse?: ToolUseBlock[]
  thinking?: string
}

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

/**
 * Convert filesystem path to Claude's directory naming
 */
function pathToClaudeDir(fsPath: string): string {
  return fsPath.replace(/\//g, '-')
}

/**
 * Find conversation file by session ID
 */
async function findConversationFile(sessionId: string): Promise<string | null> {
  try {
    // Search through all project directories
    const projectDirs = await fs.readdir(PROJECTS_DIR)

    for (const dir of projectDirs) {
      const projectPath = path.join(PROJECTS_DIR, dir)
      const stat = await fs.stat(projectPath)
      if (!stat.isDirectory()) continue

      const files = await fs.readdir(projectPath)
      const matchingFile = files.find(f => f.startsWith(sessionId) && f.endsWith('.jsonl'))

      if (matchingFile) {
        return path.join(projectPath, matchingFile)
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse a single message from JSONL line
 */
function parseMessage(data: any): ConversationMessage | null {
  if (!data.type || !data.timestamp) return null

  const content: MessageContent[] = []
  const toolUse: ToolUseBlock[] = []
  let thinking: string | undefined

  const rawContent = data.message?.content || data.content

  if (typeof rawContent === 'string') {
    content.push({ type: 'text', text: rawContent })
  } else if (Array.isArray(rawContent)) {
    for (const block of rawContent) {
      if (block.type === 'text') {
        content.push({ type: 'text', text: block.text })
      } else if (block.type === 'tool_use') {
        content.push({
          type: 'tool_use',
          toolName: block.name,
          toolInput: block.input,
          toolId: block.id,
        })
        toolUse.push({
          id: block.id,
          name: block.name,
          input: block.input,
        })
      } else if (block.type === 'tool_result') {
        content.push({
          type: 'tool_result',
          toolId: block.tool_use_id,
          text: typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content),
        })
      } else if (block.type === 'thinking') {
        thinking = block.thinking
        content.push({ type: 'thinking', thinking: block.thinking })
      }
    }
  }

  return {
    id: data.uuid || data.message?.id || `${data.timestamp}-${data.type}`,
    type: data.type,
    timestamp: data.timestamp,
    content,
    toolUse: toolUse.length > 0 ? toolUse : undefined,
    thinking,
  }
}

export interface ParseStats {
  totalLines: number
  parsedLines: number
  skippedLines: number
  errors: string[]
}

/**
 * Get full conversation for a session
 */
export async function getConversation(sessionId: string): Promise<{
  messages: ConversationMessage[]
  sessionId: string
  filePath: string
  stats: ParseStats
} | null> {
  const filePath = await findConversationFile(sessionId)
  if (!filePath) return null

  const stats: ParseStats = {
    totalLines: 0,
    parsedLines: 0,
    skippedLines: 0,
    errors: [],
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')

    // Handle empty files
    if (!content.trim()) {
      return {
        messages: [],
        sessionId,
        filePath,
        stats,
      }
    }

    const lines = content.trim().split('\n').filter(Boolean)
    stats.totalLines = lines.length

    const messages: ConversationMessage[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      try {
        // Skip obviously corrupted lines (binary content, etc.)
        if (line.includes('\0') || !line.startsWith('{')) {
          stats.skippedLines++
          continue
        }

        const data = JSON.parse(line)
        const message = parseMessage(data)
        if (message) {
          messages.push(message)
          stats.parsedLines++
        } else {
          stats.skippedLines++
        }
      } catch (err) {
        stats.skippedLines++
        // Only log first few errors to avoid spam
        if (stats.errors.length < 3) {
          stats.errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`)
        }
      }
    }

    return {
      messages,
      sessionId,
      filePath,
      stats,
    }
  } catch (err) {
    // File read error - could be permissions, encoding, etc.
    console.error(`Error reading conversation file ${filePath}:`, err)
    return null
  }
}

/**
 * Get conversation by working directory (finds most recent session)
 */
export async function getConversationByPath(cwd: string): Promise<{
  messages: ConversationMessage[]
  sessionId: string
  filePath: string
  stats: ParseStats
} | null> {
  const projectDir = path.join(PROJECTS_DIR, pathToClaudeDir(cwd))

  try {
    const files = await fs.readdir(projectDir)
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'))

    if (jsonlFiles.length === 0) return null

    // Get most recently modified
    const fileStats = await Promise.all(
      jsonlFiles.map(async f => {
        const filePath = path.join(projectDir, f)
        const stat = await fs.stat(filePath)
        return { file: filePath, mtime: stat.mtime.getTime(), name: f }
      })
    )

    fileStats.sort((a, b) => b.mtime - a.mtime)
    const mostRecent = fileStats[0]

    // Extract session ID from filename
    const sessionId = mostRecent.name.replace('.jsonl', '')

    return getConversation(sessionId)
  } catch {
    return null
  }
}
