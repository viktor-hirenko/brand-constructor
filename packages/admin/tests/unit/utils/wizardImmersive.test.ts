import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EMBED_INSETS_NONE,
  embedInsetDeclarations,
  embedInsets,
  parseWizardImmersive,
} from '@/utils/wizardImmersive'

/*
 * The owner, 12.10, on a phone and a tablet with the wizard's preview open:
 * «у нас визуально образуется какая-то лесенка» — this Admin's bar «Бриф
 * бренду», under it the wizard's own bar with its cross, under it the preview
 * with one more. «Может, …вообще превью показывать на мобильном телефоне и на
 * планшете прям отверху?»
 *
 * The Admin's half of that: when the wizard asks, its frame is laid over the
 * whole screen, this Admin's bar included, and handed back when the wizard is
 * done. So that nothing under the panel moves while this happens, the wizard is
 * told — in the same breath, before anything is painted — how far the frame has
 * grown on each side, and pads itself by exactly that.
 *
 * Pure functions here, because `packages/admin` tests run in `node`; the view
 * is pinned by its source.
 */

describe('parseWizardImmersive', () => {
  it('only a plain yes is a yes', () => {
    expect(parseWizardImmersive({ on: true })).toBe(true)
    expect(parseWizardImmersive({ on: false })).toBe(false)
    expect(parseWizardImmersive({ on: 'true' })).toBe(false)
    expect(parseWizardImmersive({ on: 1 })).toBe(false)
    expect(parseWizardImmersive(undefined)).toBe(false)
    expect(parseWizardImmersive(null)).toBe(false)
    expect(parseWizardImmersive('on')).toBe(false)
  })
})

describe('embedInsets — how far the frame has grown over the Admin', () => {
  it('a tablet held upright: the bar on top, 79', () => {
    expect(
      embedInsets({ left: 0, top: 79, right: 768, bottom: 1024 }, { left: 0, top: 0, right: 768, bottom: 1024 })
    ).toEqual({ top: 79, right: 0, bottom: 0, left: 0 })
  })

  it('a phone: the lower bar of the phone layout', () => {
    expect(
      embedInsets({ left: 0, top: 61, right: 440, bottom: 956 }, { left: 0, top: 0, right: 440, bottom: 956 })
    ).toEqual({ top: 61, right: 0, bottom: 0, left: 0 })
  })

  it('all four sides are measured, whatever stands around the frame', () => {
    expect(
      embedInsets({ left: 210, top: 40, right: 1400, bottom: 880 }, { left: 0, top: 0, right: 1440, bottom: 900 })
    ).toEqual({ top: 40, right: 40, bottom: 20, left: 210 })
  })

  it('a frame that already has the screen has grown by nothing', () => {
    const screen = { left: 0, top: 0, right: 768, bottom: 1024 }
    expect(embedInsets(screen, screen)).toEqual(EMBED_INSETS_NONE)
  })

  it('never a negative padding, never junk', () => {
    expect(
      embedInsets({ left: -4, top: -1, right: 800, bottom: 1100 }, { left: 0, top: 0, right: 768, bottom: 1024 })
    ).toEqual(EMBED_INSETS_NONE)
    expect(
      embedInsets({ left: Number.NaN, top: 79, right: 768, bottom: 1024 }, { left: 0, top: 0, right: 768, bottom: 1024 })
    ).toEqual({ top: 79, right: 0, bottom: 0, left: 0 })
  })

  it('half pixels are kept — a rounded strip would move the page by the remainder', () => {
    expect(
      embedInsets({ left: 0, top: 78.5, right: 768, bottom: 1024 }, { left: 0, top: 0, right: 768, bottom: 1024 }).top
    ).toBe(78.5)
  })
})

describe('embedInsetDeclarations — what the wizard reads', () => {
  it('names the four sides in px', () => {
    expect(embedInsetDeclarations({ top: 79, right: 0, bottom: 0, left: 0 })).toEqual([
      ['--embed-inset-top', '79px'],
      ['--embed-inset-right', '0px'],
      ['--embed-inset-bottom', '0px'],
      ['--embed-inset-left', '0px'],
    ])
  })
})

describe('WizardWorkspaceView gives the wizard the whole screen', () => {
  const SOURCE = readFileSync(resolve(__dirname, '../../../src/views/WizardWorkspaceView.vue'), 'utf8')
  const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.lastIndexOf('</template>'))
  const STYLE = SOURCE.slice(SOURCE.indexOf('<style'))

  it('listens for the wizard’s request', () => {
    expect(SOURCE).toMatch(/case 'immersive':\s*void setImmersive\(parseWizardImmersive\(data\.payload\)\)/)
  })

  it('lays the frame over the screen — above the menu and the bar, under this Admin’s own dialogs', () => {
    expect(TEMPLATE).toMatch(/<iframe[\s\S]*?:class="\{ 'wizard-workspace__frame--immersive': immersive \}"/)
    const from = STYLE.indexOf('&__frame--immersive {')
    expect(from).toBeGreaterThan(-1)
    const block = STYLE.slice(from, STYLE.indexOf('}', from))
    expect(block).toMatch(/position: fixed;/)
    expect(block).toMatch(/top: 0;\s*left: 0;/)
    expect(block).toContain('z-index: $z-sidebar + 1;')
  })

  it('tells the wizard how far the frame has grown before anything is painted, and only then answers', () => {
    const fn = SOURCE.slice(SOURCE.indexOf('async function setImmersive('))
    const body = fn.slice(0, fn.indexOf('\n}\n'))

    const flip = body.indexOf('immersive.value = on')
    const settle = body.indexOf('await nextTick()')
    const write = body.indexOf('writeEmbedInsets(')
    const answer = body.indexOf("type: 'immersive'")
    expect(flip).toBeGreaterThan(-1)
    expect(settle).toBeGreaterThan(flip)
    expect(write).toBeGreaterThan(settle)
    expect(answer).toBeGreaterThan(write)
    // Between the frame's new box and the wizard's padding there is no task
    // boundary — a timer or a frame callback here would let one frame through
    // with the page shifted by the height of the bar.
    expect(body).not.toMatch(/setTimeout|requestAnimationFrame/)
  })

  it('measures the growth from the place the frame stands in, not from the window', () => {
    expect(SOURCE).toContain('embedInsets(rectOf(rootRef.value), rectOf(frameRef.value))')
    expect(TEMPLATE).toMatch(/<div ref="rootRef" class="wizard-workspace">/)
  })

  it('keeps the strip right when the window changes while the frame has the screen', () => {
    expect(SOURCE).toMatch(/function syncGeometry\(\) \{[\s\S]*?measureFrame\(\)[\s\S]*?if \(immersive\.value\) writeEmbedInsets\(/)
    expect(SOURCE).toContain("window.addEventListener('resize', syncGeometry)")
  })

  it('a frame that reloaded has nothing open', () => {
    expect(SOURCE).toMatch(/function handleIframeLoad\(\) \{[\s\S]*?immersive\.value = false/)
  })
})
