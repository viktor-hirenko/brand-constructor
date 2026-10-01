import { describe, expect, it } from 'vitest'
import { BRAND_WORKFLOW_EVENT_LABELS } from '@brand-constructor/shared'
import { slackFailedTitle } from '@/composables/useWorkflowTimeline'

/** A Slack message the worker could not deliver shows in the brief's History (brief-orders, phase 1). */
describe('History — slack_failed', () => {
  const base = BRAND_WORKFLOW_EVENT_LABELS.slack_failed

  it('names the channel and Slack’s error', () => {
    expect(slackFailedTitle(base, { kind: 'strategy', channel: 'C1', error: 'channel_not_found' })).toBe(
      'Slack message not delivered — bc-strategy (channel_not_found)'
    )
  })

  it('keeps the plain title when the meta is empty', () => {
    expect(slackFailedTitle(base, {})).toBe('Slack message not delivered')
  })

  it('«sent to work» has its own History title', () => {
    expect(BRAND_WORKFLOW_EVENT_LABELS.sent_to_work).toBe('Sent to teams (in work)')
  })
})
