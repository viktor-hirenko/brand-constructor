import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { BrandNotificationData } from '../../../src/utils/slack'
import {
  buildInitiativeDescriptionText,
  buildInitiativePayload,
  buildJiraAuthorizationHeader,
  buildJiraCreateIssueUrl,
  createJiraIssue,
  isJiraConfigured,
  plainTextToAdfDocument,
  resolveJiraConfig,
} from '../../../src/utils/jira'
import type { Env } from '../../../src/types'

const cloudId = '1cae3bd1-b0cd-4eb1-bfb6-0c11d5d77845'

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
    it('returns false when token or cloud id missing', () => {
      expect(isJiraConfigured({} as Env)).toBe(false)
      expect(isJiraConfigured({ JIRA_API_TOKEN: 'x' } as Env)).toBe(false)
      expect(isJiraConfigured({ JIRA_CLOUD_ID: cloudId } as Env)).toBe(false)
    })

    it('returns true with token + cloud id', () => {
      expect(
        isJiraConfigured({
          JIRA_API_TOKEN: 'tok',
          JIRA_CLOUD_ID: cloudId,
        } as Env)
      ).toBe(true)
    })
  })

  describe('resolveJiraConfig', () => {
    it('uses Platform API + bearer for service account', () => {
      const config = resolveJiraConfig({
        JIRA_API_TOKEN: 'tok',
        JIRA_CLOUD_ID: cloudId,
      } as Env)
      expect(config).toMatchObject({
        apiBaseUrl: `https://api.atlassian.com/ex/jira/${cloudId}`,
        browseBaseUrl: 'https://upstars.atlassian.net',
        projectKey: 'DHC',
        issueTypeId: '10018',
        token: 'tok',
      })
      expect(buildJiraAuthorizationHeader(config!)).toBe('Bearer tok')
      expect(buildJiraCreateIssueUrl(config!)).toBe(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`
      )
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

      const config = resolveJiraConfig({
        JIRA_API_TOKEN: 'tok',
        JIRA_CLOUD_ID: cloudId,
      } as Env)!

      const result = await createJiraIssue(
        config,
        buildInitiativePayload(sampleData, sampleData.constructorUrl, {
          projectKey: 'DHC',
          issueTypeId: '10018',
        })
      )

      expect(result?.key).toBe('DHC-99')
      expect(result?.browseUrl).toBe('https://upstars.atlassian.net/browse/DHC-99')
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer tok',
          }),
        })
      )
    })

    it('returns null on API error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ errorMessages: ['bad'] }), { status: 400 })
      )

      const config = resolveJiraConfig({
        JIRA_API_TOKEN: 'tok',
        JIRA_CLOUD_ID: cloudId,
      } as Env)!

      const result = await createJiraIssue(
        config,
        buildInitiativePayload(sampleData, sampleData.constructorUrl, {
          projectKey: 'DHC',
          issueTypeId: '10018',
        })
      )

      expect(result).toBeNull()
    })
  })
})
