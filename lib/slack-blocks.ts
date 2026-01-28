// Slack Block Kit builder utilities

import { Block, TextObject, BlockElement, Attachment } from './slack-types'

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

  // Show who shared the news
  if (news.sharedBy) {
    blocks.push(context([`📤 *${news.sharedBy}* delade en nyhet`]))
  }

  // Header section with company info
  const headerText = news.headline
    ? `*${news.headline}*`
    : `*Ny händelse för ${news.companyName}*`

  const sectionBlock = section(headerText)
  if (news.logoUrl) {
    sectionBlock.accessory = imageAccessory(news.logoUrl, news.companyName)
  }
  blocks.push(sectionBlock)

  // Context with metadata
  const contextElements: string[] = []
  if (news.companyName) contextElements.push(`🏢 *${news.companyName}*`)
  if (news.orgNumber) contextElements.push(`Org.nr: ${news.orgNumber}`)
  if (news.protocolType) contextElements.push(`📄 ${news.protocolType}`)
  if (news.protocolDate) contextElements.push(`📅 ${news.protocolDate}`)

  if (contextElements.length > 0) {
    blocks.push(context(contextElements))
  }

  // Notice text (truncated)
  if (news.noticeText) {
    const truncated = news.noticeText.length > 300
      ? news.noticeText.slice(0, 300) + '...'
      : news.noticeText
    blocks.push(section(truncated))
  }

  // News value indicator
  if (news.newsValue !== undefined && news.newsValue > 0) {
    const valueEmoji = news.newsValue >= 7 ? '🔴' : news.newsValue >= 4 ? '🟡' : '🟢'
    blocks.push(context([`${valueEmoji} Nyhetsvärde: ${news.newsValue}/10`]))
  }

  blocks.push(divider())

  // Action buttons
  const newsUrl = `${baseUrl}/news/${news.id}`
  blocks.push(actions([
    button('📰 Öppna i LoopDesk', { url: newsUrl, style: 'primary' }),
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
