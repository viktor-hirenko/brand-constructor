import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ── The concept preview is a DRAWER, DP-15450, the owner's call ──────────────
 *
 * It slides in from the right edge of the window and takes the full height of
 * it, at every width. That is the whole of the rule, and it exists because the
 * opposite was built and rejected on sight.
 *
 * What was built: the panel was moved INSIDE the row of columns so that it
 * would be the right column exactly — same width, same height, clipped to the
 * frame. On a 1680 screen that looked the same as before. On a 2560 one, where
 * the wizard sits in its own 1700-wide frame, the drawer became a card floating
 * inside that frame with grey beside it and the wizard's own cross above its
 * own — a modal, not a drawer. The owner's words: «на небольших десктопах дровер
 * выезжает справа, занимая всю высоту вьюпорта; на огромных экранах он просто
 * появляется как модальное окно».
 *
 * So the thing to pin is not "it matches the column" but "it is anchored to the
 * WINDOW": mounted at the shell root, `top-0`, `h-full`, `right-0`. A future
 * session reading "the drawer should line up with the frame" will find this
 * test in the way, and that is deliberate.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const shell = read('components/constructor/layout/ConstructorDualPaneShell.vue')
const overlays = read('components/constructor/layout/LayoutPreviewOverlays.vue')
const drawer = read('components/constructor/preview/ConceptGalleryDrawer.vue')
const view = read('views/BriefShellView.vue')

describe('the drawer is anchored to the window, not to the frame', () => {
  it('is mounted in the shell root slot, beside the backdrop', () => {
    expect(view).toContain('<template #overlays>')
    expect(view).toContain('<ConceptGalleryDrawer />')
    expect(view).toContain('<LayoutPreviewOverlays />')
  })

  it('the shell offers no slot inside the row for it to drift back into', () => {
    // The row-level slot existed for exactly one commit. Bringing it back is
    // how the drawer turns into a modal on a wide screen again.
    expect(shell).not.toContain('frame-overlays')
    expect(shell).toContain('<slot name="overlays" />')
  })

  it('that slot sits OUTSIDE the row and outside the frame regime wrapper', () => {
    const rowOpen = shell.indexOf('constructor-dual-pane-shell__frame')
    const slot = shell.indexOf('<slot name="overlays" />')
    const between = shell.slice(rowOpen, slot)
    // The row and the wrapper around it are both closed before the slot opens.
    expect((between.match(/<\/div>/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('takes the full height of the window and its right edge', () => {
    expect(drawer).toContain('absolute right-0 top-0 h-full')
    expect(drawer).toContain('z-[29]')
  })

  it('takes the measured column width, not a hardcoded share', () => {
    expect(drawer).toContain('--wizard-right-pane-width')
    expect(drawer).not.toMatch(/w-\[58%\]/)
  })

  it('never comes out narrower than half the wizard', () => {
    // Above 1920 the column stops growing with the window — 904 of 2350 at
    // 2560, 38% — and the picture inside is then capped by the width while a
    // third of the drawer stands empty. The floor is what stops that; at the
    // designer's own widths the column is already just over half, so it binds
    // on the big screen only.
    expect(drawer).toContain('w-[max(var(--wizard-right-pane-width,58%),50%)]')
  })

  it('slides in from the edge — it is a drawer, not a modal', () => {
    expect(drawer).toContain('.concept-panel-enter-from')
    expect(drawer).toContain('translateX(100%)')
    // A modal would fade or scale from the middle; neither belongs here.
    expect(drawer).not.toContain('scale(')
  })
})

describe('the backdrop still dims the whole wizard', () => {
  it('covers everything, header included (Concept Selection 6)', () => {
    expect(overlays).toContain('absolute inset-0 z-[28] bg-black/50')
    expect(overlays).toContain('concept-backdrop')
  })

  it('stays under the panel', () => {
    const backdropZ = Number(/z-\[(\d+)\] bg-black\/50/.exec(overlays)?.[1])
    const panelZ = Number(/z-\[(\d+)\]/.exec(drawer)?.[1])
    expect(backdropZ).toBe(28)
    expect(panelZ).toBeGreaterThan(backdropZ)
  })

  it('both still close on the same store action', () => {
    expect(overlays).toContain('store.closeConceptPreview()')
    expect(drawer).toContain('store.conceptPreviewOpen')
  })
})
