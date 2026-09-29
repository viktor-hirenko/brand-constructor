import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  UI_ACCORDION_HEADER_ACTION_CLASS,
  UI_ACCORDION_HEADER_TITLE_GROUP_CLASS,
  UI_ACCORDION_ICON_SIZE_CLASS,
} from '@/components/ui/uiAccordion'

/**
 * ── Step 7's Sidebar control — DP-15450, `visual components` 2 and 4
 *
 * Her two remarks, word for word from the board:
 *
 * > **2 · LOW** · Поточна анімація появи Sidebar (знизу вгору) може плутати.
 * > → Прибрати анімацію появи Sidebar.
 *
 * > **4 · MEDIUM** · Керування Sidebar у preview зараз неочевидне:
 * > інтерактивний хрестик дублює хрестик у PNG, а кнопка повторного відкриття
 * > виглядає дивно. → Прибрати інтерактивний хрестик і окрему кнопку в
 * > preview. Додати eye / eye-off біля рядка Sidebar для показу/приховування
 * > компонента. Хрестик у PNG лишити неінтерактивним.
 *
 * Her drawing is `5382:33712`, the «Макет» beside the visual components table
 * on the board. Measured off it:
 *
 *   the eye     the kit's `Visibility Icon` slot `I5382:33737;5352:37363`
 *               inside the «Sidebar» accordion header — a bare 16 glyph,
 *               `spacing/8` from the `Type A` badge and from the chevron
 *   the phone   nothing over it. The `Menu ×` is part of the render
 *   the layer   present, with no trace of an entry animation
 *
 * ── Two things this file exists to stop coming back
 *
 * **One: the glyph names the state, not the action.** Both of her step-7
 * screens agree — `5382:33712` shows the layer over the phone with a PLAIN
 * eye, `5382:64114` shows the phone without it and a CROSSED one. The floating
 * button that used to do this job read the other way round, so anyone matching
 * the new row against the old code will read the inversion as a bug. It is her
 * drawing, twice.
 *
 * **Two: the accordion header is a row of three, not one button.** Her slot
 * sits between the title and the chevron, and HTML forbids a button inside a
 * button — so the title group and the chevron each became their own button
 * onto the same `toggle`. Folding them back into one whole-row button is the
 * obvious "tidy-up", and it makes the eye unclickable.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

/** Comments quote the removed markup on purpose; the guards must not see it. */
const withoutComments = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

const rightPanel = withoutComments(read('components/constructor/layout/StepPreviewRightPanel.vue'))
const shell = withoutComments(read('views/BriefShellView.vue'))
const stepSeven = withoutComments(read('views/wizard/VisualComponentsView.vue'))
const accordionItem = withoutComments(read('components/ui/UiAccordionItem.vue'))
const phoneSidebar = withoutComments(read('components/constructor/preview/PhonePreviewSidebar.vue'))
const context = withoutComments(read('composables/visualComponentPreviewContext.ts'))

describe('visual components 2 — the Sidebar no longer slides up', () => {
  it('draws the layer with a plain v-if, not a Transition', () => {
    expect(rightPanel).toContain('v-if="step7OverlaySlice && step9SidebarVisible"')
    expect(rightPanel).not.toContain('<Transition')
    expect(rightPanel).not.toContain('sidebar-slide')
  })

  it('keeps no trace of the 0.3s translateY that carried it', () => {
    // The rule lived in this file's own `<style scoped>`. Tailwind v4 reads
    // comments and prints live css out of them — the lesson work 6 paid for —
    // so the animation must be absent from the raw file too, not just from the
    // markup with comments stripped.
    const raw = read('components/constructor/layout/StepPreviewRightPanel.vue')
    expect(raw).not.toContain('translateY(100%)')
    expect(raw).not.toContain('cubic-bezier(0.4, 0, 0.2, 1)')
    expect(raw).not.toContain('<style')
  })

  it('drops the flag every caller had to pass to say "animate this one"', () => {
    // `setSidebarPreviewVisible(visible, animate)` existed only to drive the
    // Transition's `:css`. Leaving the argument behind would leave a dozen
    // call sites arguing about an animation that no longer exists.
    expect(shell).not.toContain('step9SidebarSlideAnimated')
    expect(shell).toMatch(/function setSidebarPreviewVisible\(visible: boolean\)/)
    expect(rightPanel).not.toContain('step9SidebarSlideAnimated')
  })

  it('drops the pinned slice that only existed to outlive the slide-out', () => {
    // When the Sidebar variant was deselected the old layer was pinned so it
    // could animate away, and `@after-leave` cleared it. With no animation
    // there is no "away", and a pin with no hook to clear it is a leak.
    expect(shell).not.toContain('pinnedSidebarSlice')
    expect(shell).not.toContain('buildOverlaySliceForVariant')
    expect(rightPanel).not.toContain('sidebar-slide-leave-complete')
    expect(shell).toContain('const step7OverlaySlice = computed(() => getOverlaySlice())')
  })
})

describe('visual components 4 — the eye moved into the Sidebar row', () => {
  it('leaves nothing floating over the phone render', () => {
    expect(rightPanel).not.toContain('UiIconButton')
    expect(rightPanel).not.toContain('EyeIcon')
    expect(rightPanel).not.toContain('EyeSlashIcon')
    expect(rightPanel).not.toContain('toggle-sidebar')
    // The panel still obeys the state; it simply no longer owns the control.
    expect(rightPanel).toContain('step9SidebarVisible')
  })

  it('renders the control in the accordion row, in the kit action slot', () => {
    expect(stepSeven).toContain('#actions')
    expect(stepSeven).toContain(`type.id === SIDEBAR_TYPE_ID && canToggleSidebarPreview`)
    expect(stepSeven).toContain('previewContext?.toggleSidebarPreview()')
    expect(stepSeven).toContain('UI_ACCORDION_HEADER_ACTION_CLASS')
  })

  it('shows it only once a Sidebar variant is picked, and never when delegated', () => {
    // The floating button had exactly this condition: with nothing picked
    // there is no layer to show or hide.
    expect(stepSeven).toMatch(
      /canToggleSidebarPreview = computed\(\s*\(\) =>\s*previewContext !== null && !isDelegated\.value && Boolean\(selections\.value\[SIDEBAR_TYPE_ID\]\)/,
    )
  })

  it('names the STATE with the glyph — plain eye while the layer is shown', () => {
    // Inverted from the floating button on purpose; see the header of this
    // file. `kitIconPlacement.test.ts` pins the same pair by use case.
    const shown = stepSeven.indexOf('<EyeIcon')
    const hidden = stepSeven.indexOf('<EyeSlashIcon')
    expect(shown).toBeGreaterThan(-1)
    expect(hidden).toBeGreaterThan(-1)
    expect(stepSeven).toMatch(/<EyeIcon\s+v-if="isSidebarPreviewVisible"/)
    expect(stepSeven).toMatch(/<EyeSlashIcon v-else/)
  })

  it('reads the state from the shell instead of keeping a second copy', () => {
    expect(context).toContain('sidebarVisible: Ref<boolean>')
    expect(context).toContain('toggleSidebarPreview: () => void')
    expect(shell).toContain('sidebarVisible: step9SidebarVisible')
    expect(shell).toContain('toggleSidebarPreview,')
  })

  it('leaves the × in the PNG with nothing listening to it', () => {
    // «Хрестик у PNG лишити неінтерактивним» — it is pixels in the render, and
    // the overlay must never grow a control of its own.
    expect(phoneSidebar).not.toContain('<button')
    expect(phoneSidebar).not.toContain('@click')
    expect(phoneSidebar).not.toMatch(/@(pointer|mouse|touch|key)/)
    expect(phoneSidebar).not.toMatch(/\bemit\(/)
  })
})

describe('the accordion header that had to stop being one button', () => {
  it('is a row holding two buttons and the action slot between them', () => {
    expect(accordionItem).toContain('<slot name="actions" />')
    // The markup binds the constant by name, so the anchor is the binding —
    // and the import line above it is skipped by starting from the template.
    const template = accordionItem.slice(accordionItem.indexOf('<template>'))
    const title = template.indexOf(':class="UI_ACCORDION_HEADER_TITLE_GROUP_CLASS"')
    const actions = template.indexOf('<slot name="actions" />')
    const chevron = template.indexOf('<CaretDownIcon')
    expect(title).toBeGreaterThan(-1)
    // Her order: title + badge, then the eye, then the chevron.
    expect(actions).toBeGreaterThan(title)
    expect(chevron).toBeGreaterThan(actions)
  })

  it('still opens the section from everywhere the whole-row button covered', () => {
    // The title button is `flex-1`, so it spans the row up to the action slot.
    expect(UI_ACCORDION_HEADER_TITLE_GROUP_CLASS).toContain('flex-1')
    expect(accordionItem.match(/@click="emit\('toggle'\)"/g) ?? []).toHaveLength(2)
    // One accessible control, not two: the chevron is out of the tab order.
    expect(accordionItem).toContain('tabindex="-1"')
    expect(accordionItem).toContain(':aria-expanded="props.open"')
  })

  it('draws the action glyph at the kit 16 without moving its neighbours', () => {
    // The box is 24 so the pointer has something to hit; `-mx-1` hands the
    // four spare pixels back on each side, keeping her 8 from badge and
    // chevron. 4 < 8, so the box cannot reach into the chevron's.
    expect(UI_ACCORDION_HEADER_ACTION_CLASS).toContain('size-6')
    expect(UI_ACCORDION_HEADER_ACTION_CLASS).toContain('-mx-1')
    expect(UI_ACCORDION_HEADER_ACTION_CLASS).toContain('text-ink-700')
    expect(UI_ACCORDION_ICON_SIZE_CLASS).toBe('size-4')
    expect(stepSeven).toContain('UI_ACCORDION_ICON_SIZE_CLASS')
  })
})
