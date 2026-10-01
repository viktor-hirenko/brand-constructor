import { ORDER_QUESTION_LABELS as L } from '../constants/orderQuestionLabels'

/**
 * The answers of an order, in the order and the wording of the bc-strategy
 * order message (A2 of the brief-orders plan). The Slack builder prints these
 * lines and the Orders page of the Admin shows them, so the two never drift.
 * An unanswered question is left out, exactly as Slack leaves it out.
 */

export interface OrderAnswer {
  label: string
  value: string
}

type Brief = Record<string, unknown>

function text(label: string, value: unknown): OrderAnswer | null {
  return typeof value === 'string' && value ? { label, value } : null
}

function yesNo(label: string, value: unknown): OrderAnswer | null {
  return value == null ? null : { label, value: value ? 'Так' : 'Ні' }
}

function zones(value: unknown): OrderAnswer | null {
  const list = Array.isArray(value) ? (value as string[]) : []
  return list.length > 0 ? { label: L.domainZones, value: list.join(', ') } : null
}

function budget(value: unknown): OrderAnswer | null {
  return value != null ? { label: L.domainBudget, value: `$${value}` } : null
}

function present(lines: Array<OrderAnswer | null>): OrderAnswer[] {
  return lines.filter((l): l is OrderAnswer => l !== null)
}

export function conceptOrderAnswers(brief: Brief): OrderAnswer[] {
  const connection =
    brief.keepProductConnection == null
      ? null
      : {
          label: L.keepProductConnection,
          value: brief.keepProductConnection
            ? `Так${brief.connectedProducts ? ` (${brief.connectedProducts})` : ''}`
            : 'Ні',
        }
  return present([
    yesNo(L.isNewGeo, brief.isNewGeo),
    text(L.geoInfo, brief.geoInfo),
    yesNo(L.needsGeoResearch, brief.needsGeoResearch),
    text(L.feedback, brief.conceptFeedback),
    text(L.trafficTeamInfo, brief.trafficTeamInfo),
    text(L.competitors, brief.competitors),
    connection,
    text(L.namingLanguage, brief.namingLanguage),
    text(L.desiredWordsInName, brief.desiredWordsInName),
    zones(brief.domainZones),
    budget(brief.domainBudget),
    text(L.namingDeadline, brief.namingDeadline),
    text(L.additionalGeoInfo, brief.additionalGeoInfo),
  ])
}

export function namingOrderAnswers(brief: Brief): OrderAnswer[] {
  return present([
    yesNo(L.isNewGeo, brief.isNewGeo),
    text(L.feedback, brief.namingFeedback),
    text(L.trafficTeamInfo, brief.trafficTeamInfo),
    yesNo(L.needsGeoResearch, brief.needsGeoResearch),
    text(L.competitors, brief.competitors),
    text(L.namingLanguage, brief.namingLanguage),
    text(L.desiredWordsInName, brief.desiredWordsInName),
    zones(brief.domainZones),
    text(L.wordsToAvoid, brief.wordsToAvoid),
    budget(brief.domainBudget),
    text(L.namingDeadline, brief.namingDeadline),
    text(L.additionalGeoInfo, brief.additionalGeoInfo),
  ])
}

export function internalOrderAnswers(feedback: unknown): OrderAnswer[] {
  return present([text(L.feedback, feedback)])
}
