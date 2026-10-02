import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { BrandNotificationData } from '../../../src/utils/slack'
import {
  buildInitiativeDescriptionAdf,
  buildInitiativeDescriptionText,
  buildInitiativePayload,
  buildInitiativeSummary,
  buildJiraAuthorizationHeader,
  buildJiraCreateIssueUrl,
  createJiraIssue,
  isJiraConfigured,
  isJiraInitiativeEnabled,
  plainTextToAdfDocument,
  resolveJiraConfig,
  shouldCreateJiraInitiative,
  type JiraBrandContext,
} from '../../../src/utils/jira'
import type { Env } from '../../../src/types'

const cloudId = '1cae3bd1-b0cd-4eb1-bfb6-0c11d5d77845'
const adminUrl = 'https://brand-constructor.pages.dev'

const emptyContext: JiraBrandContext = {
  newConceptBrief: null,
  newNamingBrief: null,
  internalNamingFeedback: null,
}

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
  adminUrl,
  brandBasicsComment: null,
  conceptComment: null,
  externalNamingComment: null,
  internalNamingComment: null,
  prPackageComment: null,
  deliverablesComment: null,
  componentsComment: null,
  resolvedComponents: [{ typeName: 'Logo', variantName: 'Variant A' }],
  ceoComments: { basics: 'CEO basics note' },
  prPackageTimeline: 'Q3',
  prPackageTeamsInvolved: 'PR, Design',
  prPackageComponentsList: 'Banner, Landing',
  prPackageRequirements: 'Fast launch',
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

  describe('isJiraInitiativeEnabled', () => {
    it('returns false when unset or not "true"', () => {
      expect(isJiraInitiativeEnabled({} as Env)).toBe(false)
      expect(isJiraInitiativeEnabled({ JIRA_INITIATIVE_ENABLED: 'false' } as Env)).toBe(false)
      expect(isJiraInitiativeEnabled({ JIRA_INITIATIVE_ENABLED: '1' } as Env)).toBe(false)
    })

    it('returns true only for explicit "true"', () => {
      expect(isJiraInitiativeEnabled({ JIRA_INITIATIVE_ENABLED: 'true' } as Env)).toBe(true)
      expect(isJiraInitiativeEnabled({ JIRA_INITIATIVE_ENABLED: 'TRUE' } as Env)).toBe(true)
    })
  })

  describe('shouldCreateJiraInitiative', () => {
    it('requires both credentials and enabled flag', () => {
      expect(
        shouldCreateJiraInitiative({
          JIRA_API_TOKEN: 'tok',
          JIRA_CLOUD_ID: cloudId,
        } as Env)
      ).toBe(false)
      expect(
        shouldCreateJiraInitiative({
          JIRA_INITIATIVE_ENABLED: 'true',
        } as Env)
      ).toBe(false)
      expect(
        shouldCreateJiraInitiative({
          JIRA_API_TOKEN: 'tok',
          JIRA_CLOUD_ID: cloudId,
          JIRA_INITIATIVE_ENABLED: 'true',
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

  describe('buildInitiativeSummary', () => {
    it('uses [Нове замовлення] suffix for flow B', () => {
      expect(buildInitiativeSummary(sampleData, 'ceo_approved')).toBe('[Brand Builder] Test Brand')
      expect(buildInitiativeSummary(sampleData, 'new_briefs')).toBe(
        '[Brand Builder] [Нове замовлення] Test Brand'
      )
    })

    it('prepends optional title prefix for UAT', () => {
      expect(buildInitiativeSummary(sampleData, 'ceo_approved', '[TEST]')).toBe(
        '[TEST] [Brand Builder] Test Brand'
      )
    })
  })

  describe('buildInitiativeDescriptionText — flow A (ceo_approved)', () => {
    it('includes library selections, CEO comments, components and brief URL', () => {
      const text = buildInitiativeDescriptionText(
        sampleData,
        adminUrl,
        'ceo_approved',
        emptyContext
      )
      expect(text).toContain('Бриф затверджено CEO')
      expect(text).toContain('Concept A')
      expect(text).toContain('Ext One')
      expect(text).toContain('Logo: Variant A')
      expect(text).toContain('Коментар CEO: CEO basics note')
      expect(text).not.toContain('Коментарі CEO')
      expect(text).toContain('PR, Design')
      expect(text).toContain(`${adminUrl}/workspace/brand/brand_test_001`)
    })
  })

  describe('buildInitiativeDescriptionText — flow B (new_briefs)', () => {
    it('includes new brief sections and skips CEO comments', () => {
      const context: JiraBrandContext = {
        newConceptBrief: {
          isNewGeo: true,
          geoInfo: 'Brazil',
          conceptFeedback: 'Old concept did not fit',
        },
        newNamingBrief: {
          namingLanguage: 'PT',
          desiredWordsInName: 'Vegas',
        },
        internalNamingFeedback: 'Need fresh internal name',
      }

      const text = buildInitiativeDescriptionText(
        sampleData,
        adminUrl,
        'new_briefs',
        context
      )

      expect(text).toContain('CEO review пропущено')
      expect(text).toContain('Бриф нового концепту')
      expect(text).toContain('Brazil')
      expect(text).toContain('Бриф нового External Naming')
      expect(text).toContain('PT')
      expect(text).toContain('Need fresh internal name')
      expect(text).not.toContain('CEO basics note')
      expect(text).not.toContain('Обраний концепт')
    })

    it('links the order page next to the brief (phase 3) — only for a new order', () => {
      const orderLine = `Сторінка замовлення: ${adminUrl}/orders/brand_test_001`
      expect(buildInitiativeDescriptionText(sampleData, adminUrl, 'new_briefs', emptyContext)).toContain(orderLine)
      expect(buildInitiativeDescriptionText(sampleData, adminUrl, 'ceo_approved', emptyContext)).not.toContain(
        'Сторінка замовлення'
      )
      const hrefs = (flow: 'new_briefs' | 'ceo_approved') =>
        buildInitiativeDescriptionAdf(sampleData, adminUrl, flow, emptyContext)
          .content.flatMap(n => (n.type === 'paragraph' ? n.content : []))
          .flatMap(c => c.marks ?? [])
          .map(m => (m as { attrs?: { href?: string } }).attrs?.href)
          .filter(Boolean)
      expect(hrefs('new_briefs')).toEqual([
        `${adminUrl}/workspace/brand/brand_test_001`,
        `${adminUrl}/orders/brand_test_001`,
      ])
      expect(hrefs('ceo_approved')).toEqual([`${adminUrl}/workspace/brand/brand_test_001`])
    })
  })

  describe('buildInitiativeDescriptionAdf', () => {
    it('uses headings, bullet lists and link for brief URL', () => {
      const doc = buildInitiativeDescriptionAdf(
        sampleData,
        adminUrl,
        'ceo_approved',
        emptyContext
      )

      expect(doc.content.some(n => n.type === 'heading')).toBe(true)
      expect(doc.content.some(n => n.type === 'bulletList')).toBe(true)
      expect(doc.content.some(n => n.type === 'rule')).toBe(true)

      const linkParagraph = doc.content.find(
        n =>
          n.type === 'paragraph' &&
          n.content.some(
            c => c.marks?.[0]?.type === 'link' && c.marks[0].attrs.href.includes('brand_test_001')
          )
      )
      expect(linkParagraph).toBeDefined()
    })
  })

  describe('buildInitiativePayload', () => {
    it('builds summary and issuetype id 10018', () => {
      const payload = buildInitiativePayload(
        sampleData,
        adminUrl,
        { projectKey: 'DHC', issueTypeId: '10018' },
        'ceo_approved',
        emptyContext
      )
      expect(payload.fields.project).toEqual({ key: 'DHC' })
      expect(payload.fields.issuetype).toEqual({ id: '10018' })
      expect(payload.fields.summary).toBe('[Brand Builder] Test Brand')
      expect(payload.fields.description.type).toBe('doc')
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
        buildInitiativePayload(
          sampleData,
          adminUrl,
          { projectKey: 'DHC', issueTypeId: '10018' },
          'ceo_approved',
          emptyContext
        )
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
        buildInitiativePayload(
          sampleData,
          adminUrl,
          { projectKey: 'DHC', issueTypeId: '10018' },
          'ceo_approved',
          emptyContext
        )
      )

      expect(result).toBeNull()
    })
  })
})
