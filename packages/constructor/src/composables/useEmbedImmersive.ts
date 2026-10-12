import { isEmbedded } from './useEmbedMode'
import { onAdminImmersive, postImmersive } from './useEmbedBridge'

/**
 * The preview panel of a narrow frame takes the whole screen.
 *
 * The owner, 12.10, on a phone and a tablet with the preview open: «у нас
 * визуально образуется какая-то лесенка» — the Admin's bar «Бриф бренду», under
 * it the wizard's bar with the cross that leaves the brief, under it the panel
 * with its own cross. «Может, …вообще превью показывать на мобильном телефоне и
 * на планшете прям отверху?»
 *
 * The wizard is a same-origin iframe inside the Admin and cannot draw over the
 * Admin's bar. So it asks: the Admin lays the frame over the whole screen and
 * answers, and only then does the panel slide in. The order matters. A frame
 * that grows while the panel is already on its way moves everything under the
 * panel by the height of the Admin's bar, in plain sight.
 *
 * Giving the screen back waits for the panel the same way: it is asked for
 * `afterMs` later, once the panel has slid away.
 *
 * An Admin that never answers is an old tab, opened before this was released.
 * The preview must still open there — inside the frame, as it always did — and
 * must not make the person wait for the answer a second time.
 *
 * Standalone (no Admin around the wizard) there is nothing to ask and nothing
 * here runs.
 */

/** How long an answer is waited for before the panel opens inside the frame. */
export const IMMERSIVE_ANSWER_TIMEOUT_MS = 250

export interface ImmersiveControllerDeps {
  /** Send the request (`true`) or the release (`false`) to the Admin. */
  post: (on: boolean) => void
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (id: unknown) => void
}

export interface ImmersiveController {
  /**
   * Ask for the whole screen. Resolves `true` once the Admin has given it, and
   * `false` if it does not answer — the panel then opens inside the frame.
   */
  enter(): Promise<boolean>
  /** Give the screen back `afterMs` from now — once the panel has slid away. */
  leave(afterMs?: number): void
  /** The Admin's answer. */
  acknowledged(on: boolean): void
}

/**
 * The controller as a factory, so the order and the timing can be tested
 * without a browser.
 */
export function createImmersiveController(deps: ImmersiveControllerDeps): ImmersiveController {
  /** `true` was sent and not taken back yet. */
  let requested = false
  /** The Admin has answered this request: the frame has the screen. */
  let granted = false
  /** Whether the Admin answers at all; `null` until it has been asked once. */
  let answers: boolean | null = null
  let waiting: Array<(granted: boolean) => void> = []
  let answerTimer: unknown = null
  let releaseTimer: unknown = null

  function tell(result: boolean): void {
    const queue = waiting
    waiting = []
    for (const resolve of queue) resolve(result)
  }

  function stop(timer: unknown): null {
    if (timer !== null) deps.clearTimer(timer)
    return null
  }

  function release(): void {
    releaseTimer = null
    requested = false
    granted = false
    deps.post(false)
  }

  return {
    enter() {
      // Reopened while the panel is still sliding away: the screen is kept.
      releaseTimer = stop(releaseTimer)
      if (granted) return Promise.resolve(true)

      if (!requested) {
        requested = true
        deps.post(true)
      }
      if (answers === false) return Promise.resolve(false)

      return new Promise(resolve => {
        waiting.push(resolve)
        if (answerTimer !== null) return
        answerTimer = deps.setTimer(() => {
          answerTimer = null
          answers = false
          tell(false)
        }, IMMERSIVE_ANSWER_TIMEOUT_MS)
      })
    },

    acknowledged(on) {
      // An answer to a question nobody asked, or the echo of a release.
      if (!on || !requested) return
      answers = true
      granted = true
      answerTimer = stop(answerTimer)
      tell(true)
    },

    leave(afterMs = 0) {
      answerTimer = stop(answerTimer)
      tell(false)
      // Sent even when the Admin has not answered: its answer may only be late.
      if (!requested) return
      releaseTimer = stop(releaseTimer)
      if (afterMs > 0) releaseTimer = deps.setTimer(release, afterMs)
      else release()
    },
  }
}

let controller: ImmersiveController | null = null

function getController(): ImmersiveController {
  if (!controller) {
    const created = createImmersiveController({
      post: postImmersive,
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: id => window.clearTimeout(id as number),
    })
    onAdminImmersive(on => created.acknowledged(on))
    controller = created
  }
  return controller
}

const STANDALONE: ImmersiveController = {
  enter: () => Promise.resolve(false),
  leave: () => {},
  acknowledged: () => {},
}

/** The whole screen for a panel of the wizard — see the note at the top. */
export function useEmbedImmersive(): ImmersiveController {
  return isEmbedded() ? getController() : STANDALONE
}
