import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createImmersiveController, IMMERSIVE_ANSWER_TIMEOUT_MS } from '@/composables/useEmbedImmersive'

/**
 * The owner, 12.10, on a phone and a tablet with the preview open: «у нас
 * визуально образуется какая-то лесенка. У нас видно вверху этот бриф, …потом
 * шапка для закрытия всей страницы этого бренда, потом само превью с
 * крестиком… Может, …вообще превью показывать на мобильном телефоне и на
 * планшете прям отверху?» — and, on the sketch of exactly that, «Исправь
 * лесенку».
 *
 * Three bars stood one under another: the Admin's «Бриф бренду» (outside the
 * wizard's frame), the wizard's «Brand Creation» with a cross that leaves the
 * brief, and the panel's own «Превʼю» with a cross that closes the panel. Now
 * the panel takes the whole screen: the wizard asks the Admin for it, the Admin
 * lays the frame over its own bar, and the panel — fixed to the frame, not to
 * the row under the wizard's bar — slides in over everything.
 *
 * What is pinned: the order (the screen first, the panel after — or the page
 * under the panel jumps by the height of the Admin's bar), that the screen is
 * given back only once the panel has slid away, and that an Admin which does
 * not answer (an old tab) still gets its preview.
 *
 * Red on the old code: there is no `useEmbedImmersive`, the panel is
 * `position: absolute` in the row, and nothing asks the Admin for anything.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

function setup() {
  const posted: boolean[] = []
  const timers = new Map<number, { fn: () => void; ms: number }>()
  let seq = 0
  const controller = createImmersiveController({
    post: on => posted.push(on),
    setTimer: (fn, ms) => {
      timers.set(++seq, { fn, ms })
      return seq
    },
    clearTimer: id => {
      timers.delete(id as number)
    },
  })
  /** Let the one pending timer of this length fire. */
  const fire = (ms: number) => {
    const hit = [...timers.entries()].filter(([, t]) => t.ms === ms)
    expect(hit, `a timer of ${ms} ms`).toHaveLength(1)
    timers.delete(hit[0][0])
    hit[0][1].fn()
  }
  return { controller, posted, timers, fire }
}

/** The state of a promise right now: 'pending' or what it resolved with. */
async function settled<T>(p: Promise<T>): Promise<T | 'pending'> {
  return Promise.race([p, Promise.resolve().then(() => 'pending' as const)])
}

describe('the wizard asks the Admin for the whole screen', () => {
  it('asks once and opens only when the Admin has answered', async () => {
    const { controller, posted } = setup()
    const opened = controller.enter()

    expect(posted).toEqual([true])
    expect(await settled(opened)).toBe('pending')

    controller.acknowledged(true)
    expect(await opened).toBe(true)
  })

  it('two taps on «Превʼю» are one request', async () => {
    const { controller, posted } = setup()
    const first = controller.enter()
    const second = controller.enter()
    controller.acknowledged(true)

    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(posted).toEqual([true])
  })

  it('gives the screen back only after the panel has slid away', async () => {
    const { controller, posted, fire } = setup()
    const opened = controller.enter()
    controller.acknowledged(true)
    await opened

    controller.leave(320)
    expect(posted).toEqual([true])

    fire(320)
    expect(posted).toEqual([true, false])
  })

  it('reopened while the panel is still sliding away: the screen is kept, nothing is asked again', async () => {
    const { controller, posted, timers } = setup()
    const opened = controller.enter()
    controller.acknowledged(true)
    await opened
    controller.leave(320)

    expect(await controller.enter()).toBe(true)
    expect(posted).toEqual([true])
    expect(timers.size).toBe(0)
  })

  it('leaving at once — the panel is gone without a slide (the window grew wide)', async () => {
    const { controller, posted, timers } = setup()
    const opened = controller.enter()
    controller.acknowledged(true)
    await opened

    controller.leave()
    expect(posted).toEqual([true, false])
    expect(timers.size).toBe(0)
  })

  it('after the screen is given back the next open asks again', async () => {
    const { controller, posted } = setup()
    const first = controller.enter()
    controller.acknowledged(true)
    await first
    controller.leave()

    const second = controller.enter()
    expect(await settled(second)).toBe('pending')
    controller.acknowledged(true)
    expect(await second).toBe(true)
    expect(posted).toEqual([true, false, true])
  })
})

describe('an Admin that does not answer — an old tab opened before the release', () => {
  it('the preview still opens, inside the frame as before', async () => {
    const { controller, posted, fire } = setup()
    const opened = controller.enter()

    fire(IMMERSIVE_ANSWER_TIMEOUT_MS)
    expect(await opened).toBe(false)
    expect(posted).toEqual([true])
  })

  it('the answer that came late is not lost: the screen is still given back', async () => {
    const { controller, posted, fire } = setup()
    const opened = controller.enter()
    fire(IMMERSIVE_ANSWER_TIMEOUT_MS)
    await opened

    controller.acknowledged(true)
    controller.leave()
    expect(posted).toEqual([true, false])
  })

  it('is not waited for a second time', async () => {
    const { controller, posted, fire, timers } = setup()
    const first = controller.enter()
    fire(IMMERSIVE_ANSWER_TIMEOUT_MS)
    await first
    controller.leave()

    expect(await settled(controller.enter())).toBe(false)
    expect(posted).toEqual([true, false, true])
    expect(timers.size).toBe(0)
  })

  it('and is believed again as soon as it answers', async () => {
    const { controller, fire } = setup()
    const first = controller.enter()
    fire(IMMERSIVE_ANSWER_TIMEOUT_MS)
    await first
    controller.leave()

    await controller.enter()
    controller.acknowledged(true)
    controller.leave()

    const third = controller.enter()
    expect(await settled(third)).toBe('pending')
    controller.acknowledged(true)
    expect(await third).toBe(true)
  })
})

describe('nothing is sent that was not asked for', () => {
  it('leaving with nothing open sends nothing', () => {
    const { controller, posted } = setup()
    controller.leave()
    controller.leave(320)
    expect(posted).toEqual([])
  })

  it('an answer to a question nobody asked changes nothing', async () => {
    const { controller, posted } = setup()
    controller.acknowledged(true)

    const opened = controller.enter()
    expect(posted).toEqual([true])
    expect(await settled(opened)).toBe('pending')
  })

  it('closed before the Admin answered: whoever waited is told no, and the screen is given back', async () => {
    const { controller, posted } = setup()
    const opened = controller.enter()
    controller.leave()

    expect(await opened).toBe(false)
    expect(posted).toEqual([true, false])
  })
})

describe('the panel is laid over the whole frame', () => {
  const shell = read('components/constructor/layout/ConstructorDualPaneShell.vue')
  const style = shell.slice(shell.indexOf('<style scoped>'))
  const rule = (selector: string) => {
    const from = style.indexOf(`${selector} {`)
    expect(from, selector).toBeGreaterThan(-1)
    return style.slice(from, style.indexOf('}', from))
  }

  it('the panel and its dim are fixed to the frame, not to the row under the wizard’s bar', () => {
    expect(rule('.constructor-dual-pane-shell__drawer')).toMatch(/position: fixed;\s*inset: 0;/)
    expect(rule('.constructor-dual-pane-shell__drawer-backdrop')).toMatch(/position: fixed;\s*inset: 0;/)
    expect(style).not.toMatch(/__drawer(-backdrop)? \{\s*position: absolute/)
  })

  it('closed, it is not there at all — its shadow used to lie on the right edge of the brief', () => {
    expect(rule('.constructor-dual-pane-shell__drawer')).toContain('visibility: hidden;')
    expect(rule('.constructor-dual-pane-shell__drawer--open')).toContain('visibility: visible;')
  })

  it('the screen first, the panel after; and back only when the panel has slid away', () => {
    const open = shell.slice(shell.indexOf('async function openPreview()'), shell.indexOf('function closePreview()'))
    expect(open.indexOf('await immersive.enter()')).toBeGreaterThan(-1)
    expect(open.indexOf('await immersive.enter()')).toBeLessThan(open.indexOf('isPreviewOpen.value = true'))

    const close = shell.slice(shell.indexOf('function closePreview()'))
    expect(close.slice(0, close.indexOf('\n}\n'))).toContain('immersive.leave(PREVIEW_DRAWER_GONE_MS)')
  })

  it('«slid away» is the slide the stylesheet draws', () => {
    const ms = Number(shell.match(/const PREVIEW_DRAWER_SLIDE_MS = (\d+)/)?.[1])
    const seconds = Number(rule('.constructor-dual-pane-shell__drawer').match(/transition:\s*transform ([\d.]+)s/)?.[1])
    expect(ms).toBe(320)
    expect(seconds * 1000).toBe(ms)
    // …and the screen is given back a few frames later than that, never sooner:
    // the slide starts with the next style pass, not with the click.
    expect(shell).toMatch(/const PREVIEW_DRAWER_GONE_MS = PREVIEW_DRAWER_SLIDE_MS \+ \d{2,3}\n/)
  })

  it('the screen is given back when the window grows wide and when the screen is left', () => {
    expect(shell).toMatch(/watch\(isDrawerMode, mode => \{[\s\S]*?immersive\.leave\(\)/)
    expect(shell).toMatch(/onBeforeUnmount\(\(\) => immersive\.leave\(\)\)/)
  })
})

describe('the wizard keeps its place while the frame lies over the Admin’s bar', () => {
  const css = read('styles/app.css')

  it('pads itself by what the Admin says the frame has grown, and leaves that strip clear', () => {
    const from = css.indexOf('html.wizard-embed .constructor-layout {')
    expect(from).toBeGreaterThan(-1)
    const block = css.slice(from, css.indexOf('}', from))

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(block).toContain(`var(--embed-inset-${side}, 0px)`)
    }
    // The Admin's bar is seen through the strip until the panel covers it.
    expect(block).toContain('background-clip: content-box;')
  })
})

describe('the bridge', () => {
  const bridge = read('composables/useEmbedBridge.ts')

  it('asks the Admin and hears its answer — same origin, the Admin’s own messages only', () => {
    expect(bridge).toMatch(/export function postImmersive\(on: boolean\): void \{\s*if \(!isEmbedded\(\)\) return;?\s*post\('immersive', \{ on \}\)/)
    const listener = bridge.slice(bridge.indexOf('export function onAdminImmersive('))
    expect(listener).toContain('event.origin !== window.location.origin')
    expect(listener).toMatch(/data\.source !== 'brand-admin' \|\| data\.type !== 'immersive'/)
  })
})
