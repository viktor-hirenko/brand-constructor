import { describe, expect, it } from 'vitest'
import {
  SLACK_MAX_BLOCKS,
  SLACK_SECTION_TEXT_LIMIT,
  SLACK_TRUNCATED_NOTE,
  brandBriefUrl,
  orderPageUrl,
  buildApprovedWorkflowMessage,
  buildNeedsRevisionMessage,
  buildNewBriefsApprovalMessage,
  buildNewBriefsDesignMessage,
  buildNewBriefsPrMessage,
  buildNewBriefsStrategyMessage,
  buildPrMarketingMessage,
  buildProductDesignMessage,
  buildResubmittedMessage,
  buildStrategyMessage,
  buildSubmittedMessage,
  packSectionTexts,
  type BrandNotificationData,
  type SlackMessage,
} from '../../../src/utils/slack'

/**
 * Slack, brief-orders plan phase 1: every message keeps its text (they follow
 * v2-prd «Формування документів для команд» and the designer's note
 * 1958:5946). What changes: brief buttons open the Admin, PR/Design lose the
 * button while the brief is in work, A1 names the Internal Naming order and
 * stops telling the CEO «CEO-ревью не потрібне», and a long brief is split
 * instead of bouncing (H-17).
 *
 * The snapshots were checked line by line against the pre-phase builders
 * (01.10): identical except the two A1 lines above.
 */

const data: BrandNotificationData = {
  brandId: 'brand_1',
  internalName: 'New Brand #7',
  geo: 'AU, NZ',
  launchDate: '2026-12-01',
  mode: 'dark',
  conceptName: 'Sunrise',
  externalNamingNames: ['Bubbleton', 'Sunny'],
  internalNamingName: 'Int One',
  prPackageName: 'PR Basic',
  legalLanding: true,
  partnerLanding: false,
  delegateToDesigners: false,
  developmentDeadline: '2026-11-20',
  adminUrl: 'https://brand-constructor.pages.dev',
  brandBasicsComment: 'basics c',
  conceptComment: 'concept c',
  externalNamingComment: 'ext c',
  internalNamingComment: 'int c',
  prPackageComment: 'pr c',
  deliverablesComment: 'deliv c',
  componentsComment: 'comp c',
  resolvedComponents: [{ typeName: 'Logo', variantName: 'A' }],
  ceoComments: { concept: 'ceo on concept', general: 'ceo general' },
  prPackageTimeline: 'Q3',
  prPackageTeamsInvolved: 'PR',
  prPackageComponentsList: 'Banner\nLanding',
  prPackageRequirements: 'Fast',
  jiraInitiativeKey: 'DHC-1',
  jiraInitiativeUrl: 'https://jira.example/browse/DHC-1',
}

const brand = {
  id: 'brand_1',
  internal_name: 'New Brand #7',
  new_concept_brief: JSON.stringify({ isNewGeo: true, geoInfo: 'AU', conceptFeedback: 'dull', domainZones: ['.com'], domainBudget: 100 }),
  new_naming_brief: JSON.stringify({ namingFeedback: 'long', domainZones: ['.io'] }),
  step_data: JSON.stringify({ internalNaming: { newNamingFeedback: 'short please' } }),
}

function view(m: SlackMessage) {
  return {
    fallback: m.text,
    text: (m.blocks ?? [])
      .filter(b => b.type === 'section')
      .map(b => b.text?.text)
      .join('\n'),
    buttons: (m.blocks ?? [])
      .filter(b => b.type === 'actions')
      .flatMap(b => b.elements ?? [])
      .map(e => `${e.text.text} → ${e.url}`),
  }
}

describe('message texts (snapshot of every status message)', () => {
  const cases: [string, SlackMessage][] = [
    ['A1 approvals, sent to work', buildNewBriefsApprovalMessage('C', data, brand)],
    ['A2 strategy, the order', buildNewBriefsStrategyMessage('C', data, brand)],
    ['A3 pr, in work', buildNewBriefsPrMessage('C', data)],
    ['A4 design, in work', buildNewBriefsDesignMessage('C', data)],
    ['B approvals, submitted', buildSubmittedMessage('C', data)],
    ['C approvals, resubmitted', buildResubmittedMessage('C', data)],
    ['D approvals, returned', buildNeedsRevisionMessage('C', data, { concept: 'no', general: 'redo' }, { concept: 'Wonka' })],
    ['E1 strategy, approved', buildStrategyMessage('C', data)],
    ['E2 pr, approved', buildPrMarketingMessage('C', data)],
    ['E3 design, approved', buildProductDesignMessage('C', data)],
    ['E4 approvals, approved', buildApprovedWorkflowMessage('C', data)],
  ]
  for (const [name, message] of cases) {
    it(name, () => {
      expect(view(message)).toMatchSnapshot()
    })
  }
})

describe('brief buttons', () => {
  it('open the brief inside the Admin', () => {
    expect(brandBriefUrl('https://brand-constructor.pages.dev/', 'brand_1')).toBe(
      'https://brand-constructor.pages.dev/workspace/brand/brand_1'
    )
    expect(view(buildSubmittedMessage('C', data)).buttons[0]).toBe(
      'Відкрити бриф → https://brand-constructor.pages.dev/workspace/brand/brand_1'
    )
  })

  it('the order message to bc-strategy opens the order page (phase 2a)', () => {
    expect(orderPageUrl('https://brand-constructor.pages.dev/', 'brand_1')).toBe(
      'https://brand-constructor.pages.dev/orders/brand_1'
    )
    expect(view(buildNewBriefsStrategyMessage('C', data, brand)).buttons[0]).toBe(
      'Відкрити бриф → https://brand-constructor.pages.dev/orders/brand_1'
    )
  })

  it('PR and Design get no brief button while it is in work, Jira stays', () => {
    for (const m of [buildNewBriefsPrMessage('C', data), buildNewBriefsDesignMessage('C', data)]) {
      expect(view(m).buttons).toEqual(['Jira DHC-1 → https://jira.example/browse/DHC-1'])
    }
  })

  it('no actions block at all when there is no button (Slack rejects an empty one)', () => {
    const m = buildNewBriefsPrMessage('C', { ...data, jiraInitiativeKey: null, jiraInitiativeUrl: null })
    expect((m.blocks ?? []).some(b => b.type === 'actions')).toBe(false)
  })
})

describe('long briefs fit Slack (H-17)', () => {
  it('a 5000-character comment splits into sections of at most 3000', () => {
    const long = 'x'.repeat(5000)
    const m = buildSubmittedMessage('C', { ...data, conceptComment: long, deliverablesComment: long })
    const sections = (m.blocks ?? []).filter(b => b.type === 'section')
    expect(sections.length).toBeGreaterThan(1)
    for (const s of sections) expect(s.text!.text.length).toBeLessThanOrEqual(SLACK_SECTION_TEXT_LIMIT)
    expect((m.blocks ?? []).length).toBeLessThanOrEqual(SLACK_MAX_BLOCKS)
    expect(view(m).text).toContain(SLACK_TRUNCATED_NOTE)
  })

  it('lines are never split between sections and order is kept', () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i} ${'y'.repeat(200)}`)
    const packed = packSectionTexts(lines)
    expect(packed.join('\n')).toBe(lines.join('\n'))
  })

  it('past the block limit the rest becomes a pointer to the brief', () => {
    const lines = Array.from({ length: 200 }, () => 'z'.repeat(2900))
    const packed = packSectionTexts(lines)
    expect(packed.length).toBe(SLACK_MAX_BLOCKS - 1)
    expect(packed[packed.length - 1]).toBe(SLACK_TRUNCATED_NOTE)
  })
})
