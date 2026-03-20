interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: Array<{
    type: string
    text?: { type: string; text: string }
    url?: string
    action_id?: string
  }>
}

interface SlackResponse {
  ok: boolean
  error?: string
}

export async function sendSlackMessage(token: string, message: SlackMessage): Promise<boolean> {
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
    const data = (await res.json()) as SlackResponse
    if (!data.ok) {
      console.error(`Slack API error [${message.channel}]:`, data.error)
    }
    return data.ok
  } catch (err) {
    console.error(`Slack fetch error [${message.channel}]:`, err)
    return false
  }
}

export interface BrandNotificationData {
  brandId: string
  internalName: string
  geo: string | null
  launchDate: string | null
  mode: string | null
  conceptName: string | null
  externalNamingNames: string[]
  internalNamingName: string | null
  prPackageName: string | null
  legalLanding: boolean
  partnerLanding: boolean
  delegateToDesigners: boolean
  developmentDeadline: string | null
  constructorUrl: string
}

const CEO_COMMENT_LABELS: Record<string, string> = {
  concept: 'Концепт',
  externalNaming: 'Зовнішня назва',
  internalNaming: 'Внутрішня назва',
  marketingPackage: 'PR пакет',
  deliverables: 'Deliverables',
  visualComponents: 'Візуальні компоненти',
  general: 'Загальний коментар',
}

function field(label: string, value: string | null | undefined): string {
  return value ? `*${label}:* ${value}` : ''
}

function boolField(label: string, value: boolean): string {
  return `*${label}:* ${value ? 'Так' : 'Ні'}`
}

function buildBlocks(lines: string[], brandId: string, constructorUrl: string): SlackBlock[] {
  const filtered = lines.filter(Boolean)
  const text = filtered.join('\n')
  const linkUrl = `${constructorUrl}/constructor/brand/${brandId}`

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Відкрити бриф' },
          url: linkUrl,
          action_id: 'open_brand_brief',
        },
      ],
    },
  ]
}

// --- Approved: team-specific messages (existing) ---

export function buildStrategyMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:white_check_mark: Бренд затверджено: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Режим', data.mode),
    field('Концепт', data.conceptName),
    data.externalNamingNames.length > 0
      ? field('Зовнішній неймінг', data.externalNamingNames.join(', '))
      : '',
    field('Внутрішній неймінг', data.internalNamingName),
  ]

  return {
    channel,
    text: `Бренд затверджено: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildPrMarketingMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:white_check_mark: Бренд затверджено: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('PR-пакет', data.prPackageName),
  ]

  return {
    channel,
    text: `Бренд затверджено: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildProductDesignMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:white_check_mark: Бренд затверджено: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Режим', data.mode),
    boolField('Legal Landing', data.legalLanding),
    boolField('Partner Landing', data.partnerLanding),
    boolField('Делегувати дизайнерам', data.delegateToDesigners),
    field('Дедлайн розробки', data.developmentDeadline),
  ]

  return {
    channel,
    text: `Бренд затверджено: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

// --- Workflow messages for bc-approvals ---

export function buildSubmittedMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:new: Новий бриф відправлено на розгляд: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Режим', data.mode),
    field('Концепт', data.conceptName),
    data.externalNamingNames.length > 0
      ? field('Зовнішній неймінг', data.externalNamingNames.join(', '))
      : '',
    field('Внутрішній неймінг', data.internalNamingName),
  ]

  return {
    channel,
    text: `Новий бриф на розгляд: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildResubmittedMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:arrows_counterclockwise: Бриф повторно відправлено на розгляд: *${data.internalName}*`
  const lines = [
    header,
    '',
    '_Бриф було доопрацьовано та повторно надіслано._',
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Режим', data.mode),
    field('Концепт', data.conceptName),
    data.externalNamingNames.length > 0
      ? field('Зовнішній неймінг', data.externalNamingNames.join(', '))
      : '',
    field('Внутрішній неймінг', data.internalNamingName),
  ]

  return {
    channel,
    text: `Бриф повторно на розгляд: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildNeedsRevisionMessage(
  channel: string,
  data: BrandNotificationData,
  ceoComments: Record<string, string>,
  resolvedCeoSelections?: Record<string, string>
): SlackMessage {
  const header = `:warning: Бриф повернуто на доопрацювання: *${data.internalName}*`
  const commentLines: string[] = []

  for (const [key, comment] of Object.entries(ceoComments)) {
    if (comment.trim()) {
      const label = CEO_COMMENT_LABELS[key] ?? key
      commentLines.push(`• *${label}:* ${comment}`)
    }
  }

  const selectionLines: string[] = []
  if (resolvedCeoSelections) {
    for (const [key, name] of Object.entries(resolvedCeoSelections)) {
      if (name.trim()) {
        const label = CEO_COMMENT_LABELS[key] ?? key
        selectionLines.push(`• *${label}:* ${name}`)
      }
    }
  }

  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    '',
    ...(commentLines.length > 0
      ? ['*Коментарі CEO:*', ...commentLines]
      : []),
    ...(selectionLines.length > 0
      ? ['', '*Альтернативи CEO:*', ...selectionLines]
      : []),
  ]

  return {
    channel,
    text: `Бриф повернуто на доопрацювання: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildApprovedWorkflowMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:white_check_mark: Бренд затверджено: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    '_Повідомлення надіслано у командні канали._',
  ]

  return {
    channel,
    text: `Бренд затверджено: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}
