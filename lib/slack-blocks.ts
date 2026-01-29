// Slack Block Kit builder utilities

import { Block, TextObject, BlockElement, Attachment } from './slack-types'
import { NewsItem as AppNewsItem } from './types'

// Text object helpers
export function mrkdwn(text: string): TextObject {
  return { type: 'mrkdwn', text }
}

export function plainText(text: string, emoji = true): TextObject {
  return { type: 'plain_text', text, emoji }
}

// Block builders
export function section(text: string | TextObject, accessory?: BlockElement): Block {
  const textObj = typeof text === 'string' ? mrkdwn(text) : text
  return {
    type: 'section',
    text: textObj,
    ...(accessory && { accessory }),
  }
}

export function sectionWithFields(fields: (string | TextObject)[]): Block {
  return {
    type: 'section',
    fields: fields.map(f => typeof f === 'string' ? mrkdwn(f) : f),
  }
}

export function header(text: string): Block {
  return {
    type: 'header',
    text: plainText(text),
  }
}

export function divider(): Block {
  return { type: 'divider' }
}

export function image(imageUrl: string, altText: string, title?: string): Block {
  return {
    type: 'image',
    image_url: imageUrl,
    alt_text: altText,
    ...(title && { title: plainText(title) }),
  }
}

export function context(elements: (string | { type: 'image'; image_url: string; alt_text: string })[]): Block {
  return {
    type: 'context',
    elements: elements.map(el => {
      if (typeof el === 'string') {
        return mrkdwn(el) as unknown as BlockElement
      }
      return el as unknown as BlockElement
    }),
  }
}

export function actions(elements: BlockElement[]): Block {
  return {
    type: 'actions',
    elements,
  }
}

// Element builders
export function button(
  text: string,
  options: {
    actionId?: string
    value?: string
    url?: string
    style?: 'primary' | 'danger'
  } = {}
): BlockElement {
  return {
    type: 'button',
    text: plainText(text),
    ...(options.actionId && { action_id: options.actionId }),
    ...(options.value && { value: options.value }),
    ...(options.url && { url: options.url }),
    ...(options.style && { style: options.style }),
  }
}

export function imageAccessory(imageUrl: string, altText: string): BlockElement {
  return {
    type: 'image',
    image_url: imageUrl,
    alt_text: altText,
  }
}

// Attachment builder
export function attachment(options: {
  color?: string
  title?: string
  titleLink?: string
  text?: string
  pretext?: string
  authorName?: string
  authorIcon?: string
  authorLink?: string
  fields?: { title: string; value: string; short?: boolean }[]
  imageUrl?: string
  thumbUrl?: string
  footer?: string
  footerIcon?: string
  ts?: number
}): Attachment {
  return {
    ...(options.color && { color: options.color }),
    ...(options.title && { title: options.title }),
    ...(options.titleLink && { title_link: options.titleLink }),
    ...(options.text && { text: options.text }),
    ...(options.pretext && { pretext: options.pretext }),
    ...(options.authorName && { author_name: options.authorName }),
    ...(options.authorIcon && { author_icon: options.authorIcon }),
    ...(options.authorLink && { author_link: options.authorLink }),
    ...(options.fields && { fields: options.fields }),
    ...(options.imageUrl && { image_url: options.imageUrl }),
    ...(options.thumbUrl && { thumb_url: options.thumbUrl }),
    ...(options.footer && { footer: options.footer }),
    ...(options.footerIcon && { footer_icon: options.footerIcon }),
    ...(options.ts && { ts: options.ts }),
  }
}

// News-specific block builders
interface NewsItem {
  id: string
  companyName: string
  orgNumber?: string
  headline?: string
  noticeText?: string
  protocolType?: string
  protocolDate?: string
  logoUrl?: string
  newsValue?: number
  sharedBy?: string  // Name of user who shared
}

export function buildNewsBlocks(news: NewsItem, baseUrl: string): Block[] {
  const blocks: Block[] = []

  // Compact header: who shared + company name in one line
  const sharedByText = news.sharedBy ? `📤 *${news.sharedBy}* delade: ` : ''
  const headerText = news.headline
    ? `${sharedByText}*${news.headline}*`
    : `${sharedByText}*Ny händelse för ${news.companyName}*`

  const sectionBlock = section(headerText)
  if (news.logoUrl) {
    sectionBlock.accessory = imageAccessory(news.logoUrl, news.companyName)
  }
  blocks.push(sectionBlock)

  // Compact context: all metadata on one line
  const contextParts: string[] = []
  if (news.companyName) contextParts.push(`🏢 ${news.companyName}`)
  if (news.protocolType) contextParts.push(`📄 ${news.protocolType}`)
  if (news.newsValue !== undefined && news.newsValue > 0) {
    const valueEmoji = news.newsValue >= 7 ? '🔴' : news.newsValue >= 4 ? '🟡' : '🟢'
    contextParts.push(`${valueEmoji} ${news.newsValue}/10`)
  }

  if (contextParts.length > 0) {
    blocks.push(context([contextParts.join('  •  ')]))
  }

  // Action button (inline, no divider)
  const newsUrl = `${baseUrl}/news/${news.id}`
  blocks.push(actions([
    button('Öppna', { url: newsUrl, style: 'primary' }),
  ]))

  return blocks
}

// Create a complete message payload for Slack API
export function createSlackMessage(options: {
  text: string
  blocks?: Block[]
  attachments?: Attachment[]
  threadTs?: string
  unfurlLinks?: boolean
  unfurlMedia?: boolean
}) {
  return {
    text: options.text,
    ...(options.blocks && { blocks: options.blocks }),
    ...(options.attachments && { attachments: options.attachments }),
    ...(options.threadTs && { thread_ts: options.threadTs }),
    unfurl_links: options.unfurlLinks ?? true,
    unfurl_media: options.unfurlMedia ?? true,
  }
}

// =============================================================================
// NEWS NOTIFICATION SPECIFIC FUNCTIONS
// =============================================================================

/**
 * Formats an organization number with a dash: 5565859484 -> 556585-9484
 */
export function formatOrgNumber(org: string): string {
  if (!org) return ''
  // Remove any existing hyphens/spaces
  const cleaned = org.replace(/[-\s]/g, '')
  // If it's 10 digits, format as XXXXXX-XXXX
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`
  }
  // Return as-is if already formatted or invalid
  return org
}

/**
 * Returns emoji based on news value (1-10 scale)
 * High (7-10): Red circle
 * Medium (4-6): Orange circle
 * Low (1-3): Green circle
 */
export function getNewsValueEmoji(value?: number): string {
  if (!value || value <= 0) return ''
  if (value >= 7) return '🔴'
  if (value >= 4) return '🟠'
  return '🟢'
}

/**
 * Returns a readable label for the news value
 */
export function getNewsValueLabel(value?: number): string {
  if (!value || value <= 0) return 'Okänt'
  if (value >= 7) return 'Högt'
  if (value >= 4) return 'Medium'
  return 'Lågt'
}

/**
 * Returns Swedish labels for protocol types
 */
export function getProtocolTypeLabel(type?: string): string {
  if (!type) return 'Protokoll'

  const typeLower = type.toLowerCase()

  // Check for specific protocol types
  if (typeLower.includes('per capsulam') || typeLower.includes('percapsulam')) {
    return 'Per capsulam'
  }
  if (typeLower.includes('styrelsemöte') || typeLower.includes('styrelseprotokoll')) {
    return 'Styrelsemöte'
  }
  if (typeLower.includes('extra bolagsstämma') || typeLower.includes('extra stämma')) {
    return 'Extra bolagsstämma'
  }
  if (typeLower.includes('årsstämma') || typeLower.includes('ordinarie')) {
    return 'Årsstämma'
  }
  if (typeLower.includes('bolagsstämma')) {
    return 'Bolagsstämma'
  }
  if (typeLower.includes('konkurs')) {
    return 'Konkurs'
  }
  if (typeLower.includes('kallelse')) {
    return 'Kallelse till stämma'
  }
  if (typeLower.includes('rekonstruktion')) {
    return 'Rekonstruktion'
  }

  // Format unknown types: snake_case -> Title Case
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase())
}

/**
 * Format a date string for display (YYYY-MM-DD -> DD mmm YYYY)
 */
function formatDateForSlack(dateStr?: string): string {
  if (!dateStr) return '-'

  try {
    // Try to parse ISO date
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()

    return `${day} ${month} ${year}`
  } catch {
    return dateStr
  }
}

/**
 * Get category color for the attachment
 */
function getCategoryColor(item: AppNewsItem): string {
  const headline = (item.headline || '').toLowerCase()
  const protocolType = (item.protocolType || '').toLowerCase()
  const combined = `${headline} ${protocolType}`

  if (combined.includes('konkurs')) return '#dc3545' // Red
  if (combined.includes('rekonstruktion')) return '#ffc107' // Yellow
  if (combined.includes('nyemission') || combined.includes('emission')) return '#28a745' // Green
  if (combined.includes('vd') && (combined.includes('byte') || combined.includes('ny'))) return '#fd7e14' // Orange
  if (combined.includes('styrelse')) return '#6f42c1' // Purple
  if (combined.includes('kallelse') || combined.includes('stämma')) return '#17a2b8' // Teal/Cyan

  return '#1e40af' // Default blue
}

/**
 * Creates a rich Block Kit message for news notifications
 * Following the structure requested:
 * 1. Header block with company name
 * 2. Section block with mrkdwn for news headline/text
 * 3. Section block with fields for metadata
 * 4. Context block with timestamp and source
 * 5. Divider where appropriate
 */
export function createNewsNotificationBlocks(item: AppNewsItem, baseUrl?: string): Block[] {
  const blocks: Block[] = []

  // 1. Header block with company name and emoji
  const headerEmoji = getNewsValueEmoji(item.newsValue)
  const headerText = headerEmoji
    ? `${headerEmoji} ${item.companyName}`
    : `📰 ${item.companyName}`

  blocks.push(header(headerText))

  // 2. Section block with headline and notice text
  const headline = item.headline || `Ny händelse`
  const noticeText = item.noticeText
    ? (item.noticeText.length > 500 ? item.noticeText.substring(0, 497) + '...' : item.noticeText)
    : ''

  const contentMrkdwn = noticeText
    ? `*${headline}*\n\n${noticeText}`
    : `*${headline}*`

  blocks.push(section(contentMrkdwn))

  // 3. Section block with fields for metadata
  const fields: TextObject[] = []

  // Protocol type field
  const protocolTypeLabel = getProtocolTypeLabel(item.protocolType)
  fields.push(mrkdwn(`*Typ:*\n${protocolTypeLabel}`))

  // Date field - use eventDate (stämmodatum) if available, otherwise timestamp
  const displayDate = item.eventDate || item.timestamp
  fields.push(mrkdwn(`*Datum:*\n${formatDateForSlack(displayDate)}`))

  // News value field with emoji
  if (item.newsValue && item.newsValue > 0) {
    const valueEmoji = getNewsValueEmoji(item.newsValue)
    const valueLabel = getNewsValueLabel(item.newsValue)
    fields.push(mrkdwn(`*Nyhetsvärde:*\n${valueEmoji} ${valueLabel} (${item.newsValue}/10)`))
  }

  // Org number field
  if (item.orgNumber) {
    fields.push(mrkdwn(`*Org.nr:*\n${formatOrgNumber(item.orgNumber)}`))
  }

  blocks.push(sectionWithFields(fields))

  // 4. Divider before context
  blocks.push(divider())

  // 5. Context block with timestamp and source link
  const contextElements: string[] = []

  // Source attribution
  const sourceType = item.type === 'kungorelse' ? 'Post- och Inrikes Tidningar' : 'Bolagsverket'
  contextElements.push(`Via ${sourceType}`)

  // Link to LoopDesk
  if (baseUrl) {
    const newsUrl = `${baseUrl}/news/${item.id}`
    contextElements.push(`<${newsUrl}|Öppna i LoopDesk>`)
  }

  blocks.push(context([contextElements.join(' • ')]))

  return blocks
}

/**
 * Creates a complete Slack message with blocks and a fallback text
 * for news notifications
 */
export function createNewsNotificationMessage(item: AppNewsItem, baseUrl?: string) {
  const headline = item.headline || 'Ny händelse'
  const fallbackText = `${item.companyName}: ${headline}`

  const blocks = createNewsNotificationBlocks(item, baseUrl)

  // Get accent color based on category
  const color = getCategoryColor(item)

  return {
    text: fallbackText,
    blocks,
    attachments: [
      {
        color,
        fallback: fallbackText,
      }
    ],
  }
}

// =============================================================================
// PDF / PROTOCOL FILE SHARING FUNCTIONS
// =============================================================================

interface ProtocolFileInfo {
  pdfUrl: string
  title?: string
  companyName?: string
  orgNumber?: string
  protocolDate?: string
  protocolType?: string
}

/**
 * Build blocks for a "Visa protokoll" (View Protocol) section
 *
 * This creates a compact section with a button to view/download the PDF.
 * Can be added to news notifications when a PDF URL is available.
 */
export function buildProtocolFileSection(file: ProtocolFileInfo): Block[] {
  const blocks: Block[] = []

  // Build the label text
  const labelParts: string[] = []
  if (file.protocolType) labelParts.push(getProtocolTypeLabel(file.protocolType))
  if (file.protocolDate) labelParts.push(formatDateForSlack(file.protocolDate))

  const label = labelParts.length > 0
    ? labelParts.join(' - ')
    : file.title || 'Protokoll'

  // Section with file info and download button
  const sectionText = file.companyName
    ? `*${label}*\n${file.companyName}${file.orgNumber ? ` (${formatOrgNumber(file.orgNumber)})` : ''}`
    : `*${label}*`

  blocks.push(
    section(
      sectionText,
      button('Visa protokoll', {
        url: file.pdfUrl,
        actionId: 'view_protocol',
      })
    )
  )

  return blocks
}

/**
 * Build a compact inline button for viewing a protocol PDF
 *
 * Use this when you want just the button without additional context,
 * for example in an actions block alongside other buttons.
 */
export function buildProtocolViewButton(pdfUrl: string, label?: string): BlockElement {
  return button(label || 'Visa protokoll', {
    url: pdfUrl,
    actionId: 'view_protocol',
  })
}

/**
 * Build blocks for news notification with optional PDF attachment
 *
 * Extends buildNewsBlocks to include a "Visa protokoll" button
 * when a PDF URL is available.
 */
export function buildNewsBlocksWithProtocol(
  news: NewsItem & { pdfUrl?: string },
  baseUrl: string
): Block[] {
  const blocks: Block[] = []

  // Compact header: who shared + company name in one line
  const sharedByText = news.sharedBy ? `📤 *${news.sharedBy}* delade: ` : ''
  const headerText = news.headline
    ? `${sharedByText}*${news.headline}*`
    : `${sharedByText}*Ny händelse för ${news.companyName}*`

  const sectionBlock = section(headerText)
  if (news.logoUrl) {
    sectionBlock.accessory = imageAccessory(news.logoUrl, news.companyName)
  }
  blocks.push(sectionBlock)

  // Compact context: all metadata on one line
  const contextParts: string[] = []
  if (news.companyName) contextParts.push(`🏢 ${news.companyName}`)
  if (news.protocolType) contextParts.push(`📄 ${getProtocolTypeLabel(news.protocolType)}`)
  if (news.newsValue !== undefined && news.newsValue > 0) {
    const valueEmoji = getNewsValueEmoji(news.newsValue)
    contextParts.push(`${valueEmoji} ${news.newsValue}/10`)
  }

  if (contextParts.length > 0) {
    blocks.push(context([contextParts.join('  •  ')]))
  }

  // Action buttons - include PDF view button if URL is available
  const newsUrl = `${baseUrl}/news/${news.id}`
  const actionButtons: BlockElement[] = [
    button('Öppna', { url: newsUrl, style: 'primary' }),
  ]

  // Add "Visa protokoll" button if PDF URL is provided
  if (news.pdfUrl) {
    actionButtons.push(
      button('Visa protokoll', {
        url: news.pdfUrl,
        actionId: 'view_protocol_pdf',
      })
    )
  }

  blocks.push(actions(actionButtons))

  return blocks
}

/**
 * Creates news notification blocks with an optional PDF link
 *
 * This is an extended version of createNewsNotificationBlocks that adds
 * a "Visa protokoll" button when a PDF URL is available.
 */
export function createNewsNotificationBlocksWithProtocol(
  item: AppNewsItem & { pdfUrl?: string },
  baseUrl?: string
): Block[] {
  // Start with the standard blocks
  const blocks = createNewsNotificationBlocks(item, baseUrl)

  // If we have a PDF URL, add a button for it
  if (item.pdfUrl) {
    // Find the actions block or create one
    const actionsIndex = blocks.findIndex(b => b.type === 'actions')

    if (actionsIndex >= 0) {
      // Add button to existing actions block
      const existingActions = blocks[actionsIndex]
      if (existingActions.elements) {
        existingActions.elements.push(buildProtocolViewButton(item.pdfUrl))
      }
    } else {
      // Insert an actions block before the context (which is typically last)
      const contextIndex = blocks.findIndex(b => b.type === 'context')
      const insertIndex = contextIndex >= 0 ? contextIndex : blocks.length

      blocks.splice(insertIndex, 0, actions([
        buildProtocolViewButton(item.pdfUrl, 'Visa protokoll (PDF)'),
      ]))
    }
  }

  return blocks
}

/**
 * Creates a complete Slack message with blocks, fallback text,
 * and an optional PDF link for news notifications
 */
export function createNewsNotificationMessageWithProtocol(
  item: AppNewsItem & { pdfUrl?: string },
  baseUrl?: string
) {
  const headline = item.headline || 'Ny händelse'
  const fallbackText = `${item.companyName}: ${headline}`

  const blocks = createNewsNotificationBlocksWithProtocol(item, baseUrl)

  // Get accent color based on category
  const color = getCategoryColor(item)

  return {
    text: fallbackText,
    blocks,
    attachments: [
      {
        color,
        fallback: fallbackText,
      }
    ],
  }
}

/**
 * Generate a Supabase Storage public URL for a protocol PDF
 *
 * @param bucket - Storage bucket name (e.g., 'Protokoll' or 'LoopBrowse')
 * @param path - Path within the bucket (e.g., 'protokoll/arsstamma/5599999999/2026-01-15.pdf')
 * @param supabaseUrl - Supabase project URL (default from env)
 * @returns Public URL to the file
 */
export function getProtocolStorageUrl(
  bucket: string,
  path: string,
  supabaseUrl?: string
): string {
  const baseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Ensure path doesn't start with /
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}

/**
 * Build a protocol PDF storage path from components
 *
 * @param category - Protocol category (e.g., 'arsstamma', 'extra_bolagsstamma')
 * @param orgNumber - Organization number (with or without hyphen)
 * @param date - Date string (YYYY-MM-DD format)
 * @returns Storage path (e.g., 'protokoll/arsstamma/5599999999/2026-01-15.pdf')
 */
export function buildProtocolStoragePath(
  category: string,
  orgNumber: string,
  date: string
): string {
  // Clean org number (remove hyphen if present)
  const cleanOrgNumber = orgNumber.replace(/-/g, '')
  // Ensure date is in correct format
  const cleanDate = date.substring(0, 10) // Take only YYYY-MM-DD part
  return `protokoll/${category}/${cleanOrgNumber}/${cleanDate}.pdf`
}
