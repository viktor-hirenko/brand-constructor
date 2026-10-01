import type { Env } from '../types'
import type { BrandNotificationData } from './slack'
import { brandBriefUrl } from './slack'
import type { CeoSectionKey } from './slack'

const DEFAULT_JIRA_BASE_URL = 'https://upstars.atlassian.net'
const DEFAULT_JIRA_PROJECT_KEY = 'DHC'
const DEFAULT_JIRA_ISSUE_TYPE_INITIATIVE_ID = '10018'
const JIRA_PLATFORM_API_ORIGIN = 'https://api.atlassian.com'

export type JiraInitiativeFlowType = 'ceo_approved' | 'new_briefs'

export interface JiraBrandContext {
  newConceptBrief: Record<string, unknown> | null
  newNamingBrief: Record<string, unknown> | null
  internalNamingFeedback: string | null
}

type JiraAdfMark = { type: 'strong' } | { type: 'link'; attrs: { href: string } }

export interface JiraAdfTextNode {
  type: 'text'
  text: string
  marks?: JiraAdfMark[]
}

interface JiraAdfListItem {
  type: 'listItem'
  content: Array<{ type: 'paragraph'; content: JiraAdfTextNode[] }>
}

export type JiraAdfBlockNode =
  | { type: 'paragraph'; content: JiraAdfTextNode[] }
  | { type: 'heading'; attrs: { level: 3 | 4 }; content: JiraAdfTextNode[] }
  | { type: 'bulletList'; content: JiraAdfListItem[] }
  | { type: 'rule' }

export interface JiraAdfDocument {
  type: 'doc'
  version: 1
  content: JiraAdfBlockNode[]
}

export interface JiraCreateIssueFields {
  project: { key: string }
  issuetype: { id: string }
  summary: string
  description: JiraAdfDocument
}

export interface JiraCreateIssueBody {
  fields: JiraCreateIssueFields
}

export interface JiraCreateIssueResult {
  id: string
  key: string
  self: string
  browseUrl: string
}

interface JiraErrorResponse {
  errorMessages?: string[]
  errors?: Record<string, string>
}

export interface JiraResolvedConfig {
  apiBaseUrl: string
  browseBaseUrl: string
  projectKey: string
  issueTypeId: string
  token: string
}

type DescriptionLine =
  | { kind: 'field'; label: string; value: string }
  | { kind: 'bool'; label: string; value: boolean }

interface DescriptionSection {
  title: string
  level: 3 | 4
  lines: DescriptionLine[]
}

export function isJiraConfigured(env: Env): boolean {
  return Boolean(env.JIRA_API_TOKEN?.trim() && env.JIRA_CLOUD_ID?.trim())
}

/** Opt-in flag: Initiative creation runs only when explicitly enabled. */
export function isJiraInitiativeEnabled(env: Env): boolean {
  return env.JIRA_INITIATIVE_ENABLED?.trim().toLowerCase() === 'true'
}

export function shouldCreateJiraInitiative(env: Env): boolean {
  return isJiraConfigured(env) && isJiraInitiativeEnabled(env)
}

export function resolveJiraConfig(env: Env): JiraResolvedConfig | null {
  if (!isJiraConfigured(env)) return null

  const cloudId = env.JIRA_CLOUD_ID!.trim()
  const browseBaseUrl = (env.JIRA_BASE_URL?.trim() || DEFAULT_JIRA_BASE_URL).replace(/\/$/, '')

  return {
    apiBaseUrl: `${JIRA_PLATFORM_API_ORIGIN}/ex/jira/${cloudId}`,
    browseBaseUrl,
    projectKey: env.JIRA_PROJECT_KEY?.trim() || DEFAULT_JIRA_PROJECT_KEY,
    issueTypeId:
      env.JIRA_ISSUE_TYPE_INITIATIVE_ID?.trim() || DEFAULT_JIRA_ISSUE_TYPE_INITIATIVE_ID,
    token: env.JIRA_API_TOKEN!.trim(),
  }
}

function adfText(text: string, marks?: JiraAdfMark[]): JiraAdfTextNode {
  return marks && marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }
}

function adfParagraph(text: string): JiraAdfBlockNode {
  return { type: 'paragraph', content: [adfText(text)] }
}

function adfHeading(title: string, level: 3 | 4): JiraAdfBlockNode {
  return { type: 'heading', attrs: { level }, content: [adfText(title)] }
}

function adfRule(): JiraAdfBlockNode {
  return { type: 'rule' }
}

function adfFieldBullet(label: string, value: string): JiraAdfListItem {
  return {
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: [adfText(`${label}: `, [{ type: 'strong' }]), adfText(value)],
      },
    ],
  }
}

function adfBoolBullet(label: string, value: boolean): JiraAdfListItem {
  return adfFieldBullet(label, value ? 'Так' : 'Ні')
}

function adfBulletList(lines: DescriptionLine[]): JiraAdfBlockNode {
  const content = lines.map(line =>
    line.kind === 'bool'
      ? adfBoolBullet(line.label, line.value)
      : adfFieldBullet(line.label, line.value)
  )
  return { type: 'bulletList', content }
}

function adfLinkParagraph(label: string, url: string): JiraAdfBlockNode {
  return {
    type: 'paragraph',
    content: [
      adfText(`${label}: `, [{ type: 'strong' }]),
      adfText('Відкрити бриф у Brand Builder', [{ type: 'link', attrs: { href: url } }]),
    ],
  }
}

function lineToDescriptionLine(
  label: string,
  value: string | null | undefined
): DescriptionLine | null {
  const v = value?.trim()
  return v ? { kind: 'field', label, value: v } : null
}

function boolToDescriptionLine(label: string, value: unknown): DescriptionLine | null {
  if (value == null) return null
  return { kind: 'bool', label, value: Boolean(value) }
}

function section(title: string, level: 3 | 4, lines: Array<DescriptionLine | null>): DescriptionSection | null {
  const filtered = lines.filter((l): l is DescriptionLine => l !== null)
  if (filtered.length === 0) return null
  return { title, level, lines: filtered }
}

function conceptBriefLines(brief: Record<string, unknown>): DescriptionLine[] {
  const zones = brief.domainZones as string[] | undefined
  const connection =
    brief.keepProductConnection == null
      ? null
      : brief.keepProductConnection
        ? `Так${brief.connectedProducts ? ` (${String(brief.connectedProducts)})` : ''}`
        : 'Ні'

  return [
    boolToDescriptionLine('Нове ГЕО', brief.isNewGeo),
    lineToDescriptionLine('Інфо про ГЕО', brief.geoInfo as string),
    boolToDescriptionLine('Потрібен Brand Research GEO', brief.needsGeoResearch),
    lineToDescriptionLine('Що не підійшло', brief.conceptFeedback as string),
    lineToDescriptionLine('Інфо від трафік-команди', brief.trafficTeamInfo as string),
    lineToDescriptionLine('Конкуренти', brief.competitors as string),
    connection ? { kind: 'field', label: "Зв'язок з іншими продуктами", value: connection } : null,
    lineToDescriptionLine('Мова назви', brief.namingLanguage as string),
    lineToDescriptionLine('Бажані слова в назві', brief.desiredWordsInName as string),
    zones && zones.length > 0
      ? { kind: 'field', label: 'Доменні зони', value: zones.join(', ') }
      : null,
    brief.domainBudget != null
      ? { kind: 'field', label: 'Бюджет домена', value: `$${brief.domainBudget}` }
      : null,
    lineToDescriptionLine('Дедлайн', brief.namingDeadline as string),
    lineToDescriptionLine('Додаткова інфо по ГЕО', brief.additionalGeoInfo as string),
  ].filter((l): l is DescriptionLine => l !== null)
}

function namingBriefLines(brief: Record<string, unknown>): DescriptionLine[] {
  const zones = brief.domainZones as string[] | undefined

  return [
    boolToDescriptionLine('Нове ГЕО', brief.isNewGeo),
    lineToDescriptionLine('Що не підійшло', brief.namingFeedback as string),
    lineToDescriptionLine('Інфо від трафік-команди', brief.trafficTeamInfo as string),
    boolToDescriptionLine('Потрібен Brand Research GEO', brief.needsGeoResearch),
    lineToDescriptionLine('Мова назви', brief.namingLanguage as string),
    lineToDescriptionLine('Бажані слова в назві', brief.desiredWordsInName as string),
    zones && zones.length > 0
      ? { kind: 'field', label: 'Доменні зони', value: zones.join(', ') }
      : null,
    lineToDescriptionLine('Слова яких уникнути', brief.wordsToAvoid as string),
    brief.domainBudget != null
      ? { kind: 'field', label: 'Бюджет домена', value: `$${brief.domainBudget}` }
      : null,
    lineToDescriptionLine('Дедлайн', brief.namingDeadline as string),
    lineToDescriptionLine('Додаткова інфо по ГЕО', brief.additionalGeoInfo as string),
  ].filter((l): l is DescriptionLine => l !== null)
}

function ceoCommentLine(
  data: BrandNotificationData,
  key: CeoSectionKey,
  flow: JiraInitiativeFlowType
): DescriptionLine | null {
  if (flow !== 'ceo_approved') return null
  return lineToDescriptionLine('Коментар CEO', data.ceoComments?.[key])
}

function buildInitiativeSections(
  data: BrandNotificationData,
  flow: JiraInitiativeFlowType,
  context: JiraBrandContext
): DescriptionSection[] {
  const extNames =
    data.externalNamingNames.length > 0 ? data.externalNamingNames.join(', ') : null

  const sections: DescriptionSection[] = []

  const basics = section('Основна інформація', 3, [
    lineToDescriptionLine('GEO', data.geo),
    lineToDescriptionLine('Дата запуску', data.launchDate),
    lineToDescriptionLine('Режим', data.mode),
    lineToDescriptionLine('Коментар замовника', data.brandBasicsComment),
    ceoCommentLine(data, 'basics', flow),
  ])
  if (basics) sections.push(basics)

  if (context.newConceptBrief) {
    sections.push({ title: 'Концепт', level: 3, lines: [] })
    const briefSection = section('Бриф нового концепту', 4, [
      ...conceptBriefLines(context.newConceptBrief),
      ceoCommentLine(data, 'concept', flow),
    ])
    if (briefSection) sections.push(briefSection)
  } else {
    const concept = section('Концепт', 3, [
      lineToDescriptionLine('Обраний концепт', data.conceptName),
      lineToDescriptionLine('Коментар замовника', data.conceptComment),
      ceoCommentLine(data, 'concept', flow),
    ])
    if (concept) sections.push(concept)
  }

  if (context.newNamingBrief) {
    sections.push({ title: 'Зовнішній неймінг', level: 3, lines: [] })
    const briefSection = section('Бриф нового External Naming', 4, [
      ...namingBriefLines(context.newNamingBrief),
      ceoCommentLine(data, 'externalNaming', flow),
    ])
    if (briefSection) sections.push(briefSection)
  } else {
    const external = section('Зовнішній неймінг', 3, [
      lineToDescriptionLine('Обрані назви', extNames),
      lineToDescriptionLine('Коментар замовника', data.externalNamingComment),
      ceoCommentLine(data, 'externalNaming', flow),
    ])
    if (external) sections.push(external)
  }

  const internal = section('Внутрішній неймінг', 3, [
    lineToDescriptionLine('Обрана назва', data.internalNamingName),
    lineToDescriptionLine('Коментар замовника', data.internalNamingComment),
    lineToDescriptionLine('Бриф нового internal naming', context.internalNamingFeedback),
    ceoCommentLine(data, 'internalNaming', flow),
  ])
  if (internal) sections.push(internal)

  const pr = section('PR-пакет', 3, [
    lineToDescriptionLine('Пакет', data.prPackageName),
    lineToDescriptionLine('Коментар замовника', data.prPackageComment),
    lineToDescriptionLine('Команди', data.prPackageTeamsInvolved),
    lineToDescriptionLine('Строки', data.prPackageTimeline),
    lineToDescriptionLine('Вимоги', data.prPackageRequirements),
    lineToDescriptionLine('Компоненти пакету', data.prPackageComponentsList),
    ceoCommentLine(data, 'marketingPackage', flow),
  ])
  if (pr) sections.push(pr)

  const deliverables = section('Deliverables', 3, [
    { kind: 'bool', label: 'Legal Landing', value: data.legalLanding },
    { kind: 'bool', label: 'Partner Landing', value: data.partnerLanding },
    lineToDescriptionLine('Дедлайн розробки', data.developmentDeadline),
    lineToDescriptionLine('Коментар замовника', data.deliverablesComment),
    data.delegateToDesigners
      ? { kind: 'bool', label: 'Делеговано дизайнерам', value: true }
      : null,
    ceoCommentLine(data, 'deliverables', flow),
  ])
  if (deliverables) sections.push(deliverables)

  const componentLines: DescriptionLine[] = data.resolvedComponents.map(c => ({
    kind: 'field',
    label: c.typeName,
    value: c.variantName,
  }))
  if (data.componentsComment?.trim()) {
    const comment = lineToDescriptionLine('Коментар замовника', data.componentsComment)
    if (comment) componentLines.push(comment)
  }
  const ceoComponents = ceoCommentLine(data, 'visualComponents', flow)
  if (ceoComponents) componentLines.push(ceoComponents)
  const components = section('Візуальні компоненти', 3, componentLines)
  if (components) sections.push(components)

  const general = section('Загальний коментар', 3, [ceoCommentLine(data, 'general', flow)])
  if (general) sections.push(general)

  return sections
}

function buildInitiativeIntro(flow: JiraInitiativeFlowType): string {
  return flow === 'ceo_approved'
    ? 'Бриф затверджено CEO в Brand Builder.'
    : 'Нове замовлення в Brand Builder (CEO review пропущено).'
}

function formatLinePlain(line: DescriptionLine): string {
  const value = line.kind === 'bool' ? (line.value ? 'Так' : 'Ні') : line.value
  return `• ${line.label}: ${value}`
}

function formatSectionPlain(sec: DescriptionSection): string {
  const prefix = sec.level === 4 ? '  ' : ''
  const title = sec.level === 4 ? `▸ ${sec.title}` : sec.title
  if (sec.lines.length === 0) return title
  return [title, ...sec.lines.map(l => `${prefix}${formatLinePlain(l)}`)].join('\n')
}

export function plainTextToAdfDocument(text: string): JiraAdfDocument {
  const blocks = text.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
  return {
    type: 'doc',
    version: 1,
    content: blocks.map(block => adfParagraph(block)),
  }
}

export function buildInitiativeDescriptionText(
  data: BrandNotificationData,
  adminUrl: string,
  flow: JiraInitiativeFlowType,
  context: JiraBrandContext
): string {
  const briefUrl = brandBriefUrl(adminUrl, data.brandId)
  const sections = buildInitiativeSections(data, flow, context)

  const parts = [
    buildInitiativeIntro(flow),
    ...sections.map(formatSectionPlain),
    `Посилання на бриф: ${briefUrl}`,
  ]

  return parts.join('\n\n')
}

export function buildInitiativeDescriptionAdf(
  data: BrandNotificationData,
  adminUrl: string,
  flow: JiraInitiativeFlowType,
  context: JiraBrandContext
): JiraAdfDocument {
  const briefUrl = brandBriefUrl(adminUrl, data.brandId)
  const sections = buildInitiativeSections(data, flow, context)
  const content: JiraAdfBlockNode[] = [adfParagraph(buildInitiativeIntro(flow))]

  for (const sec of sections) {
    content.push(adfHeading(sec.title, sec.level))
    if (sec.lines.length > 0) {
      content.push(adfBulletList(sec.lines))
    }
  }

  content.push(adfRule())
  content.push(adfLinkParagraph('Посилання на бриф', briefUrl))

  return { type: 'doc', version: 1, content }
}

export function resolveInitiativeTitlePrefix(env: Env): string {
  return env.JIRA_INITIATIVE_TITLE_PREFIX?.trim() ?? ''
}

export function buildInitiativeSummary(
  data: BrandNotificationData,
  flow: JiraInitiativeFlowType,
  titlePrefix?: string
): string {
  const name = data.internalName?.trim() || data.brandId
  const base =
    flow === 'new_briefs' ? `[Brand Builder] [Нове замовлення] ${name}` : `[Brand Builder] ${name}`
  const prefix = titlePrefix?.trim()
  return prefix ? `${prefix} ${base}` : base
}

export function buildInitiativePayload(
  data: BrandNotificationData,
  adminUrl: string,
  config: Pick<JiraResolvedConfig, 'projectKey' | 'issueTypeId'>,
  flow: JiraInitiativeFlowType,
  context: JiraBrandContext,
  titlePrefix?: string
): JiraCreateIssueBody {
  return {
    fields: {
      project: { key: config.projectKey },
      issuetype: { id: config.issueTypeId },
      summary: buildInitiativeSummary(data, flow, titlePrefix),
      description: buildInitiativeDescriptionAdf(data, adminUrl, flow, context),
    },
  }
}

function jiraBrowseUrl(browseBaseUrl: string, issueKey: string): string {
  return `${browseBaseUrl}/browse/${issueKey}`
}

export function buildJiraAuthorizationHeader(config: JiraResolvedConfig): string {
  return `Bearer ${config.token}`
}

export function buildJiraCreateIssueUrl(config: JiraResolvedConfig): string {
  return `${config.apiBaseUrl}/rest/api/3/issue`
}

export async function createJiraIssue(
  config: JiraResolvedConfig,
  body: JiraCreateIssueBody
): Promise<JiraCreateIssueResult | null> {
  const url = buildJiraCreateIssueUrl(config)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: buildJiraAuthorizationHeader(config),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const raw = await res.text()
    let parsed: unknown = null
    if (raw) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = null
      }
    }

    if (!res.ok) {
      const err = parsed as JiraErrorResponse | null
      console.error('Jira create issue failed:', {
        status: res.status,
        apiBaseUrl: config.apiBaseUrl,
        errorMessages: err?.errorMessages,
        errors: err?.errors,
        message:
          typeof parsed === 'object' && parsed && 'message' in parsed
            ? parsed.message
            : raw?.slice(0, 200),
      })
      return null
    }

    const data = parsed as { id?: string; key?: string; self?: string }
    if (!data?.id || !data?.key) {
      console.error('Jira create issue: unexpected response', parsed)
      return null
    }

    return {
      id: data.id,
      key: data.key,
      self: data.self ?? url,
      browseUrl: jiraBrowseUrl(config.browseBaseUrl, data.key),
    }
  } catch (err) {
    console.error('Jira create issue fetch error:', err)
    return null
  }
}

export interface JiraInitiativeRef {
  key: string
  browseUrl: string
}

export async function createBrandJiraInitiative(
  env: Env,
  db: D1Database,
  brandId: string,
  existingJiraKey: string | null | undefined,
  data: BrandNotificationData,
  adminUrl: string,
  flow: JiraInitiativeFlowType,
  context: JiraBrandContext
): Promise<JiraInitiativeRef | null> {
  if (existingJiraKey?.trim()) {
    return null
  }

  const config = resolveJiraConfig(env)
  if (!config) {
    console.error('[jira-initiative] skipped: Jira config incomplete', {
      brandId,
      internalName: data.internalName,
      flow,
    })
    return null
  }

  const payload = buildInitiativePayload(
    data,
    adminUrl,
    config,
    flow,
    context,
    resolveInitiativeTitlePrefix(env)
  )
  const created = await createJiraIssue(config, payload)
  if (!created) {
    console.error('[jira-initiative] create failed', {
      brandId,
      internalName: data.internalName,
      flow,
    })
    return null
  }

  const now = new Date().toISOString()
  try {
    await db
      .prepare(
        `UPDATE brands SET jira_initiative_key = ?, jira_initiative_url = ?, jira_initiative_created_at = ? WHERE id = ?`
      )
      .bind(created.key, created.browseUrl, now, brandId)
      .run()
  } catch (err) {
    console.error('[jira-initiative] failed to persist key on brand', {
      brandId,
      issueKey: created.key,
      flow,
      err,
    })
    return { key: created.key, browseUrl: created.browseUrl }
  }

  console.log('[jira-initiative] created', {
    brandId,
    issueKey: created.key,
    flow,
  })

  return { key: created.key, browseUrl: created.browseUrl }
}
