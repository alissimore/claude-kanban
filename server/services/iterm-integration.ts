import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

type TerminalApp = 'iTerm2' | 'Terminal' | 'unknown'

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
 * Detect which terminal application owns a TTY by walking up the process tree
 */
async function detectTerminalApp(pid: number): Promise<TerminalApp> {
  try {
    // Walk up the process tree looking for a terminal app
    let currentPid = pid
    const maxDepth = 10

    for (let i = 0; i < maxDepth; i++) {
      const { stdout } = await execAsync(
        `ps -o ppid=,command= -p ${currentPid} 2>/dev/null`
      )
      const [ppid, ...commandParts] = stdout.trim().split(/\s+/)
      const command = commandParts.join(' ')

      if (command.includes('iTerm')) {
        return 'iTerm2'
      }
      if (command.includes('Terminal.app')) {
        return 'Terminal'
      }

      currentPid = parseInt(ppid, 10)
      if (isNaN(currentPid) || currentPid <= 1) {
        break
      }
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Send a message to an iTerm2 session by its TTY
 */
async function sendToItermSession(tty: string, message: string): Promise<boolean> {
  // Escape the message for AppleScript
  const escapedMessage = message
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  // AppleScript to find the session with matching TTY and send text
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
    console.error('iTerm AppleScript error:', err)
    return false
  }
}

/**
 * Send a message to a Terminal.app session by its TTY
 */
async function sendToTerminalSession(tty: string, message: string): Promise<boolean> {
  // Escape the message for AppleScript
  const escapedMessage = message
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  // AppleScript to find the Terminal.app window with matching TTY
  const script = `
    tell application "Terminal"
      repeat with w in windows
        repeat with t in tabs of w
          try
            if tty of t is "${tty}" then
              -- Focus the window and tab first
              set frontmost of w to true
              set selected of t to true
              -- Type the message using System Events
              tell application "System Events"
                tell process "Terminal"
                  keystroke "${escapedMessage}"
                  delay 0.05
                  keystroke return
                end tell
              end tell
              return "success"
            end if
          end try
        end repeat
      end repeat
    end tell
    return "not_found"
  `

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    return stdout.trim() === 'success'
  } catch (err) {
    console.error('Terminal.app AppleScript error:', err)
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
      error: 'Could not find terminal for this instance. It may not be running in a supported terminal.',
    }
  }

  // Detect which terminal app is being used
  const terminalApp = await detectTerminalApp(pid)

  let sent = false
  if (terminalApp === 'iTerm2') {
    sent = await sendToItermSession(tty, message)
  } else if (terminalApp === 'Terminal') {
    sent = await sendToTerminalSession(tty, message)
  } else {
    // Try iTerm2 first, then Terminal.app
    sent = await sendToItermSession(tty, message)
    if (!sent) {
      sent = await sendToTerminalSession(tty, message)
    }
  }

  if (!sent) {
    return {
      success: false,
      error: `Could not send to ${terminalApp === 'unknown' ? 'terminal' : terminalApp} session. The terminal may have been closed.`,
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
 * Focus the terminal session for a given PID
 */
export async function focusItermSession(pid: number): Promise<boolean> {
  const tty = await findTtyForPid(pid)
  if (!tty) return false

  const terminalApp = await detectTerminalApp(pid)

  if (terminalApp === 'Terminal') {
    return focusTerminalSession(tty)
  }

  // Default to iTerm2
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

/**
 * Focus a Terminal.app session by TTY
 */
async function focusTerminalSession(tty: string): Promise<boolean> {
  const script = `
    tell application "Terminal"
      repeat with w in windows
        repeat with t in tabs of w
          try
            if tty of t is "${tty}" then
              set frontmost of w to true
              set selected of t to true
              activate
              return "success"
            end if
          end try
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
