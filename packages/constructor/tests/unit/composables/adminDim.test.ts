import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { combineDimAlpha, createAdminDimRegistry, type AdminDimState } from '@/composables/useAdminDim'
import { UI_MODAL_BACKDROP_ALPHA, UI_MODAL_BACKDROP_CLASS } from '@/components/ui/uiModal'

/**
 * DP-15450, Concept Selection 6 — «Overlay модалки має затемнювати весь
 * viewport, включно з header. Аналогічно з усіма модалками.»
 *
 * Her modal `5374:25673` darkens the whole 1440 screen, the Admin's left menu
 * included. The wizard lives in an iframe, so every wizard backdrop now reports
 * its darkness to the Admin (`useAdminDim.ts`), which lays the same black over
 * its own menu and bar. What can regress silently, and is pinned below: the
 * arithmetic, a backdrop that stops reporting, a reported alpha that drifts
 * from the black actually painted, and a NEW backdrop added without reporting.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

describe('combineDimAlpha — stacked blacks compose, they do not add', () => {
  it('passes a single backdrop through', () => {
    expect(combineDimAlpha([0.5])).toBe(0.5)
  })
  it('makes a confirmation over a form 75% dark, as it is inside the wizard', () => {
    expect(combineDimAlpha([0.5, 0.5])).toBe(0.75)
  })
  it('is 0 with nothing open, and ignores junk', () => {
    expect(combineDimAlpha([])).toBe(0)
    expect(combineDimAlpha([0, Number.NaN, -1])).toBe(0)
  })
})

describe('the registry', () => {
  function setup() {
    const sent: AdminDimState[] = []
    return { sent, reg: createAdminDimRegistry(s => sent.push(s)) }
  }

  it('reports on open and clears on close', () => {
    const { sent, reg } = setup()
    const release = reg.hold({ alpha: 0.5, fadeMs: 250 })
    expect(sent.at(-1)).toEqual({ alpha: 0.5, fadeMs: 250 })
    release()
    expect(sent.at(-1)).toEqual({ alpha: 0, fadeMs: 250 })
  })

  it('a second release does not clear someone else’s dim', () => {
    const { sent, reg } = setup()
    const a = reg.hold({ alpha: 0.5 })
    reg.hold({ alpha: 0.5 })
    a()
    a()
    expect(reg.size()).toBe(1)
    expect(sent.at(-1)?.alpha).toBe(0.5)
  })

  it('sends a click on the Admin’s dark area to the TOP backdrop only', () => {
    const { reg } = setup()
    const hits: string[] = []
    reg.hold({ alpha: 0.5, onBackdrop: () => hits.push('form') })
    reg.hold({ alpha: 0.5, onBackdrop: () => hits.push('confirm') })
    reg.backdropClick()
    expect(hits).toEqual(['confirm'])
  })
})

describe('every wizard backdrop reports the black it paints', () => {
  it('modals: the number is the class', () => {
    expect(UI_MODAL_BACKDROP_CLASS).toMatch(/\bbg-black\/50\b/)
    expect(UI_MODAL_BACKDROP_ALPHA).toBe(0.5)
    const modal = read('components/ui/UiModal.vue')
    expect(modal).toContain(
      'useAdminDim({ alpha: UI_MODAL_BACKDROP_ALPHA, onBackdrop: handleBackdrop })',
    )
  })

  it('the concept drawer’s backdrop', () => {
    const src = read('components/constructor/layout/LayoutPreviewOverlays.vue')
    expect(src).toMatch(/\bbg-black\/50\b/)
    expect(src).toMatch(
      /useAdminDimWhile\(\(\) => store\.conceptPreviewOpen && overlayConcept\.value !== null, \{\s*alpha: 0\.5,\s*fadeMs: 250,\s*onBackdrop: \(\) => store\.closeConceptPreview\(\),/,
    )
  })

  it('the narrow-embed preview drawer', () => {
    const src = read('components/constructor/layout/ConstructorDualPaneShell.vue')
    expect(src).toContain('background-color: rgba(0, 0, 0, 0.45);')
    expect(src).toMatch(
      /useAdminDimWhile\(\(\) => isDrawerMode\.value && isPreviewOpen\.value, \{\s*alpha: 0\.45,\s*fadeMs: 250,\s*onBackdrop: closePreview,/,
    )
  })

  it('the full-screen slide view', () => {
    const src = read('components/constructor/preview/ConceptPreviewSlider.vue')
    expect(src).toMatch(/\bbg-black\/60\b/)
    expect(src).toMatch(
      /useAdminDimWhile\(\(\) => showExpanded\.value && !!currentSlideUrl\.value && !!props\.concept, \{\s*alpha: 0\.6,\s*onBackdrop: closeExpanded,/,
    )
  })

  it('no full-cover black exists anywhere else — a new one must report too', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap(name => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return walk(p)
        return /\.(vue|ts)$/.test(name) ? [p] : []
      })
    const cover = /inset-0[^'"`\n]*\bbg-black\/\d+|\bbg-black\/\d+[^'"`\n]*inset-0/
    const found = walk(SRC)
      .filter(f => cover.test(readFileSync(f, 'utf8')))
      .map(f => relative(SRC, f))
      .sort()
    expect(found).toEqual([
      'components/constructor/layout/LayoutPreviewOverlays.vue',
      'components/constructor/preview/ConceptPreviewSlider.vue',
      'components/ui/uiModal.ts',
    ])
  })
})

describe('the bridge carries it', () => {
  const bridge = read('composables/useEmbedBridge.ts')
  it('declares the dim message and sends it only through postDim', () => {
    expect(bridge).toMatch(/type: 'ready' \| 'done' \| 'auth-required' \| 'navigated' \| 'close' \| 'dim' \| 'immersive';/)
    expect(bridge).toContain("post('dim', payload);")
  })
  it('accepts the Admin’s click only from the same origin and the Admin itself', () => {
    expect(bridge).toContain('if (event.origin !== window.location.origin) return;')
    expect(bridge).toContain(
      "if (!data || data.source !== 'brand-admin' || data.type !== 'backdrop-click') return;",
    )
  })
  it('the registry is wired to both directions', () => {
    const dim = read('composables/useAdminDim.ts')
    expect(dim).toContain('registry = createAdminDimRegistry(postDim)')
    expect(dim).toContain('onAdminBackdropClick(() => registry?.backdropClick())')
  })
})
