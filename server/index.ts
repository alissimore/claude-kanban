import express from 'express'
import cors from 'cors'
import { detectInstances, checkSystemStatus } from './services/claude-detector.js'
import { getConversation } from './services/conversation-parser.js'
import { spawnInstance, killInstance, getRecentDirectories } from './services/instance-manager.js'
import { sendMessageToInstance, focusItermSession, spawnInIterm } from './services/iterm-integration.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Get all instances
app.get('/api/instances', async (_req, res) => {
  try {
    const instances = await detectInstances()
    res.json({ success: true, data: instances })
  } catch (error) {
    console.error('Error detecting instances:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Get full conversation for an instance
app.get('/api/instances/:id/conversation', async (req, res) => {
  try {
    const { id } = req.params
    const conversation = await getConversation(id)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      })
    }

    res.json({ success: true, data: conversation })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Spawn a new instance
app.post('/api/spawn', async (req, res) => {
  try {
    const { cwd, prompt, dangerouslySkipPermissions } = req.body

    if (!cwd) {
      return res.status(400).json({
        success: false,
        error: 'Working directory (cwd) is required',
      })
    }

    const result = await spawnInstance({ cwd, prompt, dangerouslySkipPermissions })

    if (result.success) {
      res.json({ success: true, data: { pid: result.pid } })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('Error spawning instance:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Kill an instance
app.post('/api/instances/:pid/kill', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10)
    const { force } = req.body

    if (isNaN(pid)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PID',
      })
    }

    const result = await killInstance(pid, force)

    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('Error killing instance:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Send a message to an instance
app.post('/api/instances/:pid/message', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10)
    const { message } = req.body

    if (isNaN(pid)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PID',
      })
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      })
    }

    const result = await sendMessageToInstance(pid, message)

    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Focus the iTerm session for an instance
app.post('/api/instances/:pid/focus', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10)

    if (isNaN(pid)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PID',
      })
    }

    const focused = await focusItermSession(pid)

    if (focused) {
      res.json({ success: true })
    } else {
      res.status(500).json({
        success: false,
        error: 'Could not focus terminal. It may not be running in iTerm2.'
      })
    }
  } catch (error) {
    console.error('Error focusing session:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Spawn in iTerm (alternative to background spawn)
app.post('/api/spawn-iterm', async (req, res) => {
  try {
    const { cwd, prompt, dangerouslySkipPermissions } = req.body

    if (!cwd) {
      return res.status(400).json({
        success: false,
        error: 'Working directory (cwd) is required',
      })
    }

    const result = await spawnInIterm({ cwd, prompt, dangerouslySkipPermissions })

    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('Error spawning in iTerm:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Get recent directories for spawn dialog
app.get('/api/recent-directories', async (_req, res) => {
  try {
    const directories = await getRecentDirectories()
    res.json({ success: true, data: directories })
  } catch (error) {
    console.error('Error getting recent directories:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// System status check
app.get('/api/status', async (_req, res) => {
  try {
    const status = await checkSystemStatus()
    res.json({ success: true, data: status })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Health check
app.get('/api/health', async (_req, res) => {
  const status = await checkSystemStatus()
  res.json({
    status: status.claudeInstalled ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    claude: status,
  })
})

app.listen(PORT, () => {
  console.log(`Claude Kanban server running on http://localhost:${PORT}`)
})
