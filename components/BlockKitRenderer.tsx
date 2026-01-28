'use client'

import { parseSlackMessage, parseSlackFormatting, parseEmoji } from '@/lib/slack-utils'
import { Block, TextObject, BlockElement, Attachment } from '@/lib/slack-types'

interface BlockKitRendererProps {
  blocks: Block[]
  attachments?: Attachment[]
  users?: Record<string, string>
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
