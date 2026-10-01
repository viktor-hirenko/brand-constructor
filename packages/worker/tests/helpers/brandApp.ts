import { Hono } from 'hono'
import { vi } from 'vitest'
import brands from '../../src/routes/brands'
import concepts from '../../src/routes/concepts'
import namings from '../../src/routes/namings'
import orders from '../../src/routes/orders'
import { createTestD1, type TestD1 } from './sqliteD1'

/**
 * The real `/api/brands` router over a real-schema SQLite, with Slack's
 * `chat.postMessage` captured instead of sent. `waitUntil` work is collected
 * so a test can wait for every message a request queued.
 */

export const USERS = {
  po: { id: 'usr_po', email: 'po@x.test', name: 'Olena PO', role: 'product_owner' },
  po2: { id: 'usr_po2', email: 'po2@x.test', name: 'Petro PO', role: 'product_owner' },
  ceo: { id: 'usr_ceo', email: 'ceo@x.test', name: 'Ceo', role: 'cpo_ceo' },
  admin: { id: 'usr_admin', email: 'admin@x.test', name: 'Admin', role: 'admin' },
  strategy: { id: 'usr_str', email: 'str@x.test', name: 'Stas Strategy', role: 'strategy_identity' },
  head: { id: 'usr_head', email: 'head@x.test', name: 'Head DHC', role: 'head_dhc' },
  pr: { id: 'usr_pr', email: 'pr@x.test', name: 'Pr', role: 'pr_marketing' },
  design: { id: 'usr_des', email: 'des@x.test', name: 'Designer', role: 'product_designer' },
} as const

export type UserKey = keyof typeof USERS

export const ADMIN_URL = 'https://brand-constructor.pages.dev'

export interface SlackPost {
  channel: string
  text: string
  blocks?: { type: string; text?: { text: string }; elements?: { url: string; text: { text: string } }[] }[]
  thread_ts?: string
}

export interface BrandApp {
  db: TestD1
  slack: SlackPost[]
  /** Set to make Slack answer `{ ok: false }` for that channel. */
  failChannels: Set<string>
  request(user: UserKey, method: string, path: string, body?: unknown): Promise<Response>
  /** Waits for everything requests queued with `waitUntil` (Slack, Jira). */
  settle(): Promise<void>
}

export function seedLibrary(db: TestD1): void {
  const u = db.raw.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
  for (const user of Object.values(USERS)) u.run(user.id, user.email, user.name, user.role)
  const c = db.raw.prepare('INSERT INTO concepts (id, name, created_by) VALUES (?, ?, ?)')
  c.run('cpt_sunrise', 'Sunrise', 'usr_admin')
  c.run('cpt_wonka', 'Wonka', 'usr_admin')
  const e = db.raw.prepare(
    'INSERT INTO external_namings (id, name, concept_id, created_by) VALUES (?, ?, ?, ?)'
  )
  e.run('ext_bubbleton', 'Bubbleton', 'cpt_sunrise', 'usr_admin')
  e.run('ext_sunny', 'Sunny', 'cpt_sunrise', 'usr_admin')
  e.run('ext_wonkaland', 'Wonkaland', 'cpt_wonka', 'usr_admin')
  e.run('ext_free', 'Freebird', null, 'usr_admin')
  const i = db.raw.prepare('INSERT INTO internal_namings (id, name, created_by) VALUES (?, ?, ?)')
  i.run('int_one', 'Int One', 'usr_admin')
}

export const CONCEPT_ORDER = {
  isNewGeo: true,
  geoInfo: 'AU',
  needsGeoResearch: false,
  conceptFeedback: 'Not bright enough',
  trafficTeamInfo: '',
  competitors: 'Rival',
  keepProductConnection: false,
  connectedProducts: '',
  namingLanguage: 'EN',
  desiredWordsInName: 'sun',
  domainZones: ['.com'],
  domainBudget: 100,
  namingDeadline: '2026-11-01',
  additionalGeoInfo: '',
}

export const NAMING_ORDER = {
  isNewGeo: false,
  namingFeedback: 'Too long',
  trafficTeamInfo: '',
  needsGeoResearch: false,
  namingLanguage: 'EN',
  desiredWordsInName: '',
  domainZones: ['.com'],
  wordsToAvoid: '',
  domainBudget: null,
  namingDeadline: '2026-11-01',
  additionalGeoInfo: '',
}

export interface BrandSeed {
  id?: string
  status?: string
  created_by?: string
  concept_id?: string | null
  external_naming_ids?: string[]
  internal_naming_id?: string | null
  new_concept_brief?: unknown
  new_naming_brief?: unknown
  internal_feedback?: string | null
  mode?: string | null
  submit_count?: number
  submitted_at?: string | null
  ceo_selections?: Record<string, string | string[]> | null
}

/** Inserts a brief straight into the table — the state a test starts from. */
export function insertBrand(db: TestD1, seed: BrandSeed = {}): string {
  const id = seed.id ?? 'brand_1'
  const stepData = {
    internalNaming: {
      selectedId: seed.internal_naming_id ?? null,
      comment: '',
      newNamingFeedback: seed.internal_feedback ?? null,
    },
  }
  db.raw
    .prepare(
      `INSERT INTO brands (id, internal_name, status, created_by, geo, mode, concept_id,
        external_naming_ids, internal_naming_id, new_concept_brief, new_naming_brief,
        step_data, submit_count, submitted_at, ceo_selections)
       VALUES (?, ?, ?, ?, 'AU', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      'New Brand #7',
      seed.status ?? 'draft',
      seed.created_by ?? USERS.po.id,
      seed.mode === undefined ? 'light' : seed.mode,
      seed.concept_id === undefined ? 'cpt_sunrise' : seed.concept_id,
      JSON.stringify(seed.external_naming_ids ?? ['ext_bubbleton']),
      seed.internal_naming_id === undefined ? 'int_one' : seed.internal_naming_id,
      seed.new_concept_brief == null ? null : JSON.stringify(seed.new_concept_brief),
      seed.new_naming_brief == null ? null : JSON.stringify(seed.new_naming_brief),
      JSON.stringify(stepData),
      seed.submit_count ?? 0,
      seed.submitted_at ?? null,
      seed.ceo_selections == null ? null : JSON.stringify(seed.ceo_selections)
    )
  return id
}

export function brandRow(db: TestD1, id = 'brand_1'): Record<string, unknown> {
  return db.raw.prepare('SELECT * FROM brands WHERE id = ?').get(id) as Record<string, unknown>
}

export function eventTypes(db: TestD1, id = 'brand_1'): string[] {
  return (
    db.raw
      .prepare('SELECT event_type FROM brand_workflow_events WHERE brand_id = ? ORDER BY rowid')
      .all(id) as { event_type: string }[]
  ).map(r => r.event_type)
}

export function createBrandApp(): BrandApp {
  const db = createTestD1()
  seedLibrary(db)
  const slack: SlackPost[] = []
  const failChannels = new Set<string>()
  const pending: Promise<unknown>[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith('https://slack.com/api/chat.postMessage')) {
        const message = JSON.parse(String(init?.body)) as SlackPost
        slack.push(message)
        const ok = !failChannels.has(message.channel)
        return new Response(
          JSON.stringify(
            ok ? { ok, ts: `17000000.${slack.length}`, channel: message.channel } : { ok, error: 'channel_not_found' }
          )
        )
      }
      throw new Error(`unexpected fetch in test: ${url}`)
    })
  )

  const app = new Hono()
  app.use('*', async (c, next) => {
    const key = (c.req.header('x-test-user') ?? 'po') as UserKey
    c.set('user' as never, USERS[key] as never)
    await next()
  })
  app.route('/api/brands', brands as never)
  app.route('/api/orders', orders as never)
  app.route('/api/concepts', concepts as never)
  app.route('/api/namings', namings as never)

  const env = {
    DB: db,
    ADMIN_URL,
    CONSTRUCTOR_URL: 'https://brand-constructor-app.pages.dev',
    SLACK_BOT_TOKEN: 'xoxb-test',
    SLACK_CHANNEL_APPROVALS: 'C_APPROVALS',
    SLACK_CHANNEL_STRATEGY: 'C_STRATEGY',
    SLACK_CHANNEL_PR: 'C_PR',
    SLACK_CHANNEL_DESIGN: 'C_DESIGN',
    JIRA_INITIATIVE_ENABLED: 'false',
  }
  const executionCtx = {
    waitUntil: (p: Promise<unknown>) => {
      pending.push(p)
    },
    passThroughOnException: () => {},
    props: {},
  }

  return {
    db,
    slack,
    failChannels,
    request(user, method, path, body) {
      return app.request(
        path,
        {
          method,
          headers: { 'content-type': 'application/json', 'x-test-user': user },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        env,
        executionCtx as never
      )
    },
    async settle() {
      while (pending.length > 0) {
        await Promise.allSettled(pending.splice(0))
      }
    },
  }
}
