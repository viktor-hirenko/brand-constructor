import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Review screen (step 8) against the current canvas — DP-15258, review work.
 *
 * Screens measured: `5387:91764` (author), `5387:78989` (CEO), `5387:83810`
 * (CEO, comments required). Component tests are impossible in this package (no
 * `@vue/test-utils`, no `jsdom`, `vitest.config.ts:11` sets `environment:
 * 'node'`), so this file reads the four `.vue` files and the router as text —
 * the same idiom as `constants/conceptCardVisual.test.ts` and
 * `constants/editFlowLayout.test.ts`.
 *
 * What it pins is the set of hexes and recipes that were invented here before
 * the kit existed. Verified to fail by putting each of them back: the
 * hand-built info box, the amber `#DCA100` warning, the dashed `#373737`
 * button, the two footer icons the kit switches off, and the 32 gap phase 18
 * took off the old canvas.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const header = read('components/constructor/review/ReviewHeader.vue')
const footer = read('components/constructor/review/SupervisorActionsFooter.vue')
const comment = read('components/constructor/fields/SectionCommentBlock.vue')
const view = read('components/constructor/review/ReviewUnifiedView.vue')
const router = read('router/index.ts')

/** Everything below the doc comment — so a hex quoted in prose is not a hit. */
function body(source: string): string {
  return source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

describe('info block is the kit Alert — Figma 3461:5237', () => {
  it('renders UiAlert and writes no box of its own', () => {
    expect(header).toContain('<UiAlert')
    // Warning (yellow) and, since brief-orders phase 2b, Info (blue) are the kit's
    // own Alert types; everything else is Default.
    expect(header).toContain(":type=\"displayInfo.iconVariant === 'warning' || displayInfo.iconVariant === 'info' ? displayInfo.iconVariant : 'default'\"")
  })

  it('drops the hand-built surface: #EDEDED, padding 24, 14/20 description', () => {
    // The kit alert is padding 16, description 16/24, text column at 52 —
    // all of it inside `ui/uiAlert.ts`, none of it here.
    expect(body(header)).not.toContain('#EDEDED')
    expect(body(header)).not.toContain('px-6 py-6')
    expect(body(header)).not.toContain('pl-9')
    expect(body(header)).not.toContain('text-sm')
    // Its letter-spacing is covered by the tree-wide sweep in
    // `styles/legacyScss.test.ts`.
  })

  it('keeps the glyph read off the render, not off the layer name', () => {
    // Both drawn screens show Phosphor `CheckCircle` Regular = CheckBadgeIcon.
    expect(header).toContain('CheckBadgeIcon')
    expect(header).toContain('InfoCircleFilledIcon')
  })
})

describe('#DCA100 is gone from the review screen', () => {
  it('leaves no amber literal in the header or the footer', () => {
    expect(body(header)).not.toContain('#DCA100')
    expect(body(footer)).not.toContain('#DCA100')
  })
})

describe('CEO warning row — Figma 5387:83849', () => {
  it('is caption/l 14/16 in alert/icon/error #ce2c31 with a 16 icon, 4 apart', () => {
    expect(body(footer)).toContain('gap-1 text-sm/4')
    expect(body(footer)).toContain('text-red-content')
    expect(body(footer)).toContain('size-4 shrink-0')
  })

  it('drops the old 16/24 amber rendering', () => {
    expect(body(footer)).not.toContain('text-[1rem]')
    expect(body(footer)).not.toContain('rgba(10,10,10,0.80)')
    expect(body(footer)).not.toContain('size-5')
  })

  it('draws no icon on either button — the kit switches both slots off', () => {
    // `5387:83847` / `5387:83848`: Icon left and Icon right both hidden.
    expect(body(footer)).not.toContain('primary-icon')
    expect(body(footer)).not.toContain('cancel-icon')
    expect(footer).not.toContain('CheckIcon')
    expect(footer).not.toContain('RefreshIcon')
  })
})

describe('the concept tiles are framed the way the kit frames an empty box', () => {
  it('draws a solid 1px #eaeaeb, never a dashed rule — row 104', () => {
    // Visible only where a concept has no picture: the tile draws a rectangle
    // with the name in it instead. Three of them, all in one file. The only
    // empty state the kit draws (`Type=Placeholder` `4492:11680`) is a SOLID
    // 1px `#eaeaeb`, so the dashed `black/15` frame was in no kit section.
    const block = read('components/constructor/review/ReviewConceptBlock.vue')
    expect(body(block)).not.toContain('border-dashed')
    expect(body(block).match(/border border-ink-300 px-4 py-6/g) ?? []).toHaveLength(3)
  })

  it('leaves no dashed rule anywhere else in the wizard either', () => {
    const files = [
      'components/constructor/review/ReviewConceptBlock.vue',
      'components/constructor/preview/ConceptMobilePreview.vue',
      'components/constructor/preview/ConceptPreviewSlider.vue',
    ]
    for (const file of files) {
      expect(body(read(file))).not.toContain('border-dashed')
    }
  })
})

describe('"+ Коментар CEO" is the kit Secondary M — Figma 3760:2310', () => {
  it('is a UiButton, not a dashed frame with two #373737', () => {
    expect(comment).toContain('<UiButton')
    expect(comment).toContain('variant="secondary"')
    expect(comment).toContain('size="M"')
    expect(body(comment)).not.toContain('border-dashed')
    expect(body(comment)).not.toContain('#373737')
    expect(body(comment)).not.toContain('#C97D00')
  })

  it('keeps the validation highlight on the kit amber border', () => {
    // The kit gives this button no invalid state; the highlight is ours and
    // borrows `amber/border` #e9c162, the same one the editor below uses.
    expect(comment).toContain("highlighted ? 'border-amber-border!' : ''")
  })
})

describe('vertical rhythm of the screen — current canvas, not 4492', () => {
  it('puts 24 between header, cards, general comment and footer', () => {
    // `5387:91764`: header ends 192, list opens 216. `5387:83810`: 160 → 184,
    // list ends 2583.5 → Input 2607.5, Input ends 2735.5 → footer 2759.5.
    expect(view).toContain("'review-unified-view__scroll-inner flex flex-col gap-6 pt-8 pb-8',")
    expect(view).not.toContain('scroll-inner flex flex-col gap-8')
  })

  it('leaves the cards 16 apart, which both canvases agree on', () => {
    expect(view).toContain('review-unified-view__sections space-y-4')
  })
})

describe('step 8 header text — Figma 5387:91772', () => {
  it('names the step Final review with the kit sentence under it', () => {
    expect(view).toContain("return 'Final review'")
    expect(view).toContain("'Перевірте всі дані перед відправкою.'")
  })

  it('carries the kit alert text, read off the render', () => {
    // The description node is still *named* after the sentence it used to hold.
    expect(view).toContain("title: 'Бриф готовий',")
    expect(view).toContain(
      "description: 'Ви можете повернутись та змінити будь-який розділ перед відправкою.',"
    )
  })

  it('stops the router calling step 8 "Save"', () => {
    expect(router).not.toContain("title: 'Save'")
    expect(router).not.toContain("subtitle: 'Фінальний огляд'")
  })
})
