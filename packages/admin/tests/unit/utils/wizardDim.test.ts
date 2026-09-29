import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseWizardDim, wizardDimClipPath, WIZARD_DIM_OFF } from '@/utils/wizardDim'

/*
 * DP-15450, Concept Selection 6 — the Admin's half of the wizard's dim.
 *
 * Her modal `5374:25673` darkens this Admin's left menu along with the wizard.
 * The wizard reports how dark it is; the Admin covers everything outside the
 * frame with the same black. Pinned: the payload cannot blacken the screen by
 * accident, the frame itself is a hole (or it would be darkened twice and stop
 * taking clicks), and the view is wired both ways.
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

describe('wizardDimClipPath — the frame is a hole', () => {
  const path = wizardDimClipPath({ left: 210, top: 0, right: 1440.4, bottom: 900 })
  it('uses evenodd, so the inner rectangle is cut out', () => {
    expect(path.startsWith('polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ')).toBe(true)
  })
  it('cuts exactly the frame, rounded to whole pixels', () => {
    expect(path).toContain('210px 0px, 1440px 0px, 1440px 900px, 210px 900px, 210px 0px)')
  })
})

describe('WizardWorkspaceView carries the dim', () => {
  const SOURCE = readFileSync(resolve(__dirname, '../../../src/views/WizardWorkspaceView.vue'), 'utf8')
  const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))

  it('listens for the wizard’s dim', () => {
    expect(SOURCE).toMatch(/case 'dim':\s*measureFrame\(\)\s*dim\.value = parseWizardDim\(data\.payload\)/)
  })
  it('draws it over the Admin, outside the frame', () => {
    expect(TEMPLATE).toMatch(/<Teleport to="body">\s*<div\s+class="wizard-workspace__dim"\s+:style="dimStyle"/)
    expect(SOURCE).toContain('clipPath: wizardDimClipPath(frameRect.value)')
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
