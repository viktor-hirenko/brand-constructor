// ---------------------------------------------------------------------------
// Slack notification renderer (declarative, section-based).
//
// PO comments and CEO comments are rendered inline within each section (same
// order as the constructor review UI). Only the general CEO comment appears
// as a trailing block. Section order is fixed — never Object.entries on CEO keys.
// ---------------------------------------------------------------------------

import {
  ORDER_SECTION_TITLES,
  conceptOrderAnswers,
  internalOrderAnswers,
  namingOrderAnswers,
  type OrderAnswer,
} from '@brand-constructor/shared'

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

export interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  /** Posts the message as a reply in the thread of this message `ts`. */
  thread_ts?: string
}

interface SlackResponse {
  ok: boolean
  error?: string
  ts?: string
  channel?: string
}

/**
 * Outcome of one `chat.postMessage`. `ts` + `channel` identify the posted
 * message (the order message in bc-strategy is answered in its thread later);
 * `error` is Slack's code or the network failure, kept for the History event.
 */
export interface SlackSendResult {
  ok: boolean
  ts: string | null
  channel: string
  error: string | null
}

export async function sendSlackMessage(
  token: string,
  message: SlackMessage
): Promise<SlackSendResult> {
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
    return {
      ok: data.ok,
      ts: data.ts ?? null,
      channel: data.channel ?? message.channel,
      error: data.ok ? null : (data.error ?? 'unknown_error'),
    }
  } catch (err) {
    console.error(`Slack fetch error [${message.channel}]:`, err)
    return {
      ok: false,
      ts: null,
      channel: message.channel,
      error: err instanceof Error ? err.message : String(err),
    }
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
  /** Admin origin; brief buttons open `/workspace/brand/<id>` there (`brandBriefUrl`). */
  adminUrl: string

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

  jiraInitiativeKey?: string | null
  jiraInitiativeUrl?: string | null
}

/** Stable section order (matches constructor Step 10 review). */
export const CEO_SECTION_KEYS = [
  'basics',
  'concept',
  'externalNaming',
  'internalNaming',
  'marketingPackage',
  'deliverables',
  'visualComponents',
  'general',
] as const

export type CeoSectionKey = (typeof CEO_SECTION_KEYS)[number]

export const CEO_COMMENT_LABELS: Record<CeoSectionKey, string> = {
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

interface FragmentOpts {
  /** Inline CEO comment after PO comment in the same section (approved team messages). */
  includeCeoComments?: boolean
}

interface BasicsOpts extends FragmentOpts {
  withMode?: boolean
}

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

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function getCeoComment(
  comments: Record<string, string> | null | undefined,
  key: CeoSectionKey
): string | null {
  const text = comments?.[key]?.trim()
  return text || null
}

function poCommentField(comment: string | null | undefined): SectionOrSkip {
  return field('Коментар замовника', comment)
}

function ceoCommentField(
  comments: Record<string, string> | null | undefined,
  key: Exclude<CeoSectionKey, 'general'>
): SectionOrSkip {
  return field('Коментар CEO', getCeoComment(comments, key))
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

function jiraInitiativeFragment(data: BrandNotificationData): SectionOrSkip[] {
  if (!data.jiraInitiativeUrl || !data.jiraInitiativeKey) return []
  return [
    spacer(),
    field(
      'Jira Initiative',
      `<${data.jiraInitiativeUrl}|${data.jiraInitiativeKey}>`
    ),
  ]
}

/**
 * The brief inside the Admin. The old standalone wizard (`CONSTRUCTOR_URL`) is
 * a stale deploy (STATE OPEN-16) and its links opened an outdated site (H-12).
 */
export function brandBriefUrl(adminUrl: string, brandId: string): string {
  return `${adminUrl.replace(/\/+$/, '')}/workspace/brand/${brandId}`
}

/**
 * The order page in the Admin (phase 2a). The Strategy team cannot open a
 * brief that is not approved; the order page shows them what they need.
 */
export function orderPageUrl(adminUrl: string, brandId: string): string {
  return `${adminUrl.replace(/\/+$/, '')}/orders/${brandId}`
}

/** Slack refuses a section whose text is over 3000 characters, and a message over 50 blocks. */
export const SLACK_SECTION_TEXT_LIMIT = 3000
export const SLACK_MAX_BLOCKS = 50
export const SLACK_TRUNCATED_NOTE = '… повний текст у брифі'

function truncateLine(line: string, limit: number): string {
  if (line.length <= limit) return line
  return `${line.slice(0, limit - SLACK_TRUNCATED_NOTE.length - 1).trimEnd()} ${SLACK_TRUNCATED_NOTE}`
}

/**
 * Packs rendered lines into section texts that each fit Slack's limit (H-17:
 * a 5000-character comment made the whole message bounce, and nobody saw it).
 * Lines are never split across sections; a single over-long line is cut with
 * a pointer to the brief. Past `maxSections`, the rest is replaced by the same
 * pointer.
 */
export function packSectionTexts(
  lines: string[],
  limit = SLACK_SECTION_TEXT_LIMIT,
  maxSections = SLACK_MAX_BLOCKS - 1
): string[] {
  const sections: string[] = []
  let current = ''
  for (const raw of lines) {
    const line = truncateLine(raw, limit)
    const next = current ? `${current}\n${line}` : line
    if (next.length <= limit) {
      current = next
      continue
    }
    sections.push(current)
    current = line
  }
  if (current) sections.push(current)
  if (sections.length > maxSections) {
    return [...sections.slice(0, maxSections - 1), SLACK_TRUNCATED_NOTE]
  }
  return sections
}

interface BuildMessageOpts {
  /** False hides «Відкрити бриф» — for channels whose readers cannot open the brief yet. */
  briefButton?: boolean
  /** Where «Відкрити бриф» leads instead of the brief itself. */
  briefButtonUrl?: string
}

function buildMessage(
  channel: string,
  fallbackText: string,
  sections: SectionOrSkip[],
  data: BrandNotificationData,
  opts: BuildMessageOpts = {}
): SlackMessage {
  const texts = packSectionTexts(renderSections(sections))
  const elements: SlackBlockButton[] = []
  if (opts.briefButton !== false) {
    elements.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Відкрити бриф' },
      url: opts.briefButtonUrl ?? brandBriefUrl(data.adminUrl, data.brandId),
      action_id: 'open_brand_brief',
    })
  }
  if (data.jiraInitiativeUrl && data.jiraInitiativeKey) {
    elements.push({
      type: 'button',
      text: { type: 'plain_text', text: `Jira ${data.jiraInitiativeKey}` },
      url: data.jiraInitiativeUrl,
      action_id: 'open_jira_initiative',
    })
  }
  const blocks: SlackBlock[] = texts.map(text => ({ type: 'section', text: { type: 'mrkdwn', text } }))
  // An `actions` block with no buttons is rejected by Slack.
  if (elements.length > 0) blocks.push({ type: 'actions', elements })
  return { channel, text: fallbackText, blocks }
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

function basicsFragment(data: BrandNotificationData, opts: BasicsOpts = {}): SectionOrSkip[] {
  const sections: SectionOrSkip[] = [
    field('GEO', data.geo),
    field('Дата запуску', data.launchDate),
    poCommentField(data.brandBasicsComment),
  ]
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'basics'))
  }
  if (opts.withMode) {
    sections.push(field('Режим', data.mode))
  }
  return sections
}

function conceptFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const hasContent =
    data.conceptName ||
    hasText(data.conceptComment) ||
    (opts.includeCeoComments && getCeoComment(data.ceoComments, 'concept'))
  if (!hasContent) return []

  const sections: SectionOrSkip[] = [spacer(), field('Концепт', data.conceptName)]
  sections.push(poCommentField(data.conceptComment))
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'concept'))
  }
  return sections
}

function externalNamingFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const names = data.externalNamingNames.join(', ')
  const hasContent =
    names ||
    hasText(data.externalNamingComment) ||
    (opts.includeCeoComments && getCeoComment(data.ceoComments, 'externalNaming'))
  if (!hasContent) return []

  const sections: SectionOrSkip[] = [spacer()]
  if (names) sections.push(field('Зовнішній неймінг', names))
  sections.push(poCommentField(data.externalNamingComment))
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'externalNaming'))
  }
  return sections
}

function internalNamingFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const hasContent =
    data.internalNamingName ||
    hasText(data.internalNamingComment) ||
    (opts.includeCeoComments && getCeoComment(data.ceoComments, 'internalNaming'))
  if (!hasContent) return []

  const sections: SectionOrSkip[] = [spacer(), field('Внутрішній неймінг', data.internalNamingName)]
  sections.push(poCommentField(data.internalNamingComment))
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'internalNaming'))
  }
  return sections
}

function prPackageFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const hasContent =
    data.prPackageName ||
    data.prPackageTimeline ||
    data.prPackageTeamsInvolved ||
    data.prPackageComponentsList ||
    data.prPackageRequirements ||
    hasText(data.prPackageComment) ||
    (opts.includeCeoComments && getCeoComment(data.ceoComments, 'marketingPackage'))
  if (!hasContent) return []

  const sections: SectionOrSkip[] = [
    spacer(),
    field('PR-пакет', data.prPackageName),
    field('Строки впровадження', data.prPackageTimeline),
    field('Задіяні команди', data.prPackageTeamsInvolved),
    ...(data.prPackageComponentsList
      ? [subhead('Складові пакету'), rawLine(data.prPackageComponentsList)]
      : []),
    field('Що необхідно', data.prPackageRequirements),
    poCommentField(data.prPackageComment),
  ]
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'marketingPackage'))
  }
  return sections
}

function deliverablesFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const sections: SectionOrSkip[] = [
    spacer(),
    boolField('Legal Landing', data.legalLanding),
    boolField('Partner Landing', data.partnerLanding),
    field('Дедлайн розробки', data.developmentDeadline),
    poCommentField(data.deliverablesComment),
  ]
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'deliverables'))
  }
  return sections
}

function visualComponentsFragment(data: BrandNotificationData, opts: FragmentOpts = {}): SectionOrSkip[] {
  const sections: SectionOrSkip[] = [spacer(), boolField('Делегувати дизайнерам', data.delegateToDesigners)]
  if (!data.delegateToDesigners && data.resolvedComponents.length > 0) {
    sections.push(subhead('Візуальні компоненти'))
    for (const comp of data.resolvedComponents) {
      sections.push(bullet(comp.typeName, comp.variantName))
    }
  }
  sections.push(poCommentField(data.componentsComment))
  if (opts.includeCeoComments) {
    sections.push(ceoCommentField(data.ceoComments, 'visualComponents'))
  }
  return sections
}

/** Trailing block for CEO general comment only (never mixed into section lists). */
function generalCeoCommentFragment(data: BrandNotificationData): SectionOrSkip[] {
  const general = getCeoComment(data.ceoComments, 'general')
  if (!general) return []
  return [spacer(), subhead('Загальний коментар CEO'), rawLine(general)]
}

function formatDeliverablesSummary(data: BrandNotificationData): string {
  const parts = [
    `Legal Landing: ${data.legalLanding ? 'Так' : 'Ні'}`,
    `Partner Landing: ${data.partnerLanding ? 'Так' : 'Ні'}`,
  ]
  if (data.developmentDeadline) {
    parts.push(`Дедлайн: ${data.developmentDeadline}`)
  }
  return parts.join('; ')
}

function formatVisualComponentsSummary(data: BrandNotificationData): string | null {
  if (data.delegateToDesigners) return 'Делеговано дизайнерам'
  if (data.resolvedComponents.length === 0) return null
  return data.resolvedComponents.map(c => `${c.typeName}: ${c.variantName}`).join('; ')
}

interface RevisionSectionInput {
  title: string
  selectedValue?: string | null
  ceoComment?: string | null
  ceoAlternative?: string | null
}

function needsRevisionSectionFragment(input: RevisionSectionInput): SectionOrSkip[] {
  const comment = input.ceoComment?.trim()
  const alternative = input.ceoAlternative?.trim()
  const selected = input.selectedValue?.trim()
  if (!comment && !alternative) return []

  const sections: SectionOrSkip[] = [spacer(), briefDivider(input.title)]
  if (selected) sections.push(field('Обрано', selected))
  if (comment) sections.push(field('Коментар CEO', comment))
  if (alternative) sections.push(field('Альтернатива CEO', alternative))
  return sections
}

// The order answers come from shared `orderAnswers` — the Orders page of the
// Admin shows the very same lines.
function orderFragment(title: string, answers: OrderAnswer[]): SectionOrSkip[] {
  return [spacer(), briefDivider(title), ...answers.map(a => field(a.label, a.value))]
}

function conceptBriefFragment(brief: Record<string, unknown> | null): SectionOrSkip[] {
  if (!brief) return []
  return orderFragment(ORDER_SECTION_TITLES.concept, conceptOrderAnswers(brief))
}

function namingBriefFragment(brief: Record<string, unknown> | null): SectionOrSkip[] {
  if (!brief) return []
  return orderFragment(ORDER_SECTION_TITLES.externalNaming, namingOrderAnswers(brief))
}

function internalNamingBriefFragment(stepData: Record<string, unknown> | null): SectionOrSkip[] {
  const intNaming = stepData?.internalNaming as Record<string, unknown> | undefined
  const feedback = intNaming?.newNamingFeedback
  if (!feedback) return []
  return orderFragment(ORDER_SECTION_TITLES.internalNaming, internalOrderAnswers(feedback))
}

/** Full brief overview for CEO review (submitted / resubmitted) — PO comments inline per section. */
function submissionReviewFragment(data: BrandNotificationData): SectionOrSkip[] {
  return [
    ...basicsFragment(data, { withMode: true }),
    ...conceptFragment(data),
    ...externalNamingFragment(data),
    ...internalNamingFragment(data),
    ...prPackageFragment(data),
    ...deliverablesFragment(data),
    ...visualComponentsFragment(data),
  ]
}

const CEO_INLINE_OPTS: FragmentOpts = { includeCeoComments: true }

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
      ...basicsFragment(data, { withMode: true, ...CEO_INLINE_OPTS }),
      ...conceptFragment(data, CEO_INLINE_OPTS),
      ...externalNamingFragment(data, CEO_INLINE_OPTS),
      ...internalNamingFragment(data, CEO_INLINE_OPTS),
      ...generalCeoCommentFragment(data),
      ...jiraInitiativeFragment(data),
    ],
    data
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
      ...basicsFragment(data, CEO_INLINE_OPTS),
      ...prPackageFragment(data, CEO_INLINE_OPTS),
      ...generalCeoCommentFragment(data),
      ...jiraInitiativeFragment(data),
    ],
    data
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
      ...basicsFragment(data, { withMode: true, ...CEO_INLINE_OPTS }),
      ...deliverablesFragment(data, CEO_INLINE_OPTS),
      ...visualComponentsFragment(data, CEO_INLINE_OPTS),
      ...generalCeoCommentFragment(data),
      ...jiraInitiativeFragment(data),
    ],
    data
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
      ...submissionReviewFragment(data),
    ],
    data
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
      ...submissionReviewFragment(data),
    ],
    data
  )
}

export function buildNeedsRevisionMessage(
  channel: string,
  data: BrandNotificationData,
  ceoComments: Record<string, string>,
  resolvedCeoSelections?: Record<string, string>
): SlackMessage {
  const extNames =
    data.externalNamingNames.length > 0 ? data.externalNamingNames.join(', ') : null
  const visualSummary = formatVisualComponentsSummary(data)

  return buildMessage(
    channel,
    `Бриф повернуто на доопрацювання: ${data.internalName}`,
    [
      header('warning', 'Бриф повернуто на доопрацювання', data.internalName),
      spacer(),
      field('GEO', data.geo),
      field('Дата запуску', data.launchDate),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.basics,
        ceoComment: ceoComments.basics,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.concept,
        selectedValue: data.conceptName,
        ceoComment: ceoComments.concept,
        ceoAlternative: resolvedCeoSelections?.concept,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.externalNaming,
        selectedValue: extNames,
        ceoComment: ceoComments.externalNaming,
        ceoAlternative: resolvedCeoSelections?.externalNaming,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.internalNaming,
        selectedValue: data.internalNamingName,
        ceoComment: ceoComments.internalNaming,
        ceoAlternative: resolvedCeoSelections?.internalNaming,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.marketingPackage,
        selectedValue: data.prPackageName,
        ceoComment: ceoComments.marketingPackage,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.deliverables,
        selectedValue: formatDeliverablesSummary(data),
        ceoComment: ceoComments.deliverables,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.visualComponents,
        selectedValue: visualSummary,
        ceoComment: ceoComments.visualComponents,
      }),
      ...needsRevisionSectionFragment({
        title: CEO_COMMENT_LABELS.general,
        ceoComment: ceoComments.general,
      }),
    ],
    data
  )
}

// ---------------------------------------------------------------------------
// Scenario B: submitted brand carries new briefs (CEO bypassed)
// ---------------------------------------------------------------------------

/** Which round of orders A1–A4 announce; absent — the first one, from the draft. */
export interface SentToWorkRound {
  /** The CEO returned the brief and the author ordered from the revision (N4, phase 4). */
  afterCeoReturn?: boolean
}

export const AFTER_CEO_RETURN_NOTE = 'Після повернення від CEO.'

/** N4: the same message, marked as sent again after the CEO's return. */
function roundFragment(round: SentToWorkRound): SectionOrSkip[] {
  return round.afterCeoReturn ? [italic(AFTER_CEO_RETURN_NOTE), spacer()] : []
}

function roundFallback(text: string, round: SentToWorkRound): string {
  return round.afterCeoReturn ? `${text} (після повернення від CEO)` : text
}

export function buildNewBriefsApprovalMessage(
  channel: string,
  data: BrandNotificationData,
  brand: BrandRowForSlack,
  round: SentToWorkRound = {}
): SlackMessage {
  const conceptBrief = parseJson<Record<string, unknown>>(brand.new_concept_brief)
  const namingBrief = parseJson<Record<string, unknown>>(brand.new_naming_brief)

  const stepData = parseJson<Record<string, unknown>>(brand.step_data)
  const internalFeedback = (stepData?.internalNaming as Record<string, unknown> | undefined)
    ?.newNamingFeedback

  const orderItems: string[] = []
  if (conceptBrief) orderItems.push('новий концепт')
  if (namingBrief) orderItems.push('новий external naming')
  if (typeof internalFeedback === 'string' && internalFeedback.trim()) {
    orderItems.push('новий internal naming')
  }

  return buildMessage(
    channel,
    roundFallback(`Бриф відправлено в роботу: ${data.internalName}`, round),
    [
      header('rocket', 'Бриф відправлено в роботу', data.internalName),
      spacer(),
      ...roundFragment(round),
      field('GEO', data.geo),
      field('Дата запуску', data.launchDate),
      field('Нові замовлення', orderItems.join(', ')),
      spacer(),
      italic(
        'Бриф містить нові замовлення. На погодження CEO — після того, як замовник обере готове з бібліотеки.'
      ),
      ...jiraInitiativeFragment(data),
    ],
    data
  )
}

export function buildNewBriefsStrategyMessage(
  channel: string,
  data: BrandNotificationData,
  brand: BrandRowForSlack,
  round: SentToWorkRound = {}
): SlackMessage {
  const conceptBrief = parseJson<Record<string, unknown>>(brand.new_concept_brief)
  const namingBrief = parseJson<Record<string, unknown>>(brand.new_naming_brief)
  const stepData = parseJson<Record<string, unknown>>(brand.step_data)

  return buildMessage(
    channel,
    roundFallback(`Нове замовлення: ${data.internalName}`, round),
    [
      header('memo', 'Нове замовлення для', data.internalName, ' '),
      spacer(),
      ...roundFragment(round),
      ...basicsFragment(data, { withMode: true }),
      ...conceptFragment(data),
      ...conceptBriefFragment(conceptBrief),
      ...externalNamingFragment(data),
      ...namingBriefFragment(namingBrief),
      ...internalNamingFragment(data),
      ...internalNamingBriefFragment(stepData),
      ...jiraInitiativeFragment(data),
    ],
    data,
    // Strategy cannot open a brief `in_work`; the order page shows them the order.
    { briefButtonUrl: orderPageUrl(data.adminUrl, data.brandId) }
  )
}

export function buildNewBriefsPrMessage(
  channel: string,
  data: BrandNotificationData,
  round: SentToWorkRound = {}
): SlackMessage {
  return buildMessage(
    channel,
    roundFallback(`Новий бриф в роботу: ${data.internalName}`, round),
    [
      header('memo', 'Новий бриф відправлено в роботу', data.internalName),
      spacer(),
      ...roundFragment(round),
      ...basicsFragment(data),
      ...prPackageFragment(data),
      spacer(),
      italic('Бриф містить нові замовлення (не з бібліотеки).'),
      ...jiraInitiativeFragment(data),
    ],
    data,
    // PR and Design open only approved briefs; everything they need now is
    // in the text (v2-prd:381-385). The button returns with «затверджено».
    { briefButton: false }
  )
}

export function buildNewBriefsDesignMessage(
  channel: string,
  data: BrandNotificationData,
  round: SentToWorkRound = {}
): SlackMessage {
  return buildMessage(
    channel,
    roundFallback(`Новий бриф в роботу: ${data.internalName}`, round),
    [
      header('memo', 'Новий бриф відправлено в роботу', data.internalName),
      spacer(),
      ...roundFragment(round),
      ...basicsFragment(data, { withMode: true }),
      ...deliverablesFragment(data),
      ...visualComponentsFragment(data),
      spacer(),
      italic('Бриф містить нові замовлення (не з бібліотеки).'),
      ...jiraInitiativeFragment(data),
    ],
    data,
    // PR and Design open only approved briefs; everything they need now is
    // in the text (v2-prd:381-385). The button returns with «затверджено».
    { briefButton: false }
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
      ...jiraInitiativeFragment(data),
    ],
    data
  )
}
