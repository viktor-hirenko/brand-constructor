import type { Env } from '../types'
import type { BrandRow } from './brands'
import type { BrandNotificationData } from './slack'
import {
  createBrandJiraInitiative,
  type JiraBrandContext,
  type JiraInitiativeFlowType,
  type JiraInitiativeRef,
  shouldCreateJiraInitiative,
} from './jira'

export function brandHasNewBriefs(brand: BrandRow): boolean {
  if (brand.new_concept_brief != null || brand.new_naming_brief != null) return true
  return Boolean(parseInternalNamingFeedback(brand))
}

export function parseJiraBrandContext(brand: BrandRow): JiraBrandContext {
  return {
    newConceptBrief: parseJsonRecord(brand.new_concept_brief),
    newNamingBrief: parseJsonRecord(brand.new_naming_brief),
    internalNamingFeedback: parseInternalNamingFeedback(brand),
  }
}

function parseJsonRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function parseInternalNamingFeedback(brand: BrandRow): string | null {
  if (!brand.step_data) return null
  try {
    const stepData = JSON.parse(brand.step_data) as {
      internalNaming?: { newNamingFeedback?: string }
    }
    const feedback = stepData.internalNaming?.newNamingFeedback?.trim()
    return feedback || null
  } catch {
    return null
  }
}

export function enrichNotificationWithJira(
  data: BrandNotificationData,
  jira: JiraInitiativeRef | null,
  brand?: BrandRow
): BrandNotificationData {
  const key = jira?.key ?? brand?.jira_initiative_key ?? null
  const url = jira?.browseUrl ?? brand?.jira_initiative_url ?? null
  if (!key && !url) return data
  return {
    ...data,
    jiraInitiativeKey: key,
    jiraInitiativeUrl: url,
  }
}

async function createJiraForBrand(
  env: Env,
  db: D1Database,
  brand: BrandRow,
  data: BrandNotificationData,
  flow: JiraInitiativeFlowType
): Promise<JiraInitiativeRef | null> {
  const constructorUrl = env.CONSTRUCTOR_URL ?? ''
  const context = parseJiraBrandContext(brand)
  return createBrandJiraInitiative(
    env,
    db,
    brand.id,
    brand.jira_initiative_key,
    data,
    constructorUrl,
    flow,
    context
  )
}

export function enqueueJiraInitiativeCreation(
  executionCtx: ExecutionContext,
  env: Env,
  db: D1Database,
  brand: BrandRow,
  data: BrandNotificationData,
  flow: JiraInitiativeFlowType
): void {
  if (!shouldCreateJiraInitiative(env)) return

  executionCtx.waitUntil(createJiraForBrand(env, db, brand, data, flow))
}

export function enqueueJiraThenSlack(
  executionCtx: ExecutionContext,
  env: Env,
  db: D1Database,
  brand: BrandRow,
  data: BrandNotificationData,
  flow: JiraInitiativeFlowType,
  sendSlack: (data: BrandNotificationData) => Promise<unknown>
): void {
  executionCtx.waitUntil(
    (async () => {
      let jira: JiraInitiativeRef | null = null
      if (shouldCreateJiraInitiative(env)) {
        jira = await createJiraForBrand(env, db, brand, data, flow)
      }
      const enriched = enrichNotificationWithJira(data, jira, brand)
      await sendSlack(enriched)
    })()
  )
}
