import { describe, expect, it, vi } from 'vitest'
import type { BrandRow } from '../../../src/utils/brands'
import type { Env } from '../../../src/types'
import type { BrandNotificationData } from '../../../src/utils/slack'

vi.mock('../../../src/utils/jira', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/utils/jira')>()
  return {
    ...actual,
    createBrandJiraInitiative: vi.fn().mockResolvedValue({
      key: 'DHC-99',
      browseUrl: 'https://jira.example/browse/DHC-99',
    }),
  }
})

import {
  brandHasNewBriefs,
  enrichNotificationWithJira,
  enqueueJiraInitiativeCreation,
  enqueueJiraThenSlack,
  parseJiraBrandContext,
} from '../../../src/utils/brand-export'

function baseBrand(overrides: Partial<BrandRow> = {}): BrandRow {
  return {
    id: 'brand_1',
    internal_name: 'Test',
    status: 'submitted',
    created_by: 'user_1',
    geo: 'UA',
    launch_date: null,
    mode: null,
    concept_id: null,
    concept_comment: null,
    external_naming_ids: null,
    external_naming_comment: null,
    internal_naming_id: null,
    internal_naming_comment: null,
    pr_package_id: null,
    pr_package_comment: null,
    legal_landing: 0,
    partner_landing: 0,
    deliverables_comment: null,
    component_selections: null,
    components_comment: null,
    delegate_to_designers: 0,
    new_concept_brief: null,
    ceo_comments: null,
    ceo_selections: null,
    development_deadline: null,
    new_naming_brief: null,
    step_data: null,
    current_step: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

describe('brand-export utils', () => {
  describe('brandHasNewBriefs', () => {
    it('returns true when new concept brief exists', () => {
      expect(brandHasNewBriefs(baseBrand({ new_concept_brief: '{"isNewGeo":true}' }))).toBe(true)
    })

    it('returns true when new naming brief exists', () => {
      expect(brandHasNewBriefs(baseBrand({ new_naming_brief: '{"namingLanguage":"EN"}' }))).toBe(
        true
      )
    })

    it('returns true when internal naming feedback in step_data', () => {
      expect(
        brandHasNewBriefs(
          baseBrand({
            step_data: JSON.stringify({ internalNaming: { newNamingFeedback: 'Need new name' } }),
          })
        )
      ).toBe(true)
    })

    it('returns false for library-only brand', () => {
      expect(brandHasNewBriefs(baseBrand())).toBe(false)
    })
  })

  describe('parseJiraBrandContext', () => {
    it('parses JSON briefs and internal feedback', () => {
      const context = parseJiraBrandContext(
        baseBrand({
          new_concept_brief: '{"geoInfo":"BR"}',
          new_naming_brief: '{"namingLanguage":"PT"}',
          step_data: JSON.stringify({ internalNaming: { newNamingFeedback: 'Feedback' } }),
        })
      )

      expect(context.newConceptBrief).toEqual({ geoInfo: 'BR' })
      expect(context.newNamingBrief).toEqual({ namingLanguage: 'PT' })
      expect(context.internalNamingFeedback).toBe('Feedback')
    })
  })

  describe('enqueueJiraInitiativeCreation', () => {
    it('does not waitUntil when Jira flag disabled', () => {
      const waitUntil = vi.fn()
      const executionCtx = { waitUntil } as unknown as ExecutionContext

      enqueueJiraInitiativeCreation(
        executionCtx,
        { JIRA_API_TOKEN: 'tok', JIRA_CLOUD_ID: 'cloud', JIRA_INITIATIVE_ENABLED: 'false' } as Env,
        {} as D1Database,
        baseBrand(),
        { brandId: 'brand_1' } as BrandNotificationData,
        'new_briefs'
      )

      expect(waitUntil).not.toHaveBeenCalled()
    })

    it('waitUntil when Jira enabled', () => {
      const waitUntil = vi.fn()
      const executionCtx = { waitUntil } as unknown as ExecutionContext

      enqueueJiraInitiativeCreation(
        executionCtx,
        {
          JIRA_API_TOKEN: 'tok',
          JIRA_CLOUD_ID: 'cloud',
          JIRA_INITIATIVE_ENABLED: 'true',
        } as Env,
        {} as D1Database,
        baseBrand(),
        { brandId: 'brand_1' } as BrandNotificationData,
        'ceo_approved'
      )

      expect(waitUntil).toHaveBeenCalledOnce()
    })
  })

  describe('enrichNotificationWithJira', () => {
    it('adds jira fields from created issue', () => {
      const enriched = enrichNotificationWithJira(
        { brandId: 'brand_1', internalName: 'Test' } as BrandNotificationData,
        { key: 'DHC-10', browseUrl: 'https://jira.example/browse/DHC-10' }
      )

      expect(enriched.jiraInitiativeKey).toBe('DHC-10')
      expect(enriched.jiraInitiativeUrl).toBe('https://jira.example/browse/DHC-10')
    })
  })

  describe('enqueueJiraThenSlack', () => {
    it('runs slack callback inside waitUntil', async () => {
      const waitUntil = vi.fn((promise: Promise<unknown>) => promise)
      const executionCtx = { waitUntil } as unknown as ExecutionContext
      const sendSlack = vi.fn().mockResolvedValue(undefined)

      enqueueJiraThenSlack(
        executionCtx,
        {
          JIRA_API_TOKEN: 'tok',
          JIRA_CLOUD_ID: 'cloud',
          JIRA_INITIATIVE_ENABLED: 'true',
        } as Env,
        {} as D1Database,
        baseBrand(),
        { brandId: 'brand_1', internalName: 'Test' } as BrandNotificationData,
        'new_briefs',
        sendSlack
      )

      expect(waitUntil).toHaveBeenCalledOnce()
      await waitUntil.mock.calls[0][0]
      expect(sendSlack).toHaveBeenCalledWith(
        expect.objectContaining({
          jiraInitiativeKey: 'DHC-99',
          jiraInitiativeUrl: 'https://jira.example/browse/DHC-99',
        })
      )
    })
  })
})
