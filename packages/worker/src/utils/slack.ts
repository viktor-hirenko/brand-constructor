// ---------------------------------------------------------------------------
// Slack notification renderer (declarative, section-based).
//
// Each public `build*Message` function returns a `SlackMessage` whose body is
// rendered from a flat list of `Section` records. Sections are atomic units
// (header / field / bullet / subhead / spacer / …); reusable groups live in
// the `*Fragment` composers; conditional inclusion is encapsulated inside the
// fragment (returns `[]` when the underlying data is missing).
// ---------------------------------------------------------------------------

interface SlackBlockButton {
  type: 'button'
  text: { type: 'plain_text'; text: string }
  url: string
  action_id: string
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: SlackBlockButton[]
}

interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
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

// ---------------------------------------------------------------------------
// Public types (callers in routes/brands.ts depend on these)
// ---------------------------------------------------------------------------

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

export interface BrandRowForSlack {
  id: string
  internal_name: string | null
  new_concept_brief: string | null
  new_naming_brief: string | null
  step_data: string | null
}

// ---------------------------------------------------------------------------
// Section model
// ---------------------------------------------------------------------------

type Section =
  | { kind: 'header'; emoji: string; title: string; separator: string; subject: string }
  | { kind: 'spacer' }
  | { kind: 'italic'; text: string }
  | { kind: 'subhead'; text: string }
  | { kind: 'briefDivider'; text: string }
  | { kind: 'rawLine'; text: string }
  | { kind: 'field'; label: string; value: string | null | undefined }
  | { kind: 'boolField'; label: string; value: boolean }
  | { kind: 'bullet'; indent: string; label: string; value: string }

type SectionOrSkip = Section | null | undefined

function header(emoji: string, title: string, subject: string, separator = ': '): Section {
  return { kind: 'header', emoji, title, separator, subject }
}

function spacer(): Section {
  return { kind: 'spacer' }
}

function italic(text: string): Section {
  return { kind: 'italic', text }
}

function subhead(text: string): Section {
  return { kind: 'subhead', text }
}

function briefDivider(text: string): Section {
  return { kind: 'briefDivider', text }
}

function rawLine(text: string): Section {
  return { kind: 'rawLine', text }
}

function field(label: string, value: string | null | undefined): Section {
  return { kind: 'field', label, value }
}

function boolField(label: string, value: boolean): Section {
  return { kind: 'boolField', label, value }
}

function bullet(label: string, value: string, indent = '  '): Section {
  return { kind: 'bullet', indent, label, value }
}

function optBoolField(label: string, value: unknown): Section | null {
  if (value == null) return null
  return field(label, value ? 'Так' : 'Ні')
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

function renderSection(s: Section): string {
  switch (s.kind) {
    case 'header':
      return `:${s.emoji}: ${s.title}${s.separator}*${s.subject}*`
    case 'spacer':
      return ''
    case 'italic':
      return `_${s.text}_`
    case 'subhead':
      return `*${s.text}:*`
    case 'briefDivider':
      return `*--- ${s.text} ---*`
    case 'rawLine':
      return s.text
    case 'field':
      return s.value ? `*${s.label}:* ${s.value}` : ''
    case 'boolField':
      return `*${s.label}:* ${s.value ? 'Так' : 'Ні'}`
    case 'bullet':
      return `${s.indent}• *${s.label}:* ${s.value}`
  }
}

function renderSections(sections: SectionOrSkip[]): string[] {
  const out: string[] = []
  for (const s of sections) {
    if (s == null) continue
    const line = renderSection(s)
    if (line === '') continue
    out.push(line)
  }
  return out
}

function buildMessage(
  channel: string,
  fallbackText: string,
  sections: SectionOrSkip[],
  brandId: string,
  constructorUrl: string
): SlackMessage {
  const text = renderSections(sections).join('\n')
  const linkUrl = `${constructorUrl}/constructor/brand/${brandId}`
  return {
    channel,
    text: fallbackText,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text } },
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
    ],
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Fragment composers
// ---------------------------------------------------------------------------

interface BasicsOpts {
  withMode?: boolean
}

function basicsFragment(data: BrandNotificationData, opts: BasicsOpts = {}): SectionOrSkip[] {
  return [
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Коментар замовника', data.brandBasicsComment),
    opts.withMode ? field('Режим', data.mode) : null,
  ]
}

function conceptFragment(data: BrandNotificationData): SectionOrSkip[] {
  return [
    spacer(),
    field('Концепт', data.conceptName),
    field('Коментар до концепту', data.conceptComment),
  ]
}

function externalNamingFragment(data: BrandNotificationData): SectionOrSkip[] {
  if (data.externalNamingNames.length === 0) return []
  return [
    spacer(),
    field('Зовнішній неймінг', data.externalNamingNames.join(', ')),
    field('Коментар до зовнішнього неймінгу', data.externalNamingComment),
  ]
}

function internalNamingFragment(data: BrandNotificationData): SectionOrSkip[] {
  if (!data.internalNamingName) return []
  return [
    spacer(),
    field('Внутрішній неймінг', data.internalNamingName),
    field('Коментар до внутрішнього неймінгу', data.internalNamingComment),
  ]
}

function prPackageFragment(data: BrandNotificationData): SectionOrSkip[] {
  return [
    spacer(),
    field('PR-пакет', data.prPackageName),
    field('Строки впровадження', data.prPackageTimeline),
    field('Задіяні команди', data.prPackageTeamsInvolved),
    ...(data.prPackageComponentsList
      ? [subhead('Складові пакету'), rawLine(data.prPackageComponentsList)]
      : []),
    field('Що необхідно', data.prPackageRequirements),
    field('Коментар до PR пакету', data.prPackageComment),
  ]
}

function deliverablesFragment(data: BrandNotificationData): SectionOrSkip[] {
  return [
    spacer(),
    boolField('Legal Landing', data.legalLanding),
    boolField('Partner Landing', data.partnerLanding),
    field('Дедлайн розробки', data.developmentDeadline),
    field('Коментар до Deliverables', data.deliverablesComment),
  ]
}

function visualComponentsFragment(data: BrandNotificationData): SectionOrSkip[] {
  const sections: SectionOrSkip[] = [spacer(), boolField('Делегувати дизайнерам', data.delegateToDesigners)]
  if (!data.delegateToDesigners && data.resolvedComponents.length > 0) {
    sections.push(subhead('Візуальні компоненти'))
    for (const comp of data.resolvedComponents) {
      sections.push(bullet(comp.typeName, comp.variantName))
    }
  }
  sections.push(field('Коментар до Visual Components', data.componentsComment))
  return sections
}

function ceoCommentsFragment(data: BrandNotificationData): SectionOrSkip[] {
  if (!data.ceoComments) return []
  const bullets: Section[] = []
  for (const [key, comment] of Object.entries(data.ceoComments)) {
    if (comment.trim()) {
      bullets.push(bullet(CEO_COMMENT_LABELS[key] ?? key, comment))
    }
  }
  if (bullets.length === 0) return []
  return [spacer(), subhead('Коментарі CEO'), ...bullets]
}

function commentMapFragment(
  title: string,
  entries: Record<string, string> | undefined,
  indent: string
): SectionOrSkip[] {
  if (!entries) return []
  const bullets: Section[] = []
  for (const [key, comment] of Object.entries(entries)) {
    if (comment.trim()) {
      bullets.push(bullet(CEO_COMMENT_LABELS[key] ?? key, comment, indent))
    }
  }
  if (bullets.length === 0) return []
  return [subhead(title), ...bullets]
}

function conceptBriefFragment(brief: Record<string, unknown> | null): SectionOrSkip[] {
  if (!brief) return []
  const zones = brief.domainZones as string[] | undefined
  return [
    spacer(),
    briefDivider('Бриф нового концепту'),
    optBoolField('Нове ГЕО', brief.isNewGeo),
    field('Інфо про ГЕО', brief.geoInfo as string),
    optBoolField('Потрібен Brand Research GEO', brief.needsGeoResearch),
    field('Що не підійшло', brief.conceptFeedback as string),
    field('Інфо від трафік-команди', brief.trafficTeamInfo as string),
    field('Конкуренти', brief.competitors as string),
    brief.keepProductConnection == null
      ? null
      : field(
          "Зв'язок з іншими продуктами",
          brief.keepProductConnection
            ? `Так${brief.connectedProducts ? ` (${brief.connectedProducts})` : ''}`
            : 'Ні'
        ),
    field('Мова назви', brief.namingLanguage as string),
    field('Бажані слова в назві', brief.desiredWordsInName as string),
    zones && zones.length > 0 ? field('Доменні зони', zones.join(', ')) : null,
    field('Бюджет домена', brief.domainBudget != null ? `$${brief.domainBudget}` : null),
    field('Дедлайн', brief.namingDeadline as string),
    field('Додаткова інфо по ГЕО', brief.additionalGeoInfo as string),
  ]
}

function namingBriefFragment(brief: Record<string, unknown> | null): SectionOrSkip[] {
  if (!brief) return []
  const zones = brief.domainZones as string[] | undefined
  return [
    spacer(),
    briefDivider('Бриф нового External Naming'),
    optBoolField('Нове ГЕО', brief.isNewGeo),
    field('Що не підійшло', brief.namingFeedback as string),
    field('Інфо від трафік-команди', brief.trafficTeamInfo as string),
    optBoolField('Потрібен Brand Research GEO', brief.needsGeoResearch),
    field('Конкуренти', brief.competitors as string),
    field('Мова назви', brief.namingLanguage as string),
    field('Бажані слова в назві', brief.desiredWordsInName as string),
    zones && zones.length > 0 ? field('Доменні зони', zones.join(', ')) : null,
    field('Слова яких уникнути', brief.wordsToAvoid as string),
    field('Бюджет домена', brief.domainBudget != null ? `$${brief.domainBudget}` : null),
    field('Дедлайн', brief.namingDeadline as string),
    field('Додаткова інфо по ГЕО', brief.additionalGeoInfo as string),
  ]
}

function internalNamingBriefFragment(stepData: Record<string, unknown> | null): SectionOrSkip[] {
  const intNaming = stepData?.internalNaming as Record<string, unknown> | undefined
  const feedback = intNaming?.newNamingFeedback
  if (!feedback) return []
  return [
    spacer(),
    briefDivider('Бриф нового Internal Naming'),
    field('Що не підійшло', feedback as string),
  ]
}

function submissionSummaryFragment(data: BrandNotificationData): SectionOrSkip[] {
  return [
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    field('Режим', data.mode),
    field('Концепт', data.conceptName),
    data.externalNamingNames.length > 0
      ? field('Зовнішній неймінг', data.externalNamingNames.join(', '))
      : null,
    field('Внутрішній неймінг', data.internalNamingName),
  ]
}

// ---------------------------------------------------------------------------
// Approved: per-team messages
// ---------------------------------------------------------------------------

export function buildStrategyMessage(channel: string, data: BrandNotificationData): SlackMessage {
  return buildMessage(
    channel,
    `Бренд затверджено: ${data.internalName}`,
    [
      header('white_check_mark', 'Бренд затверджено', data.internalName),
      spacer(),
      ...basicsFragment(data, { withMode: true }),
      ...conceptFragment(data),
      ...externalNamingFragment(data),
      ...internalNamingFragment(data),
      ...ceoCommentsFragment(data),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildPrMarketingMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Бренд затверджено: ${data.internalName}`,
    [
      header('white_check_mark', 'Бренд затверджено', data.internalName),
      spacer(),
      ...basicsFragment(data),
      ...prPackageFragment(data),
      ...ceoCommentsFragment(data),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildProductDesignMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Бренд затверджено: ${data.internalName}`,
    [
      header('white_check_mark', 'Бренд затверджено', data.internalName),
      spacer(),
      ...basicsFragment(data, { withMode: true }),
      ...deliverablesFragment(data),
      ...visualComponentsFragment(data),
      ...ceoCommentsFragment(data),
    ],
    data.brandId,
    data.constructorUrl
  )
}

// ---------------------------------------------------------------------------
// Workflow messages (bc-approvals channel)
// ---------------------------------------------------------------------------

export function buildSubmittedMessage(channel: string, data: BrandNotificationData): SlackMessage {
  return buildMessage(
    channel,
    `Новий бриф на розгляд: ${data.internalName}`,
    [
      header('new', 'Новий бриф відправлено на розгляд', data.internalName),
      spacer(),
      ...submissionSummaryFragment(data),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildResubmittedMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Бриф повторно на розгляд: ${data.internalName}`,
    [
      header('arrows_counterclockwise', 'Бриф повторно відправлено на розгляд', data.internalName),
      spacer(),
      italic('Бриф було доопрацьовано та повторно надіслано.'),
      spacer(),
      ...submissionSummaryFragment(data),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildNeedsRevisionMessage(
  channel: string,
  data: BrandNotificationData,
  ceoComments: Record<string, string>,
  resolvedCeoSelections?: Record<string, string>
): SlackMessage {
  const commentSections = commentMapFragment('Коментарі CEO', ceoComments, '')
  const selectionSections = commentMapFragment('Альтернативи CEO', resolvedCeoSelections, '')

  return buildMessage(
    channel,
    `Бриф повернуто на доопрацювання: ${data.internalName}`,
    [
      header('warning', 'Бриф повернуто на доопрацювання', data.internalName),
      spacer(),
      field('GEO', data.geo),
      field('Дата запуску', data.launchDate),
      spacer(),
      ...commentSections,
      ...(selectionSections.length > 0 ? [spacer(), ...selectionSections] : []),
    ],
    data.brandId,
    data.constructorUrl
  )
}

// ---------------------------------------------------------------------------
// Scenario B: submitted brand carries new briefs (CEO bypassed)
// ---------------------------------------------------------------------------

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

  return buildMessage(
    channel,
    `Бриф відправлено в роботу: ${data.internalName}`,
    [
      header('rocket', 'Бриф відправлено в роботу', data.internalName),
      spacer(),
      field('GEO', data.geo),
      field('Дата запуску', data.launchDate),
      field('Нові замовлення', orderItems.join(', ')),
      spacer(),
      italic('Бриф містить нові замовлення. CEO-ревью не потрібне.'),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildNewBriefsStrategyMessage(
  channel: string,
  data: BrandNotificationData,
  brand: BrandRowForSlack
): SlackMessage {
  const conceptBrief = parseJson<Record<string, unknown>>(brand.new_concept_brief)
  const namingBrief = parseJson<Record<string, unknown>>(brand.new_naming_brief)
  const stepData = parseJson<Record<string, unknown>>(brand.step_data)

  return buildMessage(
    channel,
    `Нове замовлення: ${data.internalName}`,
    [
      header('memo', 'Нове замовлення для', data.internalName, ' '),
      spacer(),
      ...basicsFragment(data, { withMode: true }),
      ...(data.conceptName ? conceptFragment(data) : []),
      ...conceptBriefFragment(conceptBrief),
      ...externalNamingFragment(data),
      ...namingBriefFragment(namingBrief),
      ...internalNamingFragment(data),
      ...internalNamingBriefFragment(stepData),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildNewBriefsPrMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Новий бриф в роботу: ${data.internalName}`,
    [
      header('memo', 'Новий бриф відправлено в роботу', data.internalName),
      spacer(),
      ...basicsFragment(data),
      ...prPackageFragment(data),
      spacer(),
      italic('Бриф містить нові замовлення (не з бібліотеки).'),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildNewBriefsDesignMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Новий бриф в роботу: ${data.internalName}`,
    [
      header('memo', 'Новий бриф відправлено в роботу', data.internalName),
      spacer(),
      ...basicsFragment(data, { withMode: true }),
      ...deliverablesFragment(data),
      ...visualComponentsFragment(data),
      spacer(),
      italic('Бриф містить нові замовлення (не з бібліотеки).'),
    ],
    data.brandId,
    data.constructorUrl
  )
}

export function buildApprovedWorkflowMessage(
  channel: string,
  data: BrandNotificationData
): SlackMessage {
  return buildMessage(
    channel,
    `Бренд затверджено: ${data.internalName}`,
    [
      header('white_check_mark', 'Бренд затверджено', data.internalName),
      spacer(),
      field('GEO', data.geo),
      field('Дата запуску', data.launchDate),
      italic('Повідомлення надіслано у командні канали.'),
    ],
    data.brandId,
    data.constructorUrl
  )
}
