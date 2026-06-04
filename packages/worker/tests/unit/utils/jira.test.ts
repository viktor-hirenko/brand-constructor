import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { BrandNotificationData } from '../../../src/utils/slack'
import {
  buildInitiativeDescriptionText,
  buildInitiativePayload,
  createJiraIssue,
  isJiraConfigured,
  plainTextToAdfDocument,
  resolveJiraConfig,
} from '../../../src/utils/jira'
import type { Env } from '../../../src/types'

const sampleData: BrandNotificationData = {
  brandId: 'brand_test_001',
  internalName: 'Test Brand',
  geo: 'UA',
  launchDate: '2026-07-01',
  mode: 'dark',
  conceptName: 'Concept A',
  externalNamingNames: ['Ext One'],
  internalNamingName: 'Int One',
  prPackageName: 'PR Pack',
  legalLanding: true,
  partnerLanding: false,
  delegateToDesigners: false,
  developmentDeadline: '2026-08-01',
  constructorUrl: 'https://brand-constructor-app.pages.dev',
  brandBasicsComment: null,
  conceptComment: null,
  externalNamingComment: null,
  internalNamingComment: null,
  prPackageComment: null,
  deliverablesComment: null,
  componentsComment: null,
  resolvedComponents: [],
  ceoComments: null,
  prPackageTimeline: null,
  prPackageTeamsInvolved: null,
  prPackageComponentsList: null,
  prPackageRequirements: null,
}

describe('jira utils', () => {
  describe('isJiraConfigured', () => {
    it('returns false when token or email missing', () => {
      expect(isJiraConfigured({} as Env)).toBe(false)
      expect(isJiraConfigured({ JIRA_API_TOKEN: 'x' } as Env)).toBe(false)
    })

    it('returns true when token and email set', () => {
      expect(
        isJiraConfigured({ JIRA_API_TOKEN: 'tok', JIRA_EMAIL: 'a@upstars.com' } as Env)
      ).toBe(true)
    })
  })

  describe('resolveJiraConfig', () => {
    it('applies DHC defaults from Lidiia spec', () => {
      const config = resolveJiraConfig({
        JIRA_API_TOKEN: 'tok',
        JIRA_EMAIL: 'dev@upstars.com',
      } as Env)
      expect(config).toMatchObject({
        baseUrl: 'https://upstars.atlassian.net',
        projectKey: 'DHC',
        issueTypeId: '10018',
        email: 'dev@upstars.com',
        token: 'tok',
      })
    })
  })

  describe('plainTextToAdfDocument', () => {
    it('splits paragraphs into ADF doc', () => {
      const doc = plainTextToAdfDocument('Line one\n\nLine two')
      expect(doc.type).toBe('doc')
      expect(doc.version).toBe(1)
      expect(doc.content).toHaveLength(2)
      expect(doc.content[0].content[0].text).toBe('Line one')
    })
  })

  describe('buildInitiativePayload', () => {
    it('builds summary and issuetype id 10018', () => {
      const payload = buildInitiativePayload(sampleData, sampleData.constructorUrl, {
        projectKey: 'DHC',
        issueTypeId: '10018',
      })
      expect(payload.fields.project).toEqual({ key: 'DHC' })
      expect(payload.fields.issuetype).toEqual({ id: '10018' })
      expect(payload.fields.summary).toBe('[Brand Builder] Test Brand')
      expect(payload.fields.description.type).toBe('doc')
    })

    it('includes brief URL in description text', () => {
      const text = buildInitiativeDescriptionText(sampleData, sampleData.constructorUrl)
      expect(text).toContain(
        'https://brand-constructor-app.pages.dev/constructor/brand/brand_test_001'
      )
    })
  })

  describe('createJiraIssue', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns issue key on success', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '1', key: 'DHC-99', self: 'https://x' }), {
          status: 201,
        })
      )

      const result = await createJiraIssue(
        {
          baseUrl: 'https://upstars.atlassian.net',
          projectKey: 'DHC',
          issueTypeId: '10018',
          email: 'a@upstars.com',
          token: 'tok',
        },
        buildInitiativePayload(sampleData, sampleData.constructorUrl, {
          projectKey: 'DHC',
          issueTypeId: '10018',
        })
      )

      expect(result?.key).toBe('DHC-99')
      expect(result?.browseUrl).toBe('https://upstars.atlassian.net/browse/DHC-99')
    })

    it('returns null on API error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ errorMessages: ['bad'] }), { status: 400 })
      )

      const result = await createJiraIssue(
        {
          baseUrl: 'https://upstars.atlassian.net',
          projectKey: 'DHC',
          issueTypeId: '10018',
          email: 'a@upstars.com',
          token: 'tok',
        },
        buildInitiativePayload(sampleData, sampleData.constructorUrl, {
          projectKey: 'DHC',
          issueTypeId: '10018',
        })
      )

      expect(result).toBeNull()
    })
  })
})
