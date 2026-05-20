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

export interface ResolvedComponent {
  typeName: string
  variantName: string
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

  brandBasicsComment: string | null
  conceptComment: string | null
  externalNamingComment: string | null
  internalNamingComment: string | null
  prPackageComment: string | null
  deliverablesComment: string | null
  componentsComment: string | null

  resolvedComponents: ResolvedComponent[]

  ceoComments: Record<string, string> | null

  prPackageTimeline: string | null
  prPackageTeamsInvolved: string | null
  prPackageComponentsList: string | null
  prPackageRequirements: string | null
}

export const CEO_COMMENT_LABELS: Record<string, string> = {
  basics: 'Основна інформація',
  concept: 'Концепт',
  externalNaming: 'Зовнішня назва',
  internalNaming: 'Внутрішня назва',
  marketingPackage: 'PR пакет',
  deliverables: 'Deliverables',
  visualComponents: 'Візуальні компоненти',
  general: 'Загальний коментар',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function appendCeoComments(lines: string[], data: BrandNotificationData): void {
  if (!data.ceoComments) return
  const entries: string[] = []
  for (const [key, comment] of Object.entries(data.ceoComments)) {
    if (comment.trim()) {
      const label = CEO_COMMENT_LABELS[key] ?? key
      entries.push(`  • *${label}:* ${comment}`)
    }
  }
  if (entries.length > 0) {
    lines.push('', '*Коментарі CEO:*', ...entries)
  }
}

// ---------------------------------------------------------------------------
// Approved: team-specific messages
// ---------------------------------------------------------------------------

export function buildStrategyMessage(channel: string, data: BrandNotificationData): SlackMessage {
  const header = `:white_check_mark: Бренд затверджено: *${data.internalName}*`
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))

  // — Режим
  lines.push(field('Режим', data.mode))

  // — Концепт
  lines.push('')
  lines.push(field('Концепт', data.conceptName))
  if (data.conceptComment) lines.push(field('Коментар до концепту', data.conceptComment))

  // — Зовнішній неймінг
  if (data.externalNamingNames.length > 0) {
    lines.push('')
    lines.push(field('Зовнішній неймінг', data.externalNamingNames.join(', ')))
    if (data.externalNamingComment)
      lines.push(field('Коментар до зовнішнього неймінгу', data.externalNamingComment))
  }

  // — Внутрішній неймінг
  if (data.internalNamingName) {
    lines.push('')
    lines.push(field('Внутрішній неймінг', data.internalNamingName))
    if (data.internalNamingComment)
      lines.push(field('Коментар до внутрішнього неймінгу', data.internalNamingComment))
  }

  // — Коментарі CEO
  appendCeoComments(lines, data)

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
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))

  // — PR пакет
  lines.push('')
  lines.push(field('PR-пакет', data.prPackageName))
  if (data.prPackageTimeline) lines.push(field('Строки впровадження', data.prPackageTimeline))
  if (data.prPackageTeamsInvolved)
    lines.push(field('Задіяні команди', data.prPackageTeamsInvolved))
  if (data.prPackageComponentsList) {
    lines.push('*Складові пакету:*')
    lines.push(data.prPackageComponentsList)
  }
  if (data.prPackageRequirements) lines.push(field('Що необхідно', data.prPackageRequirements))
  if (data.prPackageComment) lines.push(field('Коментар до PR пакету', data.prPackageComment))

  // — Коментарі CEO
  appendCeoComments(lines, data)

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
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))

  // — Режим
  lines.push(field('Режим', data.mode))

  // — Deliverables
  lines.push('')
  lines.push(boolField('Legal Landing', data.legalLanding))
  lines.push(boolField('Partner Landing', data.partnerLanding))
  lines.push(field('Дедлайн розробки', data.developmentDeadline))
  if (data.deliverablesComment)
    lines.push(field('Коментар до Deliverables', data.deliverablesComment))

  // — Візуальні компоненти
  lines.push('')
  lines.push(boolField('Делегувати дизайнерам', data.delegateToDesigners))
  if (!data.delegateToDesigners && data.resolvedComponents.length > 0) {
    lines.push('*Візуальні компоненти:*')
    for (const comp of data.resolvedComponents) {
      lines.push(`  • *${comp.typeName}:* ${comp.variantName}`)
    }
  }
  if (data.componentsComment)
    lines.push(field('Коментар до Visual Components', data.componentsComment))

  // — Коментарі CEO
  appendCeoComments(lines, data)

  return {
    channel,
    text: `Бренд затверджено: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

// ---------------------------------------------------------------------------
// Workflow messages for bc-approvals
// ---------------------------------------------------------------------------

export function buildSubmittedMessage(channel: string, data: BrandNotificationData): SlackMessage {
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
    ...(commentLines.length > 0 ? ['*Коментарі CEO:*', ...commentLines] : []),
    ...(selectionLines.length > 0 ? ['', '*Альтернативи CEO:*', ...selectionLines] : []),
  ]

  return {
    channel,
    text: `Бриф повернуто на доопрацювання: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

// ---------------------------------------------------------------------------
// Scenario B: submitted with new briefs (CEO not involved)
// ---------------------------------------------------------------------------

export interface BrandRowForSlack {
  id: string
  internal_name: string | null
  new_concept_brief: string | null
  new_naming_brief: string | null
  step_data: string | null
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function buildNewBriefsApprovalMessage(
  channel: string,
  data: BrandNotificationData,
  brand: BrandRowForSlack
): SlackMessage {
  const conceptBrief = parseJson<Record<string, unknown>>(brand.new_concept_brief)
  const namingBrief = parseJson<Record<string, unknown>>(brand.new_naming_brief)

  const orderItems: string[] = []
  if (conceptBrief) orderItems.push('новий концепт')
  if (namingBrief) orderItems.push('новий external naming')

  const header = `:rocket: Бриф відправлено в роботу: *${data.internalName}*`
  const lines = [
    header,
    '',
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Нові замовлення', orderItems.join(', ')),
    '',
    '_Бриф містить нові замовлення. CEO-ревью не потрібне._',
  ]

  return {
    channel,
    text: `Бриф відправлено в роботу: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildNewBriefsStrategyMessage(
  channel: string,
  data: BrandNotificationData,
  brand: BrandRowForSlack
): SlackMessage {
  const conceptBrief = parseJson<Record<string, unknown>>(brand.new_concept_brief)
  const namingBrief = parseJson<Record<string, unknown>>(brand.new_naming_brief)

  const header = `:memo: Нове замовлення для *${data.internalName}*`
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))
  lines.push(field('Режим', data.mode))

  // — Концепт (обраний або бриф нового)
  if (data.conceptName) {
    lines.push('')
    lines.push(field('Концепт', data.conceptName))
    if (data.conceptComment) lines.push(field('Коментар до концепту', data.conceptComment))
  }

  if (conceptBrief) {
    lines.push('', '*--- Бриф нового концепту ---*')
    if (conceptBrief.isNewGeo != null)
      lines.push(field('Нове ГЕО', conceptBrief.isNewGeo ? 'Так' : 'Ні'))
    lines.push(field('Інфо про ГЕО', conceptBrief.geoInfo as string))
    if (conceptBrief.needsGeoResearch != null)
      lines.push(
        field('Потрібен Brand Research GEO', conceptBrief.needsGeoResearch ? 'Так' : 'Ні')
      )
    lines.push(field('Що не підійшло', conceptBrief.conceptFeedback as string))
    lines.push(field('Інфо від трафік-команди', conceptBrief.trafficTeamInfo as string))
    lines.push(field('Конкуренти', conceptBrief.competitors as string))
    if (conceptBrief.keepProductConnection != null)
      lines.push(
        field(
          "Зв'язок з іншими продуктами",
          conceptBrief.keepProductConnection
            ? `Так${conceptBrief.connectedProducts ? ` (${conceptBrief.connectedProducts})` : ''}`
            : 'Ні'
        )
      )
    lines.push(field('Мова назви', conceptBrief.namingLanguage as string))
    lines.push(field('Бажані слова в назві', conceptBrief.desiredWordsInName as string))
    const zones = conceptBrief.domainZones as string[] | undefined
    if (zones && zones.length > 0) lines.push(field('Доменні зони', zones.join(', ')))
    lines.push(
      field(
        'Бюджет домена',
        conceptBrief.domainBudget != null ? `$${conceptBrief.domainBudget}` : null
      )
    )
    lines.push(field('Дедлайн', conceptBrief.namingDeadline as string))
    lines.push(field('Додаткова інфо по ГЕО', conceptBrief.additionalGeoInfo as string))
  }

  // — Зовнішній неймінг (обраний або бриф нового)
  if (data.externalNamingNames.length > 0) {
    lines.push('')
    lines.push(field('Зовнішній неймінг', data.externalNamingNames.join(', ')))
    if (data.externalNamingComment)
      lines.push(field('Коментар до зовнішнього неймінгу', data.externalNamingComment))
  }

  if (namingBrief) {
    lines.push('', '*--- Бриф нового External Naming ---*')
    if (namingBrief.isNewGeo != null)
      lines.push(field('Нове ГЕО', namingBrief.isNewGeo ? 'Так' : 'Ні'))
    lines.push(field('Що не підійшло', namingBrief.namingFeedback as string))
    lines.push(field('Інфо від трафік-команди', namingBrief.trafficTeamInfo as string))
    if (namingBrief.needsGeoResearch != null)
      lines.push(
        field('Потрібен Brand Research GEO', namingBrief.needsGeoResearch ? 'Так' : 'Ні')
      )
    lines.push(
      field('Конкуренти', (namingBrief as Record<string, unknown>).competitors as string)
    )
    lines.push(field('Мова назви', namingBrief.namingLanguage as string))
    lines.push(field('Бажані слова в назві', namingBrief.desiredWordsInName as string))
    const namingZones = namingBrief.domainZones as string[] | undefined
    if (namingZones && namingZones.length > 0)
      lines.push(field('Доменні зони', namingZones.join(', ')))
    lines.push(field('Слова яких уникнути', namingBrief.wordsToAvoid as string))
    lines.push(
      field(
        'Бюджет домена',
        namingBrief.domainBudget != null ? `$${namingBrief.domainBudget}` : null
      )
    )
    lines.push(field('Дедлайн', namingBrief.namingDeadline as string))
    lines.push(field('Додаткова інфо по ГЕО', namingBrief.additionalGeoInfo as string))
  }

  // — Внутрішній неймінг
  if (data.internalNamingName) {
    lines.push('')
    lines.push(field('Внутрішній неймінг', data.internalNamingName))
    if (data.internalNamingComment)
      lines.push(field('Коментар до внутрішнього неймінгу', data.internalNamingComment))
  }

  const stepData = parseJson<Record<string, unknown>>(brand.step_data)
  const intNaming = stepData?.internalNaming as Record<string, unknown> | undefined
  if (intNaming?.newNamingFeedback) {
    lines.push('', '*--- Бриф нового Internal Naming ---*')
    lines.push(field('Що не підійшло', intNaming.newNamingFeedback as string))
  }

  return {
    channel,
    text: `Нове замовлення: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildNewBriefsPrMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:memo: Новий бриф відправлено в роботу: *${data.internalName}*`
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))

  // — PR пакет
  lines.push('')
  lines.push(field('PR-пакет', data.prPackageName))
  if (data.prPackageTimeline) lines.push(field('Строки впровадження', data.prPackageTimeline))
  if (data.prPackageTeamsInvolved)
    lines.push(field('Задіяні команди', data.prPackageTeamsInvolved))
  if (data.prPackageComponentsList) {
    lines.push('*Складові пакету:*')
    lines.push(data.prPackageComponentsList)
  }
  if (data.prPackageRequirements) lines.push(field('Що необхідно', data.prPackageRequirements))
  if (data.prPackageComment) lines.push(field('Коментар до PR пакету', data.prPackageComment))

  lines.push('', '_Бриф містить нові замовлення (не з бібліотеки)._')

  return {
    channel,
    text: `Новий бриф в роботу: ${data.internalName}`,
    blocks: buildBlocks(lines, data.brandId, data.constructorUrl),
  }
}

export function buildNewBriefsDesignMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  const header = `:memo: Новий бриф відправлено в роботу: *${data.internalName}*`
  const lines = [header, '']

  // — Основна інформація
  lines.push(field('GEO', data.geo))
  lines.push(field('Дата запуску', data.launchDate))
  if (data.brandBasicsComment) lines.push(field('Коментар замовника', data.brandBasicsComment))

  // — Режим
  lines.push(field('Режим', data.mode))

  // — Deliverables
  lines.push('')
  lines.push(boolField('Legal Landing', data.legalLanding))
  lines.push(boolField('Partner Landing', data.partnerLanding))
  lines.push(field('Дедлайн розробки', data.developmentDeadline))
  if (data.deliverablesComment)
    lines.push(field('Коментар до Deliverables', data.deliverablesComment))

  // — Візуальні компоненти
  lines.push('')
  lines.push(boolField('Делегувати дизайнерам', data.delegateToDesigners))
  if (!data.delegateToDesigners && data.resolvedComponents.length > 0) {
    lines.push('*Візуальні компоненти:*')
    for (const comp of data.resolvedComponents) {
      lines.push(`  • *${comp.typeName}:* ${comp.variantName}`)
    }
  }
  if (data.componentsComment)
    lines.push(field('Коментар до Visual Components', data.componentsComment))

  lines.push('', '_Бриф містить нові замовлення (не з бібліотеки)._')

  return {
    channel,
    text: `Новий бриф в роботу: ${data.internalName}`,
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
