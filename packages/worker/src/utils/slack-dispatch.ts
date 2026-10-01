import { BRAND_WORKFLOW_EVENT_TYPES } from '@brand-constructor/shared'
import { insertWorkflowEvent } from './brand-workflow'
import { sendSlackMessage, type SlackMessage, type SlackSendResult } from './slack'

/** One message of a status change, named so a failure says which one it was. */
export interface SlackDispatchItem {
  /** `approvals` | `strategy` | `pr` | `design` — the History event and the order `ts` key off it. */
  kind: string
  message: SlackMessage
}

export interface SlackDispatchResult extends SlackSendResult {
  kind: string
}

/**
 * Sends a status change's messages side by side. Slack never fails the action
 * the user took: the brief is already written by the time this runs (inside
 * `waitUntil`). A message Slack did not take is recorded as a `slack_failed`
 * event, so the History shows that a channel was never told — instead of the
 * failure living only in the worker log.
 */
export async function dispatchSlack(
  db: D1Database,
  token: string,
  brandId: string,
  userId: string,
  items: SlackDispatchItem[]
): Promise<SlackDispatchResult[]> {
  const results = await Promise.all(
    items.map(async item => ({ kind: item.kind, ...(await sendSlackMessage(token, item.message)) }))
  )
  for (const r of results) {
    if (r.ok) continue
    try {
      await insertWorkflowEvent(db, brandId, BRAND_WORKFLOW_EVENT_TYPES.SLACK_FAILED, userId, {
        kind: r.kind,
        channel: r.channel,
        error: r.error,
      })
    } catch (err) {
      console.error('Workflow event insert failed (slack_failed):', err)
    }
  }
  return results
}
