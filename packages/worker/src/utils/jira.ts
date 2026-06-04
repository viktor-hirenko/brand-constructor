import type { Env } from '../types'
import type { BrandNotificationData } from './slack'

const DEFAULT_JIRA_BASE_URL = 'https://upstars.atlassian.net'
const DEFAULT_JIRA_PROJECT_KEY = 'DHC'
const DEFAULT_JIRA_ISSUE_TYPE_INITIATIVE_ID = '10018'

export interface JiraAdfTextNode {
  type: 'text'
  text: string
  marks?: Array<{ type: 'link'; attrs: { href: string } }>
}

export interface JiraAdfParagraph {
  type: 'paragraph'
  content: JiraAdfTextNode[]
}

export interface JiraAdfDocument {
  type: 'doc'
  version: 1
  content: JiraAdfParagraph[]
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
  baseUrl: string
  projectKey: string
  issueTypeId: string
  email: string
  token: string
}

export function isJiraConfigured(env: Env): boolean {
  return Boolean(env.JIRA_API_TOKEN?.trim() && env.JIRA_EMAIL?.trim())
}

export function resolveJiraConfig(env: Env): JiraResolvedConfig | null {
  if (!isJiraConfigured(env)) return null
  return {
    baseUrl: (env.JIRA_BASE_URL?.trim() || DEFAULT_JIRA_BASE_URL).replace(/\/$/, ''),
    projectKey: env.JIRA_PROJECT_KEY?.trim() || DEFAULT_JIRA_PROJECT_KEY,
    issueTypeId:
      env.JIRA_ISSUE_TYPE_INITIATIVE_ID?.trim() || DEFAULT_JIRA_ISSUE_TYPE_INITIATIVE_ID,
    email: env.JIRA_EMAIL!.trim(),
    token: env.JIRA_API_TOKEN!.trim(),
  }
}

export function plainTextToAdfDocument(text: string): JiraAdfDocument {
  const blocks = text
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(Boolean)

  if (blocks.length === 0) {
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '—' }] }],
    }
  }

  return {
    type: 'doc',
    version: 1,
    content: blocks.map(block => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block.replace(/\n/g, ' ') }],
    })),
  }
}

function line(label: string, value: string | null | undefined): string | null {
  const v = value?.trim()
  return v ? `${label}: ${v}` : null
}

export function buildInitiativeDescriptionText(
  data: BrandNotificationData,
  constructorUrl: string
): string {
  const briefUrl = `${constructorUrl}/constructor/brand/${data.brandId}`
  const extNames =
    data.externalNamingNames.length > 0 ? data.externalNamingNames.join(', ') : null

  const parts = [
    'Бриф затверджено в Brand Builder.',
    line('GEO', data.geo),
    line('Дата запуску', data.launchDate),
    line('Режим', data.mode),
    line('Концепт', data.conceptName),
    line('Зовнішній неймінг', extNames),
    line('Внутрішній неймінг', data.internalNamingName),
    line('PR-пакет', data.prPackageName),
    line('Дедлайн розробки', data.developmentDeadline),
    `Legal Landing: ${data.legalLanding ? 'Так' : 'Ні'}`,
    `Partner Landing: ${data.partnerLanding ? 'Так' : 'Ні'}`,
    `Посилання на бриф: ${briefUrl}`,
  ].filter((p): p is string => Boolean(p))

  return parts.join('\n\n')
}

export function buildInitiativePayload(
  data: BrandNotificationData,
  constructorUrl: string,
  config: Pick<JiraResolvedConfig, 'projectKey' | 'issueTypeId'>
): JiraCreateIssueBody {
  const summary = `[Brand Builder] ${data.internalName?.trim() || data.brandId}`
  const descriptionText = buildInitiativeDescriptionText(data, constructorUrl)

  return {
    fields: {
      project: { key: config.projectKey },
      issuetype: { id: config.issueTypeId },
      summary,
      description: plainTextToAdfDocument(descriptionText),
    },
  }
}

function jiraBrowseUrl(baseUrl: string, issueKey: string): string {
  return `${baseUrl}/browse/${issueKey}`
}

function basicAuthHeader(email: string, token: string): string {
  return `Basic ${btoa(`${email}:${token}`)}`
}

export async function createJiraIssue(
  config: JiraResolvedConfig,
  body: JiraCreateIssueBody
): Promise<JiraCreateIssueResult | null> {
  const url = `${config.baseUrl}/rest/api/3/issue`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(config.email, config.token),
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
        errorMessages: err?.errorMessages,
        errors: err?.errors,
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
      browseUrl: jiraBrowseUrl(config.baseUrl, data.key),
    }
  } catch (err) {
    console.error('Jira create issue fetch error:', err)
    return null
  }
}

export async function createBrandJiraInitiative(
  env: Env,
  db: D1Database,
  brandId: string,
  existingJiraKey: string | null | undefined,
  data: BrandNotificationData,
  constructorUrl: string
): Promise<void> {
  if (existingJiraKey?.trim()) return

  const config = resolveJiraConfig(env)
  if (!config) return

  const payload = buildInitiativePayload(data, constructorUrl, config)
  const created = await createJiraIssue(config, payload)
  if (!created) return

  const now = new Date().toISOString()
  try {
    await db
      .prepare(
        `UPDATE brands SET jira_initiative_key = ?, jira_initiative_url = ?, jira_initiative_created_at = ? WHERE id = ?`
      )
      .bind(created.key, created.browseUrl, now, brandId)
      .run()
  } catch (err) {
    console.error('Jira initiative: failed to persist key on brand', {
      brandId,
      issueKey: created.key,
      err,
    })
  }
}
