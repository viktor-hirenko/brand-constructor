import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

vi.mock('@/composables/useApi', () => ({
  apiErrorStatus: (err: unknown) => (err as { status?: number })?.status,
}))

/**
 * H-41 (T-083) and H-52 (U-13): a direct link to a brief the person may not
 * open. The server answers «not found» — a second Product Owner on another
 * author's draft, Strategy on a brief «В роботі» — and the router used to send
 * both to the wizard landing: PO2 saw «Бриф на створення бренду» with «Order
 * New Brand», Strategy an empty landing with one «Закрити». Only the CEO had a
 * stub that explained anything («Бриф ще в роботі»).
 *
 * Shown red by putting back `router/index.ts` and the CEO stub and taking the
 * new view and `router/briefLoadFailure.ts` away.
 */

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/** Everything below the doc comments — so a word quoted in prose is not a hit. */
function code(source: string): string {
  return source
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

async function redirectFor(err: unknown) {
  const { briefLoadFailureRedirect } = await import('@/router/briefLoadFailure')
  return briefLoadFailureRedirect(err)
}

describe('a brief that fails to load — where the link goes', () => {
  it('sends «not found» to the no-access stub, not to the landing', async () => {
    expect(await redirectFor(httpError(404))).toEqual({ name: 'brief-no-access' })
  })

  it('sends «forbidden» there too', async () => {
    expect(await redirectFor(httpError(403))).toEqual({ name: 'brief-no-access' })
  })

  it('keeps no connection and server errors on the landing — they say nothing about access', async () => {
    expect(await redirectFor(new Error('Немає звʼязку'))).toEqual({ path: '/' })
    expect(await redirectFor(httpError(500))).toEqual({ path: '/' })
  })
})

describe('router — both ways into a brief use it', () => {
  const router = existsSync(`${SRC}router/index.ts`) ? code(read('router/index.ts')) : ''

  it('no brief load falls back to the landing on its own any more', () => {
    expect(router).not.toMatch(/catch\s*\{\s*return \{ path: '\/' \}/)
    // `/constructor/brand/:id` and `/constructor/step/N?brand=<id>`.
    expect(router.match(/return briefLoadFailureRedirect\(err\)/g)).toHaveLength(2)
  })

  it('registers the stub screen', () => {
    expect(router).toContain("path: '/constructor/no-access'")
    expect(router).toContain('name: BRIEF_NO_ACCESS_ROUTE_NAME')
    expect(router).toContain("import('@/views/BriefNoAccessView.vue')")
  })
})

describe('the no-access stub', () => {
  const viewPath = `${SRC}views/BriefNoAccessView.vue`
  const view = existsSync(viewPath) ? code(readFileSync(viewPath, 'utf8')) : ''

  it('exists', () => {
    expect(existsSync(viewPath)).toBe(true)
  })

  it('says what happened, in the CEO stub’s look', () => {
    expect(view).toContain('<SupervisorBriefGateView')
    expect(view).toContain('title="Немає доступу до цього брифу"')
    expect(view).toContain(
      'description="Цей бриф належить іншому автору або зараз недоступний для вашої ролі."'
    )
  })

  it('leaves the way the header cross does, labelled after where it goes', () => {
    expect(view).toContain('До списку брендів')
    expect(view).toContain('@click="handleBackToBrands"')
    const start = view.indexOf('function handleBackToBrands(')
    expect(start).toBeGreaterThan(-1)
    const body = view.slice(start, view.indexOf('\n}', start))
    expect(body).toContain('isEmbedded()')
    expect(body).toContain('postClose()')
    expect(body.indexOf('postClose()')).toBeLessThan(body.indexOf("router.push('/')"))
  })
})

describe('the CEO «Бриф ще в роботі» stub stays as it was', () => {
  const gate = code(read('components/constructor/review/SupervisorBriefGateView.vue'))
  const shell = code(read('views/BriefShellView.vue'))

  it('keeps its words as the defaults', () => {
    expect(gate).toContain("title: 'Бриф ще в роботі'")
    expect(gate).toContain(
      'CEO-ревʼю буде доступне після того, як Product Owner обере готовий концепт і відправить бриф на погодження.'
    )
  })

  it('is still shown by the shell with no words or buttons of its own', () => {
    expect(shell).toContain('<SupervisorBriefGateView v-if="isSupervisorAwaitingTeam" />')
  })
})
