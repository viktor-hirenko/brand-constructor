import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NETWORK_ERROR_TEXT, apiErrorStatus, apiGet, apiPost, apiPut } from '@/composables/useApi'
import { briefChangedElsewhereCopy, isBriefChangedElsewhere } from '@/utils/briefChangedElsewhere'

/**
 * H-06 and the silent 409 of H-29 (run 02.10: D-30, D-31, D-32, D-61). A save
 * that failed on a wizard step said nothing — «Далі» just stayed where it was —
 * and where an error was shown it was the browser's own «Failed to fetch».
 *
 * Two halves: the request layer names a lost connection in words, and every
 * screen that saves shows `store.saveError`. Components cannot be mounted here
 * (`environment: 'node'`), so the second half reads the sources.
 */

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string) =>
  readFileSync(`${SRC}${path}`, 'utf8')
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Spelled out, not imported: on the old code the import is `undefined` and `toThrow(undefined)` accepts any error. */
const NO_CONNECTION = 'Немає звʼязку. Перевірте інтернет і спробуйте ще раз.'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a lost connection is named in words, not in the browser’s', () => {
  // Chromium, Safari, Firefox — the three texts `fetch` rejects with.
  it.each(['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'])(
    'replaces «%s»',
    async browserText => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(browserText)))

      await expect(apiPut('/api/brands/b1', {})).rejects.toThrow(NO_CONNECTION)
      await expect(apiPost('/api/brands', {})).rejects.toThrow(NO_CONNECTION)
      await expect(apiGet('/api/brands/b1')).rejects.toThrow(NO_CONNECTION)
    },
  )

  it('uses the wording the Admin already has', () => {
    expect(NETWORK_ERROR_TEXT).toBe(NO_CONNECTION)
  })

  it('passes the server’s own answer through as it is (409 of D-61)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(409, { success: false, error: 'Бриф змінено — оновіть сторінку.' }),
      ),
    )

    await expect(apiPut('/api/brands/b1', {})).rejects.toThrow('Бриф змінено — оновіть сторінку.')
  })

  it('keeps the HTTP status on the error, so a 409 can be told from the rest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(409, { success: false, error: 'x' })))
    const err = await apiPut('/api/brands/b1', {}).catch(e => e)
    expect(apiErrorStatus(err)).toBe(409)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(apiErrorStatus(await apiPut('/api/brands/b1', {}).catch(e => e))).toBeUndefined()
  })
})

describe('one look for the error line: red text under the buttons (kit note 4378:16948)', () => {
  it('Final review: a line after the action buttons, not a pink box above them', () => {
    const review = read('components/constructor/review/ReviewUnifiedView.vue')
    const line = review.indexOf('class="review-unified-view__error text-center text-sm text-red-600"')
    expect(line).toBeGreaterThan(-1)
    expect(line).toBeGreaterThan(review.indexOf('<AuthorActionsFooter'))
    expect(line).toBeGreaterThan(review.indexOf('<SupervisorActionsFooter'))
    expect(review).not.toContain('bg-red-50')
  })

  it('landing: the same red under «Order New Brand»', () => {
    expect(read('views/LandingView.vue')).toContain('<p v-if="actionError" class="mt-3 text-sm text-red-600">')
  })
})

describe('the brief was sent from another tab — a window, not an error line (D-61)', () => {
  it('a 409 means a stale tab only when the status on the server is another one', () => {
    expect(isBriefChangedElsewhere('draft', 'submitted')).toBe(true)
    expect(isBriefChangedElsewhere('submitted', 'needs_revision')).toBe(true)
    expect(isBriefChangedElsewhere('draft', 'draft')).toBe(false)
    expect(isBriefChangedElsewhere('draft', undefined)).toBe(false)
  })

  it('says what happened and leaves one action', () => {
    const sent = briefChangedElsewhereCopy('submitted')
    expect(sent.title).toBe('Бриф уже відправлено')
    expect(sent.body).toContain('на погодження CEO')
    expect(sent.body).toContain('Зміни з цієї вкладки не збережено')
    expect(sent.primaryLabel).toBe('Оновити сторінку')
    expect(briefChangedElsewhereCopy('approved').title).toBe('Бриф змінено')
  })

  it('the shell shows it over any wizard screen and reloads the brief', () => {
    const shell = read('views/BriefShellView.vue')
    expect(shell).toContain('v-if="changedElsewhereCopy"')
    expect(shell).toContain('@close="reloadChangedBrief"')
    expect(shell).toMatch(/function reloadChangedBrief\(\)[\s\S]*?window\.location\.assign\(/)
  })

  it('both ways a stale tab can write ask the server first: save and the status action', () => {
    const data = read('stores/constructor/useBrandData.ts')
    expect(data).toMatch(/catch \(error\) \{\s*if \(await detectChangedElsewhere\(error\)\) return false/)
    expect(read('views/wizard/BriefReviewView.vue')).toMatch(/catch \(err\) \{\s*(\/\/[^\n]*\s*)?if \(await store\.detectChangedElsewhere\(err\)\) return/)
  })
})

describe('a failed save is shown on every screen that saves', () => {
  const ERROR_LINE = /<p v-if="store\.saveError" class="text-sm text-red-600">\s*\{\{ store\.saveError \}\}\s*<\/p>/

  it('wizard steps: the «Далі» footer carries the same line as the section edit', () => {
    const shell = read('views/BriefShellView.vue')
    const footers = shell.slice(shell.indexOf('<template #left-footer>'), shell.indexOf('<template #right>'))
    const stepFooter = footers.slice(footers.indexOf('primary-label="Далі"'))
    const editFooter = footers.slice(footers.indexOf('primary-label="Зберегти"'), footers.indexOf('primary-label="Повернутись"'))

    expect(stepFooter).toMatch(ERROR_LINE)
    expect(editFooter).toMatch(ERROR_LINE)
  })

  it.each([
    'views/draft-edit/DraftConceptEditView.vue',
    'views/draft-edit/DraftExternalNamingEditView.vue',
    'views/revision-response/RevisionConceptView.vue',
    'views/revision-response/RevisionExternalNamingView.vue',
    'views/revision-response/RevisionInternalNamingView.vue',
  ])('%s shows it under the buttons', path => {
    const view = read(path)
    expect(view).toContain('store.saveBrand()')
    // Under the buttons, not at the end of the scrolling body: below a long
    // list of names the line was off screen.
    const footer = view.slice(view.indexOf('<UiFooter'), view.indexOf('</UiFooter>'))
    expect(footer).toMatch(ERROR_LINE)
    expect(view.match(new RegExp(ERROR_LINE, 'g'))).toHaveLength(1)
  })

  it('no screen walks away from a save without looking at its result', () => {
    for (const path of [
      'views/BriefShellView.vue',
      'views/draft-edit/DraftConceptEditView.vue',
      'views/draft-edit/DraftExternalNamingEditView.vue',
      'views/revision-response/RevisionConceptView.vue',
      'views/revision-response/RevisionExternalNamingView.vue',
      'views/revision-response/RevisionInternalNamingView.vue',
    ]) {
      const ignored = read(path)
        .split('\n')
        .filter(line => /^\s*await store\.saveBrand\(\)\s*$/.test(line))
      expect(ignored, path).toEqual([])
    }
  })

  it('the line does not follow the user to another screen', () => {
    const shell = read('views/BriefShellView.vue')
    expect(shell).toMatch(/watch\(\s*\(\) => route\.path,\s*\(\) => \{\s*store\.saveError = null\s*\}/)
  })
})
