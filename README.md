# Claude Kanban

A visual kanban board for managing multiple Claude Code instances simultaneously. Monitor, interact with, and control all your Claude sessions from a single dashboard.

## Features

- **Visual Kanban Board**: 4-column layout showing instance states:
  - **Needs Attention**: Claude is waiting for your input
  - **Working**: Claude is actively processing
  - **Blocked**: Errors or issues encountered
  - **Done**: Tasks completed

- **Real-time Monitoring**: Auto-refreshes every 1.5 seconds to show current state

- **Full Conversation View**: Click any card to see the complete chat history with:
  - User and assistant messages
  - Tool usage details
  - Thinking process (collapsed by default)
  - Code blocks with syntax highlighting

- **Instance Control**:
  - Spawn new Claude Code instances from any directory
  - Kill running instances (with confirmation)
  - Optional "dangerous mode" for skipping permission prompts

- **Git Integration**: Shows current branch and dirty status for each instance

- **Todo Tracking**: Displays in-progress todos from each Claude session

- **Multi-Channel Notifications**:
  - Visual pulse animation on attention-needing cards
  - Browser notifications when instances need attention
  - Audio alerts (beep sound)
  - Document title updates with attention count

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and configured
- Node.js 18+
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-kanban.git
cd claude-kanban

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Development Mode

Start both the frontend and backend in development mode:

```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend dev server
npm run dev
```

Then open http://localhost:5180 in your browser.

### Production Mode

```bash
# Build the project
npm run build

# Start the production server
npm run server
```

## Architecture

### Frontend (React + TypeScript + Vite)

- `src/App.tsx` - Main application component with state management
- `src/components/Board.tsx` - Kanban board with 4 columns
- `src/components/InstanceCard.tsx` - Individual instance cards
- `src/components/ChatPanel.tsx` - Full conversation viewer
- `src/components/SpawnDialog.tsx` - New instance spawning dialog
- `src/hooks/useNotifications.ts` - Notification management hook

### Backend (Express + TypeScript)

- `server/index.ts` - Express API server
- `server/services/claude-detector.ts` - Detects running Claude instances
- `server/services/conversation-parser.ts` - Parses JSONL conversation files
- `server/services/instance-manager.ts` - Spawns and kills instances

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instances` | GET | List all running instances |
| `/api/instances/:id/conversation` | GET | Get full conversation for an instance |
| `/api/spawn` | POST | Spawn a new Claude instance |
| `/api/instances/:pid/kill` | POST | Kill an instance by PID |
| `/api/recent-directories` | GET | Get recent working directories |
| `/api/status` | GET | System status check |
| `/api/health` | GET | Health check endpoint |

## How It Works

1. **Instance Detection**: The backend scans for running `claude` processes using `ps aux` and extracts their working directories via `lsof`.

2. **Conversation Parsing**: Claude Code stores conversations in `~/.claude/projects/{path}/*.jsonl`. The parser reads these files to extract messages, todos, and state.

3. **State Classification**: Each instance is classified based on the last message:
   - Questions or prompts → "attention"
   - Tool usage → "working"
   - Errors → "blocked"
   - All todos complete → "done"

4. **Spawning**: New instances are spawned using `child_process.spawn()` with the Claude CLI.

## Configuration

### Notification Settings

Click the bell icon in the header to configure:
- Browser notifications (requires permission)
- Audio alerts (beep sound)

Settings are persisted to localStorage.

### Port Configuration

- Frontend dev server: port 5180 (configurable in `vite.config.ts`)
- Backend API server: port 3001 (configurable in `server/index.ts`)

## Troubleshooting

### "Claude Code CLI not found"

Make sure Claude Code is installed and the `claude` command is in your PATH:
```bash
which claude
```

### "Unable to connect to server"

Ensure the backend is running on port 3001:
```bash
npm run server
```

### No instances showing

- Make sure you have Claude Code sessions running
- Check that sessions were started in the last hour (older sessions are filtered out)

## License

MIT
