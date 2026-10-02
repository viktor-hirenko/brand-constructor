import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import {
  ADMIN_URL,
  brandRow,
  CONCEPT_ORDER,
  createBrandApp,
  insertBrand,
  type BrandApp,
  type SlackPost,
} from '../../helpers/brandApp'
import { cancelReason, createdSummaryText } from '../../../src/utils/slack-orders'

/*
 * Brief-orders plan, phase 3: «замовлення готове» to bc-approvals when the team
 * sends the order to the author (N1), «замовлення скасовано» under the order
 * message in bc-strategy (N2), «Обрано» / «Альтернатива CEO» told apart in
 * «повернуто» (H-05), and the Orders plate after the author picked what the
 * team made. The tests run the real routes over SQLite.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

async function json(res: Response): Promise<{ success: boolean; data?: any; error?: string }> {
  return (await res.json()) as never
}

const textOf = (m: SlackPost) => (m.blocks ?? []).map(b => b.text?.text ?? '').join('\n')
const buttonsOf = (m: SlackPost) =>
  (m.blocks ?? []).flatMap(b => b.elements ?? []).map(e => `${e.text.text} → ${e.url}`)

/** A draft with a concept order, sent to the teams; the four A1–A4 messages are cleared. */
async function briefInWork(app: BrandApp): Promise<string> {
  const id = insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
  expect((await app.request('po', 'PATCH', `/api/brands/${id}/status`, { status: 'in_work' })).status).toBe(200)
  await app.settle()
  return id
}

/** The team makes a concept and a name for it. */
async function teamMakes(app: BrandApp, id: string): Promise<{ concept: string; name: string }> {
  const c = await json(
    await app.request('strategy', 'POST', '/api/concepts', { name: 'Sunburst', description: '', for_brand_id: id })
  )
  const n = await json(
    await app.request('strategy', 'POST', '/api/namings/external', {
      name: 'Sunbeam',
      concept_id: c.data.id,
      for_brand_id: id,
    })
  )
  return { concept: c.data.id, name: n.data.id }
}

function wizardSave(overrides: Record<string, unknown>) {
  return {
    conceptId: null,
    externalNamingIds: [],
    internalNamingId: 'int_one',
    newConceptBrief: CONCEPT_ORDER,
    newNamingBrief: null,
    stepData: { internalNaming: { selectedId: 'int_one', comment: '', newNamingFeedback: null } },
    ...overrides,
  }
}

const sentAfter = (app: BrandApp, from: number) => app.slack.slice(from)

d('N1 «замовлення готове» → bc-approvals', () => {
  it('is sent once, names what was made, mentions the author and opens the brief', async () => {
    const app = createBrandApp()
    app.slackUsers.set('po@x.test', 'U_PO')
    const id = await briefInWork(app)
    await teamMakes(app, id)
    const from = app.slack.length

    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    await app.settle()
    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(409)
    await app.settle()

    const sent = sentAfter(app, from)
    expect(sent).toHaveLength(1)
    expect(sent[0].channel).toBe('C_APPROVALS')
    expect(textOf(sent[0])).toContain(':sparkles: Замовлення для *New Brand #7* готове')
    expect(textOf(sent[0])).toContain('*Створено:* концепт «Sunburst»; назва «Sunbeam»')
    expect(textOf(sent[0])).toContain('*Замовник:* <@U_PO>')
    expect(textOf(sent[0])).toContain('Оберіть створене у брифі та відправте на погодження CEO')
    expect(sent[0].text).toContain('<@U_PO>')
    expect(buttonsOf(sent[0])).toEqual([`Відкрити бриф → ${ADMIN_URL}/workspace/brand/${id}`])
  })

  it('two «Відправити замовнику» at once: one message', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await teamMakes(app, id)
    const from = app.slack.length
    const codes = (
      await Promise.all([
        app.request('strategy', 'POST', `/api/orders/${id}/ready`),
        app.request('admin', 'POST', `/api/orders/${id}/ready`),
      ])
    ).map(r => r.status)
    await app.settle()
    expect(codes.sort()).toEqual([200, 409])
    expect(sentAfter(app, from)).toHaveLength(1)
  })

  it('names the author as text when the bot may not look people up', async () => {
    const app = createBrandApp()
    app.lookupError.value = 'missing_scope'
    const id = await briefInWork(app)
    await teamMakes(app, id)
    const from = app.slack.length
    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    await app.settle()
    expect(textOf(sentAfter(app, from)[0])).toContain('*Замовник:* Olena PO')
  })

  it('a Slack failure is a History event, not a failed «Відправити замовнику»', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await teamMakes(app, id)
    app.failChannels.add('C_APPROVALS')
    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    await app.settle()
    const failed = app.db.raw
      .prepare("SELECT meta FROM brand_workflow_events WHERE brand_id = ? AND event_type = 'slack_failed'")
      .all(id) as { meta: string }[]
    expect(failed.map(f => JSON.parse(f.meta).kind)).toEqual(['approvals'])
  })
})

d('N2 «замовлення скасовано» → bc-strategy, under the order', () => {
  it('replies in the thread of the order message when the author picks from the library', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const orderTs = brandRow(app.db, id).orders_slack_ts as string
    expect(orderTs).toBeTruthy()
    await teamMakes(app, id)
    const from = app.slack.length

    const res = await app.request(
      'po',
      'PUT',
      `/api/brands/${id}`,
      wizardSave({ conceptId: 'cpt_wonka', externalNamingIds: ['ext_wonkaland'], newConceptBrief: null })
    )
    expect(res.status).toBe(200)
    await app.settle()

    const sent = sentAfter(app, from)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ channel: 'C_STRATEGY', thread_ts: orderTs })
    expect(textOf(sent[0])).toBe(
      ':no_entry_sign: Замовлення для *New Brand #7* скасовано: замовник обрав з бібліотеки концепт «Wonka». Можна не робити.'
    )
  })

  it('is a plain message in bc-strategy when the order message ts was not kept', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    app.db.raw.prepare('UPDATE brands SET orders_slack_ts = NULL, orders_slack_channel = NULL WHERE id = ?').run(id)
    const from = app.slack.length
    await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: 'cpt_wonka', newConceptBrief: null }))
    await app.settle()
    const sent = sentAfter(app, from)
    expect(sent).toHaveLength(1)
    expect(sent[0].channel).toBe('C_STRATEGY')
    expect(sent[0].thread_ts).toBeUndefined()
  })

  it('says the made items go back to the library when the team had already sent them', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await teamMakes(app, id)
    await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    await app.settle()
    const from = app.slack.length
    await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: 'cpt_wonka', newConceptBrief: null }))
    await app.settle()
    expect(textOf(sentAfter(app, from)[0])).toMatch(/скасовано: .*Створене повертається в бібліотеку\.$/)
  })

  it('picking what the team made cancels nothing and says nothing', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const made = await teamMakes(app, id)
    const from = app.slack.length
    await app.request(
      'po',
      'PUT',
      `/api/brands/${id}`,
      wizardSave({ conceptId: made.concept, externalNamingIds: [made.name], newConceptBrief: null })
    )
    // and the next save of the same brief does not cancel anything either
    await app.request(
      'po',
      'PUT',
      `/api/brands/${id}`,
      wizardSave({ conceptId: made.concept, externalNamingIds: [made.name], newConceptBrief: null })
    )
    await app.settle()
    expect(sentAfter(app, from)).toEqual([])
  })

  it('deleting a brief whose order the teams still work on tells them, under the order', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const orderTs = brandRow(app.db, id).orders_slack_ts as string
    const from = app.slack.length
    expect((await app.request('admin', 'DELETE', `/api/brands/${id}`)).status).toBe(200)
    await app.settle()
    const sent = sentAfter(app, from)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ channel: 'C_STRATEGY', thread_ts: orderTs })
    expect(textOf(sent[0])).toContain('скасовано: бриф видалено. Можна не робити.')
  })

  it('deleting a brief without a standing order says nothing', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'brand_plain' })
    expect((await app.request('admin', 'DELETE', '/api/brands/brand_plain')).status).toBe(200)
    await app.settle()
    expect(app.slack).toEqual([])
  })
})

d('the reason of N2', () => {
  it('lists what came from the library, or says the concept changed, or that the order was taken off', () => {
    expect(cancelReason([{ kind: 'concept', picked: ['Wonka'] }])).toBe('замовник обрав з бібліотеки концепт «Wonka»')
    expect(
      cancelReason([
        { kind: 'concept', picked: ['Wonka'] },
        { kind: 'externalNaming', picked: ['A', 'B'] },
        { kind: 'internalNaming', picked: ['Inty'] },
      ])
    ).toBe('замовник обрав з бібліотеки концепт «Wonka», назви «A», «B» і внутрішню назву «Inty»')
    expect(cancelReason([{ kind: 'externalNaming', picked: [], conceptChangedTo: 'Wonka' }])).toBe(
      'замовник змінив концепт на «Wonka»'
    )
    expect(cancelReason([{ kind: 'internalNaming', picked: [] }])).toBe('замовник зняв замовлення')
  })

  it('names what was made, one or many', () => {
    expect(createdSummaryText({ concepts: ['S'], externalNamings: ['A', 'B'], internalNamings: [] })).toBe(
      'концепт «S»; назви «A», «B»'
    )
    expect(createdSummaryText({ concepts: [], externalNamings: [], internalNamings: ['I'] })).toBe(
      'внутрішня назва «I»'
    )
  })
})

d('H-05: «повернуто» tells the author’s pick from the CEO’s', () => {
  const revisionText = (app: BrandApp) => {
    const sent = app.slack.filter(m => m.channel === 'C_APPROVALS')
    return textOf(sent[sent.length - 1])
  }

  it('«Обрано» is the author’s concept, «Альтернатива CEO» the CEO’s', async () => {
    const app = createBrandApp()
    const id = insertBrand(app.db, { status: 'submitted' })
    const res = await app.request('ceo', 'PATCH', `/api/brands/${id}/status`, {
      status: 'needs_revision',
      ceoComments: { concept: 'Too pale' },
      ceoSelections: { concept: 'cpt_wonka' },
    })
    expect(res.status).toBe(200)
    await app.settle()
    const text = revisionText(app)
    expect(text).toContain('*Обрано:* Sunrise')
    expect(text).toContain('*Альтернатива CEO:* Wonka')
    expect(text).not.toContain('*Обрано:* Wonka')
  })

  it('the CEO’s pick saved before «Повернути» is still the alternative', async () => {
    const app = createBrandApp()
    const id = insertBrand(app.db, { status: 'submitted' })
    expect(
      (await app.request('ceo', 'PATCH', `/api/brands/${id}/ceo-selections`, { ceoSelections: { concept: 'cpt_wonka' } }))
        .status
    ).toBe(200)
    await app.request('ceo', 'PATCH', `/api/brands/${id}/status`, {
      status: 'needs_revision',
      ceoComments: { concept: 'Too pale' },
    })
    await app.settle()
    const text = revisionText(app)
    expect(text).toContain('*Обрано:* Sunrise')
    expect(text).toContain('*Альтернатива CEO:* Wonka')
  })
})

d('Orders: the author picked what the team sent', () => {
  it('is «closed» (Обрано замовником) and leaves Ready for Archive, while the brief is still in work', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const made = await teamMakes(app, id)
    await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    await app.request(
      'po',
      'PUT',
      `/api/brands/${id}`,
      wizardSave({ conceptId: made.concept, externalNamingIds: [made.name], newConceptBrief: null })
    )
    const detail = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    expect(detail.data).toMatchObject({ briefStatus: 'in_work', state: 'closed' })
    const list = await json(await app.request('strategy', 'GET', '/api/orders'))
    expect(list.data.counts).toEqual({ open: 0, ready: 0, archive: 1 })
  })

  it('stays «Чекає на замовника» while an order still stands', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await teamMakes(app, id)
    await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    const detail = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    expect(detail.data.state).toBe('ready')
  })
})
