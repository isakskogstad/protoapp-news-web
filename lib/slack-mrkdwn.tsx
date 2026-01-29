'use client'

import React from 'react'
import { EMOJI_MAP } from './slack-utils'

// Token types for the parser
type TokenType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'user'
  | 'channel'
  | 'special'
  | 'emoji'
  | 'newline'

interface Token {
  type: TokenType
  content: string
  url?: string
  displayText?: string
  userId?: string
  channelId?: string
  channelName?: string
}

// Parse Slack mrkdwn text to React elements
export function parseSlackMrkdwn(
  text: string,
  userMap: Record<string, string> = {}
): React.ReactNode {
  if (!text) return null

  const tokens = tokenize(text, userMap)
  return renderTokens(tokens, userMap)
}

// Tokenize the text into structured tokens
function tokenize(text: string, userMap: Record<string, string>): Token[] {
  const tokens: Token[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Code block (```...```) - must check before other patterns
    const codeBlockMatch = remaining.match(/^```([\s\S]*?)```/)
    if (codeBlockMatch) {
      tokens.push({ type: 'codeblock', content: codeBlockMatch[1] })
      remaining = remaining.slice(codeBlockMatch[0].length)
      continue
    }

    // Inline code (`...`)
    const codeMatch = remaining.match(/^`([^`\n]+)`/)
    if (codeMatch) {
      tokens.push({ type: 'code', content: codeMatch[1] })
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Link with display text: <url|text>
    const linkWithTextMatch = remaining.match(/^<(https?:\/\/[^|>]+)\|([^>]+)>/)
    if (linkWithTextMatch) {
      tokens.push({
        type: 'link',
        content: linkWithTextMatch[2],
        url: linkWithTextMatch[1],
        displayText: linkWithTextMatch[2]
      })
      remaining = remaining.slice(linkWithTextMatch[0].length)
      continue
    }

    // Link without display text: <url>
    const linkMatch = remaining.match(/^<(https?:\/\/[^>]+)>/)
    if (linkMatch) {
      tokens.push({
        type: 'link',
        content: linkMatch[1],
        url: linkMatch[1],
        displayText: linkMatch[1]
      })
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Email link: <mailto:email|text> or <mailto:email>
    const emailWithTextMatch = remaining.match(/^<mailto:([^|>]+)\|([^>]+)>/)
    if (emailWithTextMatch) {
      tokens.push({
        type: 'link',
        content: emailWithTextMatch[2],
        url: `mailto:${emailWithTextMatch[1]}`,
        displayText: emailWithTextMatch[2]
      })
      remaining = remaining.slice(emailWithTextMatch[0].length)
      continue
    }

    const emailMatch = remaining.match(/^<mailto:([^>]+)>/)
    if (emailMatch) {
      tokens.push({
        type: 'link',
        content: emailMatch[1],
        url: `mailto:${emailMatch[1]}`,
        displayText: emailMatch[1]
      })
      remaining = remaining.slice(emailMatch[0].length)
      continue
    }

    // User mention: <@U123>
    const userMatch = remaining.match(/^<@(\w+)>/)
    if (userMatch) {
      tokens.push({
        type: 'user',
        content: userMap[userMatch[1]] || userMatch[1],
        userId: userMatch[1]
      })
      remaining = remaining.slice(userMatch[0].length)
      continue
    }

    // Channel mention: <#C123|name> or <#C123>
    const channelWithNameMatch = remaining.match(/^<#(\w+)\|([^>]+)>/)
    if (channelWithNameMatch) {
      tokens.push({
        type: 'channel',
        content: channelWithNameMatch[2],
        channelId: channelWithNameMatch[1],
        channelName: channelWithNameMatch[2]
      })
      remaining = remaining.slice(channelWithNameMatch[0].length)
      continue
    }

    const channelMatch = remaining.match(/^<#(\w+)>/)
    if (channelMatch) {
      tokens.push({
        type: 'channel',
        content: channelMatch[1],
        channelId: channelMatch[1],
        channelName: channelMatch[1]
      })
      remaining = remaining.slice(channelMatch[0].length)
      continue
    }

    // Special mentions: <!here>, <!channel>, <!everyone>
    const specialMatch = remaining.match(/^<!(\w+)(?:\|[^>]*)?>/)
    if (specialMatch) {
      const specialType = specialMatch[1]
      const displayText = specialType === 'here' ? '@har'
        : specialType === 'channel' ? '@kanal'
        : specialType === 'everyone' ? '@alla'
        : `@${specialType}`
      tokens.push({ type: 'special', content: displayText })
      remaining = remaining.slice(specialMatch[0].length)
      continue
    }

    // Emoji: :emoji_name:
    const emojiMatch = remaining.match(/^:([a-z0-9_+-]+):/i)
    if (emojiMatch) {
      const emojiChar = EMOJI_MAP[emojiMatch[1].toLowerCase()]
      tokens.push({
        type: 'emoji',
        content: emojiChar || emojiMatch[0]
      })
      remaining = remaining.slice(emojiMatch[0].length)
      continue
    }

    // Bold: *text* (not inside words, not emoji shortcodes)
    const boldMatch = remaining.match(/^\*([^*\n]+)\*/)
    if (boldMatch && !remaining.startsWith(':')) {
      // Recursively parse the content
      tokens.push({ type: 'bold', content: boldMatch[1] })
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic: _text_ (not inside words)
    const italicMatch = remaining.match(/^_([^_\n]+)_/)
    if (italicMatch) {
      tokens.push({ type: 'italic', content: italicMatch[1] })
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Strikethrough: ~text~
    const strikeMatch = remaining.match(/^~([^~\n]+)~/)
    if (strikeMatch) {
      tokens.push({ type: 'strike', content: strikeMatch[1] })
      remaining = remaining.slice(strikeMatch[0].length)
      continue
    }

    // Newline
    if (remaining.startsWith('\n')) {
      tokens.push({ type: 'newline', content: '\n' })
      remaining = remaining.slice(1)
      continue
    }

    // Plain text - find next special character or end
    const nextSpecial = findNextSpecial(remaining)
    if (nextSpecial > 0) {
      tokens.push({ type: 'text', content: remaining.slice(0, nextSpecial) })
      remaining = remaining.slice(nextSpecial)
    } else if (nextSpecial === 0) {
      // No match found, consume one character
      tokens.push({ type: 'text', content: remaining[0] })
      remaining = remaining.slice(1)
    } else {
      // Rest is plain text
      tokens.push({ type: 'text', content: remaining })
      remaining = ''
    }
  }

  return tokens
}

// Find the position of the next special character
function findNextSpecial(text: string): number {
  const specialChars = ['*', '_', '~', '`', '<', ':', '\n']
  let minPos = -1

  for (const char of specialChars) {
    const pos = text.indexOf(char)
    if (pos !== -1 && (minPos === -1 || pos < minPos)) {
      minPos = pos
    }
  }

  return minPos
}

// Render tokens to React elements
function renderTokens(tokens: Token[], userMap: Record<string, string>): React.ReactNode {
  return tokens.map((token, index) => renderToken(token, index, userMap))
}

// Render a single token
function renderToken(token: Token, key: number, userMap: Record<string, string>): React.ReactNode {
  switch (token.type) {
    case 'text':
      return <span key={key}>{token.content}</span>

    case 'bold':
      return (
        <strong key={key} className="font-semibold">
          {parseSlackMrkdwn(token.content, userMap)}
        </strong>
      )

    case 'italic':
      return (
        <em key={key} className="italic">
          {parseSlackMrkdwn(token.content, userMap)}
        </em>
      )

    case 'strike':
      return (
        <del key={key} className="line-through">
          {parseSlackMrkdwn(token.content, userMap)}
        </del>
      )

    case 'code':
      return (
        <code
          key={key}
          className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono"
        >
          {token.content}
        </code>
      )

    case 'codeblock':
      return (
        <pre
          key={key}
          className="my-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono overflow-x-auto"
        >
          <code>{token.content}</code>
        </pre>
      )

    case 'link':
      return (
        <a
          key={key}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {token.displayText}
        </a>
      )

    case 'user':
      return (
        <span
          key={key}
          className="inline-flex items-center px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium"
          title={`User ID: ${token.userId}`}
        >
          @{token.content}
        </span>
      )

    case 'channel':
      return (
        <span
          key={key}
          className="inline-flex items-center px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-medium"
          title={`Channel ID: ${token.channelId}`}
        >
          #{token.channelName}
        </span>
      )

    case 'special':
      return (
        <span
          key={key}
          className="inline-flex items-center px-1 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-[10px] font-medium"
        >
          {token.content}
        </span>
      )

    case 'emoji':
      return <span key={key}>{token.content}</span>

    case 'newline':
      return <br key={key} />

    default:
      return <span key={key}>{token.content}</span>
  }
}

// Component wrapper for easy use
interface SlackMessageProps {
  text: string
  users?: Record<string, string>
  className?: string
}

export function SlackMessage({ text, users = {}, className = '' }: SlackMessageProps) {
  return (
    <span className={`slack-message ${className}`}>
      {parseSlackMrkdwn(text, users)}
    </span>
  )
}
