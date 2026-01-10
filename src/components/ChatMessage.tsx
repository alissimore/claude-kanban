import { useState } from 'react'
import { ConversationMessage, MessageContent, AskUserQuestionInput } from '../types'
import AskUserQuestionBlock from './AskUserQuestionBlock'

interface ChatMessageProps {
  message: ConversationMessage
  onAnswerQuestion?: (answer: string) => void
  answeredToolIds?: Set<string>
  getAnswerForToolId?: (toolId: string) => string | undefined
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ToolUseBlock({ content }: { content: MessageContent }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 border border-blue-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 bg-blue-50 text-left flex items-center justify-between text-sm hover:bg-blue-100"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="font-medium text-blue-800">{content.toolName}</span>
        </div>
        <svg
          className={`w-4 h-4 text-blue-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-white border-t border-blue-200">
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(content.toolInput, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function ToolResultBlock({ content }: { content: MessageContent }) {
  const [expanded, setExpanded] = useState(false)
  const text = content.text || ''
  const isLong = text.length > 200

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium">Tool Result</span>
        </div>
        <pre className={`text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {text}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline mt-1"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  )
}

function ThinkingBlock({ content }: { content: MessageContent }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 border border-purple-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 bg-purple-50 text-left flex items-center justify-between text-sm hover:bg-purple-100"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-medium text-purple-800">Thinking</span>
        </div>
        <svg
          className={`w-4 h-4 text-purple-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 py-2 bg-white border-t border-purple-200 max-h-64 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {content.thinking}
          </pre>
        </div>
      )}
    </div>
  )
}

function TextContent({ text }: { text: string }) {
  // Basic markdown-like rendering
  const lines = text.split('\n')

  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        // Code block detection (simple)
        if (line.startsWith('```')) {
          return null // Skip code fence markers
        }

        // Header detection
        if (line.startsWith('# ')) {
          return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(2)}</h3>
        }
        if (line.startsWith('## ')) {
          return <h4 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(3)}</h4>
        }

        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="ml-4">{line.slice(2)}</li>
        }

        // Inline code
        const parts = line.split(/(`[^`]+`)/g)
        const rendered = parts.map((part, j) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                {part.slice(1, -1)}
              </code>
            )
          }
          return part
        })

        // Empty line
        if (!line.trim()) {
          return <br key={i} />
        }

        return <p key={i} className="my-1">{rendered}</p>
      })}
    </div>
  )
}

export default function ChatMessage({
  message,
  onAnswerQuestion,
  answeredToolIds,
  getAnswerForToolId,
}: ChatMessageProps) {
  const isUser = message.type === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs font-medium text-gray-600">
            {isUser ? 'You' : 'Claude'}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
        >
          {message.content.map((block, i) => {
            if (block.type === 'text' && block.text) {
              return isUser ? (
                <p key={i} className="whitespace-pre-wrap">{block.text}</p>
              ) : (
                <TextContent key={i} text={block.text} />
              )
            }
            if (block.type === 'tool_use') {
              // Special handling for AskUserQuestion
              if (block.toolName === 'AskUserQuestion' && block.toolInput && onAnswerQuestion) {
                const toolId = block.toolId || ''
                const isAnswered = answeredToolIds?.has(toolId) || false
                const answeredText = getAnswerForToolId?.(toolId)
                return (
                  <AskUserQuestionBlock
                    key={i}
                    toolId={toolId}
                    toolInput={block.toolInput as AskUserQuestionInput}
                    onAnswer={onAnswerQuestion}
                    isAnswered={isAnswered}
                    answeredText={answeredText}
                  />
                )
              }
              return <ToolUseBlock key={i} content={block} />
            }
            if (block.type === 'tool_result') {
              return <ToolResultBlock key={i} content={block} />
            }
            if (block.type === 'thinking') {
              return <ThinkingBlock key={i} content={block} />
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}
