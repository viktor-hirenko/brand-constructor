import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseWizardDim, wizardDimBands, WIZARD_DIM_OFF } from '@/utils/wizardDim'

/*
 * DP-15450, Concept Selection 6 — the Admin's half of the wizard's dim.
 *
 * Her modal `5374:25673` darkens this Admin's left menu along with the wizard.
 * The wizard reports how dark it is; the Admin covers everything outside the
 * frame with the same black. Pinned: the payload cannot blacken the screen by
 * accident, nothing lies over the frame itself (or it would be darkened twice,
 * and — 01.10 — a layer over it, even a clipped one, swallowed the mouse wheel
 * so wizard modals could not scroll), and the view is wired both ways.
 */

describe('parseWizardDim', () => {
  it('takes the wizard’s numbers', () => {
    expect(parseWizardDim({ alpha: 0.5, fadeMs: 250 })).toEqual({ alpha: 0.5, fadeMs: 250 })
  })
  it('reads anything malformed as no dim', () => {
    expect(parseWizardDim(undefined)).toEqual(WIZARD_DIM_OFF)
    expect(parseWizardDim({ alpha: 'x' })).toEqual(WIZARD_DIM_OFF)
    expect(parseWizardDim({ alpha: Number.NaN })).toEqual(WIZARD_DIM_OFF)
  })
  it('never goes fully black and never waits long', () => {
    expect(parseWizardDim({ alpha: 5, fadeMs: 99999 })).toEqual({ alpha: 0.9, fadeMs: 1000 })
  })
})

describe('wizardDimBands — bands around the frame, nothing over it', () => {
  const vp = { width: 1440, height: 900 }
  it('desktop: only the menu on the left is dimmed', () => {
    expect(wizardDimBands({ left: 210, top: 0, right: 1440.4, bottom: 900 }, vp)).toEqual([
      { left: 0, top: 0, width: 210, height: 900 },
    ])
  })
  it('mobile bar on top: only the bar is dimmed', () => {
    expect(wizardDimBands({ left: 0, top: 79, right: 1129, bottom: 889 }, { width: 1129, height: 889 })).toEqual([
      { left: 0, top: 0, width: 1129, height: 79 },
    ])
  })
  it('no band ever overlaps the frame', () => {
    const frame = { left: 100, top: 50, right: 1300, bottom: 850 }
    for (const b of wizardDimBands(frame, vp)) {
      const overlapX = Math.min(b.left + b.width, frame.right) - Math.max(b.left, frame.left)
      const overlapY = Math.min(b.top + b.height, frame.bottom) - Math.max(b.top, frame.top)
      expect(overlapX > 0 && overlapY > 0).toBe(false)
    }
    expect(wizardDimBands(frame, vp)).toHaveLength(4)
  })
})

describe('WizardWorkspaceView carries the dim', () => {
  const SOURCE = readFileSync(resolve(__dirname, '../../../src/views/WizardWorkspaceView.vue'), 'utf8')
  const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))

  it('listens for the wizard’s dim', () => {
    expect(SOURCE).toMatch(/case 'dim':\s*measureFrame\(\)\s*dim\.value = parseWizardDim\(data\.payload\)/)
  })
  it('draws it over the Admin, outside the frame', () => {
    expect(TEMPLATE).toMatch(/<Teleport to="body">\s*<div\s+v-for="\(band, i\) in dimBands"[\s\S]*?class="wizard-workspace__dim"\s+:style="bandStyle\(band\)"/)
    expect(SOURCE).toContain('wizardDimBands(frameRect.value, viewport.value)')
    expect(SOURCE).not.toContain('clipPath')
    expect(SOURCE).toContain('backgroundColor: `rgba(0, 0, 0, ${dim.value.alpha})`')
    expect(TEMPLATE).toMatch(/<iframe[\s\S]*?\bref="frameRef"/)
  })
  it('takes no clicks while off', () => {
    expect(SOURCE).toContain("pointerEvents: dim.value.alpha > 0 ? ('auto' as const) : ('none' as const)")
  })
  it('sends a click on it back to the wizard', () => {
    expect(TEMPLATE).toContain('@click="forwardDimClick"')
    expect(SOURCE).toMatch(
      /contentWindow\?\.postMessage\(\s*\{ source: 'brand-admin', type: 'backdrop-click' \},\s*window\.location\.origin,/,
    )
  })
  it('clears when the frame reloads', () => {
    expect(SOURCE).toMatch(/function handleIframeLoad\(\) \{[\s\S]*?dim\.value = WIZARD_DIM_OFF/)
  })
})
