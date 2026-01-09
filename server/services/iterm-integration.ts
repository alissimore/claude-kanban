import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Find the TTY device for a given process ID
 */
export async function findTtyForPid(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `lsof -p ${pid} 2>/dev/null | grep /dev/ttys | head -1 | awk '{print $9}'`
    )
    const tty = stdout.trim()
    return tty || null
  } catch {
    return null
  }
}

/**
 * Send a message to an iTerm2 session by its TTY
 */
export async function sendToItermSession(tty: string, message: string): Promise<boolean> {
  // Escape the message for AppleScript
  const escapedMessage = message
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  // AppleScript to find the session with matching TTY and send text
  // We use "write text" which types the text, then use keystroke return to submit
  const script = `
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            try
              if tty of s is "${tty}" then
                tell s
                  write text "${escapedMessage}" newline no
                end tell
                -- Small delay to ensure text is written
                delay 0.05
                tell application "System Events"
                  keystroke return
                end tell
                return "success"
              end if
            end try
          end repeat
        end repeat
      end repeat
    end tell
    return "not_found"
  `

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    return stdout.trim() === 'success'
  } catch (err) {
    console.error('AppleScript error:', err)
    return false
  }
}

/**
 * Send a message to a Claude instance by PID
 */
export async function sendMessageToInstance(pid: number, message: string): Promise<{
  success: boolean
  error?: string
}> {
  // Find the TTY for this process
  const tty = await findTtyForPid(pid)
  if (!tty) {
    return {
      success: false,
      error: 'Could not find terminal for this instance. It may not be running in iTerm2.',
    }
  }

  // Send to iTerm
  const sent = await sendToItermSession(tty, message)
  if (!sent) {
    return {
      success: false,
      error: 'Could not send to iTerm session. The terminal may have been closed.',
    }
  }

  return { success: true }
}

/**
 * Spawn a new Claude instance in an iTerm2 window
 */
export async function spawnInIterm(options: {
  cwd: string
  prompt?: string
  dangerouslySkipPermissions?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const { cwd, prompt, dangerouslySkipPermissions } = options

  // Build the claude command
  let claudeCommand = 'claude'
  if (dangerouslySkipPermissions) {
    claudeCommand += ' --dangerously-skip-permissions'
  }
  if (prompt) {
    // Escape prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''")
    claudeCommand += ` -p '${escapedPrompt}'`
  }

  // Escape cwd for AppleScript
  const escapedCwd = cwd.replace(/'/g, "'\\''")

  // AppleScript to create new iTerm window and run command
  const script = `
    tell application "iTerm2"
      create window with default profile command "cd '${escapedCwd}' && ${claudeCommand}"
      activate
    end tell
  `

  try {
    await execAsync(`osascript -e '${script}'`)
    return { success: true }
  } catch (err) {
    console.error('Failed to spawn in iTerm:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to spawn in iTerm',
    }
  }
}

/**
 * Focus the iTerm2 session for a given PID
 */
export async function focusItermSession(pid: number): Promise<boolean> {
  const tty = await findTtyForPid(pid)
  if (!tty) return false

  const script = `
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            try
              if tty of s is "${tty}" then
                select t
                select s
                activate
                return "success"
              end if
            end try
          end repeat
        end repeat
      end repeat
    end tell
    return "not_found"
  `

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    return stdout.trim() === 'success'
  } catch {
    return false
  }
}
