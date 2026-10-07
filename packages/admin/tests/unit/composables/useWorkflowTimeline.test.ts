import { describe, expect, it } from 'vitest'
import { BRAND_WORKFLOW_EVENT_LABELS } from '@brand-constructor/shared'
import { orderEventBlocks, orderEventSummary, slackFailedTitle } from '@/composables/useWorkflowTimeline'

/** A Slack message the worker could not deliver shows in the brief's History (brief-orders, phase 1). */
describe('History — slack_failed', () => {
  const base = BRAND_WORKFLOW_EVENT_LABELS.slack_failed

  it('names the channel and Slack’s error', () => {
    expect(slackFailedTitle(base, { kind: 'strategy', channel: 'C1', error: 'channel_not_found' })).toBe(
      'Повідомлення в Slack не доставлено — bc-strategy (channel_not_found)'
    )
  })

  it('keeps the plain title when the meta is empty', () => {
    expect(slackFailedTitle(base, {})).toBe('Повідомлення в Slack не доставлено')
  })

  it('«sent to work» has its own History title', () => {
    expect(BRAND_WORKFLOW_EVENT_LABELS.sent_to_work).toBe('Відправлено командам (в роботу)')
  })
})

describe('order events in the History (phase 2a)', () => {
  const ready = {
    orders: ['concept'],
    created: { concepts: ['TEST Concept'], externalNamings: ['Test', 'Sunny'], internalNamings: [] },
  }

  it('«Order ready» opens like «Submitted»: counts beside, names inside', () => {
    expect(orderEventSummary('orders_ready', ready)).toBe('1 концепт · 2 назви')
    expect(orderEventBlocks('orders_ready', ready)).toEqual([
      { label: 'Concept', value: 'TEST Concept' },
      { label: 'External Naming', value: 'Test, Sunny' },
    ])
  })

  it('«Order cancelled» says what the author picked instead', () => {
    const meta = { kind: 'concept', picked: ['Wonka'] }
    expect(orderEventSummary('order_cancelled', meta)).toBe('Concept')
    expect(orderEventBlocks('order_cancelled', meta)).toEqual([
      { label: 'Concept', value: 'Замість цього обрано з бібліотеки: Wonka' },
    ])
  })

  it('other events get none of it', () => {
    expect(orderEventSummary('submitted', {})).toBeNull()
    expect(orderEventBlocks('submitted', {})).toEqual([])
  })
})
