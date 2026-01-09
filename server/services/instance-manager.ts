import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SpawnOptions {
  cwd: string
  prompt?: string
  dangerouslySkipPermissions?: boolean
}

export interface SpawnResult {
  success: boolean
  pid?: number
  error?: string
}

export interface KillResult {
  success: boolean
  error?: string
}

/**
 * Spawn a new Claude Code instance
 */
export async function spawnInstance(options: SpawnOptions): Promise<SpawnResult> {
  const { cwd, prompt, dangerouslySkipPermissions } = options

  try {
    // Build the command arguments
    const args: string[] = []

    if (dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions')
    }

    if (prompt) {
      args.push('-p', prompt)
    }

    // Spawn the process detached so it continues running after this process exits
    const child = spawn('claude', args, {
      cwd,
      detached: true,
      stdio: 'ignore',
      shell: true,
    })

    // Unref so our process can exit independently
    child.unref()

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      success: true,
      pid: child.pid,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to spawn instance',
    }
  }
}

/**
 * Kill a Claude Code instance by PID
 */
export async function killInstance(pid: number, force: boolean = false): Promise<KillResult> {
  try {
    // First verify it's actually a claude process
    const { stdout } = await execAsync(`ps -p ${pid} -o command=`)
    if (!stdout.includes('claude')) {
      return {
        success: false,
        error: 'Process is not a Claude Code instance',
      }
    }

    // Send signal
    const signal = force ? 'SIGKILL' : 'SIGTERM'
    process.kill(pid, signal)

    // Wait a moment and verify it's gone
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Check if process still exists
      process.kill(pid, 0)
      // If we get here, process is still running
      if (!force) {
        // Try force kill
        process.kill(pid, 'SIGKILL')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch {
      // Process is gone, which is what we want
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to kill instance',
    }
  }
}

/**
 * Get recent working directories from Claude's project history
 */
export async function getRecentDirectories(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `ls -t ~/.claude/projects/ | head -10 | sed 's/-/\\//g' | sed 's/^\\/*/\\//'`
    )
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}
