'use client'

import { parseSlackMessage, parseSlackFormatting, parseEmoji } from '@/lib/slack-utils'
import { Block, TextObject, BlockElement, Attachment } from '@/lib/slack-types'
import { ExternalLink, Building2 } from 'lucide-react'

interface BlockKitRendererProps {
  blocks: Block[]
  attachments?: Attachment[]
  users?: Record<string, string>
}

// Check if blocks represent a news card (has section with headline, context with metadata, and actions with button)
function isNewsCard(blocks: Block[]): boolean {
  if (blocks.length < 3) return false
  const hasSection = blocks.some(b => b.type === 'section' && b.text?.text?.startsWith('*'))
  const hasContext = blocks.some(b => b.type === 'context')
  const hasActions = blocks.some(b => b.type === 'actions')
  return hasSection && hasContext && hasActions
}

// Extract news card data from blocks
function extractNewsData(blocks: Block[]): {
  headline?: string
  companyName?: string
  orgNumber?: string
  protocolType?: string
  protocolDate?: string
  noticeText?: string
  newsValue?: number
  url?: string
  logoUrl?: string
} {
  const data: ReturnType<typeof extractNewsData> = {}

  for (const block of blocks) {
    if (block.type === 'section' && block.text?.text) {
      const text = block.text.text
      // First section with bold text is headline
      if (text.startsWith('*') && !data.headline) {
        data.headline = text.replace(/^\*|\*$/g, '')
      } else if (!text.startsWith('*') && data.headline) {
        // Second section is notice text
        data.noticeText = text
      }
      // Check for logo accessory
      if (block.accessory?.type === 'image') {
        const imgAccessory = block.accessory as { image_url?: string }
        if (imgAccessory.image_url) {
          data.logoUrl = imgAccessory.image_url
        }
      }
    }

    if (block.type === 'context' && block.elements) {
      for (const el of block.elements) {
        // Context elements can be text objects with a text property
        const textEl = el as { type?: string; text?: string }
        if (textEl.text && typeof textEl.text === 'string') {
          const text = textEl.text
          if (text.includes('🏢')) {
            data.companyName = text.replace(/🏢\s*\*?|\*$/g, '').trim()
          }
          if (text.includes('Org.nr:')) {
            data.orgNumber = text.replace('Org.nr:', '').trim()
          }
          if (text.includes('📄')) {
            data.protocolType = text.replace('📄', '').trim()
          }
          if (text.includes('📅')) {
            data.protocolDate = text.replace('📅', '').trim()
          }
          if (text.includes('Nyhetsvärde:')) {
            const match = text.match(/(\d+)\/10/)
            if (match) data.newsValue = parseInt(match[1])
          }
        }
      }
    }

    if (block.type === 'actions' && block.elements) {
      for (const el of block.elements) {
        const btnEl = el as { type?: string; url?: string }
        if (btnEl.type === 'button' && btnEl.url) {
          data.url = btnEl.url
        }
      }
    }
  }

  return data
}

function renderTextObject(text: TextObject | undefined, users: Record<string, string> = {}): string {
  if (!text) return ''

  if (text.type === 'mrkdwn') {
    const { html } = parseSlackMessage(text.text, users)
    return html
  }

  return parseEmoji(text.text)
}

function renderElement(element: BlockElement, users: Record<string, string> = {}) {
  switch (element.type) {
    case 'button':
      const buttonStyle = element.style === 'primary'
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : element.style === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'

      if (element.url) {
        return (
          <a
            key={element.action_id || element.value}
            href={element.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${buttonStyle}`}
          >
            {element.text?.text || 'Länk'}
          </a>
        )
      }

      return (
        <button
          key={element.action_id || element.value}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${buttonStyle}`}
          title={element.value}
        >
          {element.text?.text || 'Knapp'}
        </button>
      )

    case 'image':
      return (
        <img
          key={element.image_url}
          src={element.image_url}
          alt={element.alt_text || ''}
          className="w-12 h-12 rounded-lg object-cover"
        />
      )

    default:
      return null
  }
}

function SectionBlock({ block, users }: { block: Block; users: Record<string, string> }) {
  return (
    <div className="flex gap-3">
      <div className="flex-1 min-w-0">
        {block.text && (
          <div
            className="text-sm text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: renderTextObject(block.text, users) }}
          />
        )}
        {block.fields && block.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {block.fields.map((field, i) => (
              <div
                key={i}
                className="text-sm text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: renderTextObject(field, users) }}
              />
            ))}
          </div>
        )}
      </div>
      {block.accessory && (
        <div className="shrink-0">
          {renderElement(block.accessory, users)}
        </div>
      )}
    </div>
  )
}

function ImageBlock({ block }: { block: Block }) {
  return (
    <div>
      {block.title && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {block.title.text}
        </p>
      )}
      <img
        src={block.image_url}
        alt={block.alt_text || ''}
        className="max-w-full rounded-lg border border-gray-200 dark:border-gray-700"
      />
    </div>
  )
}

function ContextBlock({ block, users }: { block: Block; users: Record<string, string> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {block.elements?.map((element, i) => {
        if (element.type === 'image') {
          return (
            <img
              key={i}
              src={element.image_url}
              alt={element.alt_text || ''}
              className="w-5 h-5 rounded"
            />
          )
        }
        // Text element
        if ('text' in element && element.text) {
          return (
            <span
              key={i}
              className="text-xs text-gray-500 dark:text-gray-400"
              dangerouslySetInnerHTML={{ __html: renderTextObject(element as unknown as TextObject, users) }}
            />
          )
        }
        return null
      })}
    </div>
  )
}

function ActionsBlock({ block, users }: { block: Block; users: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.elements?.map((element, i) => (
        <div key={i}>{renderElement(element, users)}</div>
      ))}
    </div>
  )
}

function HeaderBlock({ block }: { block: Block }) {
  return (
    <h3 className="text-base font-bold text-gray-900 dark:text-white">
      {block.text?.text || ''}
    </h3>
  )
}

function DividerBlock() {
  return <hr className="border-gray-200 dark:border-gray-700 my-2" />
}

// Compact news card component for shared news items
function NewsCard({ blocks }: { blocks: Block[] }) {
  const data = extractNewsData(blocks)

  const getNewsValueColor = (value?: number) => {
    if (!value) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    if (value >= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (value >= 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }

  return (
    <div className="bg-gray-50 dark:bg-[#1c2128] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
      <div className="p-2.5">
        {/* Compact header row */}
        <div className="flex items-center gap-2">
          {/* Small logo */}
          {data.logoUrl ? (
            <img
              src={data.logoUrl}
              alt={data.companyName || ''}
              className="w-7 h-7 rounded object-contain bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1e40af] to-[#3b82f6] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Company + headline on one line */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#0f172a] dark:text-[#e6edf3] truncate">
                {data.companyName || 'Nyhet'}
              </span>
              {data.protocolType && (
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-medium shrink-0">
                  {data.protocolType}
                </span>
              )}
              {data.newsValue !== undefined && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${getNewsValueColor(data.newsValue)}`}>
                  {data.newsValue}/10
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Headline */}
        {data.headline && (
          <p className="text-[11px] font-medium text-[#0f172a] dark:text-[#e6edf3] mt-1.5 line-clamp-2">
            {data.headline}
          </p>
        )}

        {/* Action link */}
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Öppna <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function AttachmentRenderer({ attachment, users }: { attachment: Attachment; users: Record<string, string> }) {
  const borderColor = attachment.color ? `#${attachment.color}` : '#e5e7eb'

  return (
    <div
      className="border-l-4 pl-3 py-1"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Author */}
      {attachment.author_name && (
        <div className="flex items-center gap-2 mb-1">
          {attachment.author_icon && (
            <img src={attachment.author_icon} alt="" className="w-4 h-4 rounded" />
          )}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {attachment.author_link ? (
              <a href={attachment.author_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {attachment.author_name}
              </a>
            ) : (
              attachment.author_name
            )}
          </span>
        </div>
      )}

      {/* Pretext */}
      {attachment.pretext && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{attachment.pretext}</p>
      )}

      {/* Title */}
      {attachment.title && (
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          {attachment.title_link ? (
            <a href={attachment.title_link} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400">
              {attachment.title}
            </a>
          ) : (
            attachment.title
          )}
        </h4>
      )}

      {/* Text */}
      {attachment.text && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
          {attachment.text}
        </p>
      )}

      {/* Fields */}
      {attachment.fields && attachment.fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {attachment.fields.map((field, i) => (
            <div key={i} className={field.short ? '' : 'col-span-2'}>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{field.title}</dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300">{field.value}</dd>
            </div>
          ))}
        </div>
      )}

      {/* Image */}
      {attachment.image_url && (
        <img
          src={attachment.image_url}
          alt=""
          className="mt-2 max-w-full rounded-lg"
        />
      )}

      {/* Footer */}
      {attachment.footer && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          {attachment.footer_icon && (
            <img src={attachment.footer_icon} alt="" className="w-4 h-4 rounded" />
          )}
          <span>{attachment.footer}</span>
          {attachment.ts && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{new Date(attachment.ts * 1000).toLocaleString('sv-SE')}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function BlockKitRenderer({ blocks, attachments, users = {} }: BlockKitRendererProps) {
  // Check if this is a news card - render as beautiful card component
  if (isNewsCard(blocks)) {
    return <NewsCard blocks={blocks} />
  }

  // Default block rendering
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'section':
            return <SectionBlock key={block.block_id || index} block={block} users={users} />
          case 'image':
            return <ImageBlock key={block.block_id || index} block={block} />
          case 'context':
            return <ContextBlock key={block.block_id || index} block={block} users={users} />
          case 'actions':
            return <ActionsBlock key={block.block_id || index} block={block} users={users} />
          case 'header':
            return <HeaderBlock key={block.block_id || index} block={block} />
          case 'divider':
            return <DividerBlock key={block.block_id || index} />
          default:
            return null
        }
      })}

      {attachments && attachments.length > 0 && (
        <div className="space-y-2 mt-2">
          {attachments.map((attachment, i) => (
            <AttachmentRenderer key={i} attachment={attachment} users={users} />
          ))}
        </div>
      )}
    </div>
  )
}
