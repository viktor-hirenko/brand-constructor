import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeTextareaAutosize } from '@/components/ui/uiField'

/**
 * ── «Загальний коментар» opens low — DP-15450, CEO view 1 ───────────────────
 *
 * Her words: «Поле "Загальний коментар" займає надто багато висоти. →
 * Зменшити висоту textarea до 112 px. При великому обсязі тексту — може бути
 * auto-grow, а потім з'являється внутрішній scroll.»
 *
 * It used to open at six lines: 6 × 24 + the Area box's own 24 = **168**.
 *
 * 112 is not a whole number of 24-line rows (3 ⅔ of one), so the floor is the
 * BOX's: three rows of content inside a box that cannot go under `min-h-28`
 * = 7rem = 112 at the 1440 canvas. A px literal would not scale with the
 * embed, where the root font is ~13 and a line is ~19.5 — the mistake
 * `UiTextarea` was written to avoid.
 *
 * **Owner 30.09 chose the drawing: 96.** Her drawn CEO screen puts this Input at 96 — the kit's
 * floor, 128 counting the Title above it. 112 is what her written remark asks
 * for, and that is the number implemented; the divergence is recorded in
 * `docs/design-audit/dp-15450-bugs.md`. A session that later moves this to 96
 * is not wrong — but it must do it on purpose, which is why both numbers are
 * written down here.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const block = read('components/constructor/fields/SectionCommentBlock.vue')
const uiField = read('components/ui/uiField.ts')

describe('the general CEO comment opens at the drawn 96, not at 112 or 168', () => {
  it('starts at three rows of content, not six', () => {
    expect(block).toContain('const CEO_GENERAL_COMMENT_MIN_ROWS = 3')
    expect(block).not.toContain('const CEO_GENERAL_COMMENT_MIN_ROWS = 6')
  })

  it('keeps the kit Area floor of 96 — no 112 override (owner 30.09, drawing `5387:79023`)', () => {
    expect(uiField).toContain('min-h-24')
    expect(block).not.toContain('min-h-28')
    expect(block).not.toContain('CEO_GENERAL_COMMENT_MIN_HEIGHT_CLASS')
  })
})

describe('above the floor the field grows, then scrolls inside itself', () => {
  const LINE = 24
  const PADDING = 0 // the Area's padding is on the box, not on the control

  const grow = (lines: number) =>
    computeTextareaAutosize(lines * LINE, LINE, 3, 12, PADDING)

  it('an empty field and a three-line one are the same height', () => {
    expect(grow(1).heightPx).toBe(72)
    expect(grow(3).heightPx).toBe(72)
    expect(grow(1).overflowY).toBe('hidden')
  })

  it('a longer comment grows the field', () => {
    expect(grow(6).heightPx).toBe(144)
    expect(grow(6).overflowY).toBe('hidden')
  })

  it('past twelve lines it stops growing and scrolls inside', () => {
    expect(grow(12).heightPx).toBe(288)
    expect(grow(40).heightPx).toBe(288)
    expect(grow(40).overflowY).toBe('auto')
  })

  it('the cap she asked to keep is still twelve lines', () => {
    expect(block).toContain('const CEO_GENERAL_COMMENT_MAX_ROWS = 12')
  })
})
