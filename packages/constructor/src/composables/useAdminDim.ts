import { onBeforeUnmount, watch } from 'vue'
import { isEmbedded } from './useEmbedMode'
import { postDim, onAdminBackdropClick } from './useEmbedBridge'

/**
 * DP-15450, Concept Selection 6 — «Overlay модалки має затемнювати весь
 * viewport, включно з header. Аналогічно з усіма модалками.»
 *
 * Her exit modal `5374:25673` dims the whole 1440 screen, the Admin's left
 * menu included (#1e293b under black 50% is the 13/20/31 on the drawing). The
 * wizard is a same-origin iframe inside the Admin, so its own backdrops stop
 * at the frame edge and the menu next to them stayed bright.
 *
 * Every wizard backdrop now *holds* a dim while it is on screen. The holders
 * are combined here and the result goes to the Admin as one `dim` message; the
 * Admin lays the same black over everything outside the frame. A click on the
 * Admin's dark area comes back as `backdrop-click` and goes to the TOPMOST
 * holder — the same thing a click on the wizard's own dark area does there.
 *
 * Standalone (no Admin around the wizard) every call here is a no-op.
 */

export interface AdminDimHold {
  /** Opacity of the black this backdrop paints, 0..1 — the `/50` of `bg-black/50`. */
  alpha: number
  /** Its fade, in ms; 0 for a backdrop that appears at once. */
  fadeMs?: number
  /** What a click on this backdrop does in the wizard. */
  onBackdrop?: () => void
}

export interface AdminDimState {
  alpha: number
  fadeMs: number
}

/**
 * Stacked translucent blacks compose multiplicatively: two 50% layers leave a
 * quarter of the light, i.e. 75% dark — which is what a confirmation over an
 * open form looks like inside the wizard.
 */
export function combineDimAlpha(alphas: readonly number[]): number {
  let light = 1
  for (const a of alphas) {
    if (!Number.isFinite(a) || a <= 0) continue
    light *= 1 - Math.min(a, 1)
  }
  return Math.round((1 - light) * 1000) / 1000
}

/**
 * The registry as a factory, so the arithmetic and the ordering can be tested
 * without a browser. `emit` receives the combined state after every change.
 */
export function createAdminDimRegistry(emit: (state: AdminDimState) => void) {
  const holds: AdminDimHold[] = []

  function publish(changed: AdminDimHold): void {
    emit({ alpha: combineDimAlpha(holds.map(h => h.alpha)), fadeMs: changed.fadeMs ?? 0 })
  }

  return {
    hold(entry: AdminDimHold): () => void {
      holds.push(entry)
      publish(entry)
      let released = false
      return () => {
        if (released) return
        released = true
        const i = holds.indexOf(entry)
        if (i !== -1) holds.splice(i, 1)
        publish(entry)
      }
    },
    /** A click on the Admin's dark area: the top of the stack answers it. */
    backdropClick(): void {
      holds[holds.length - 1]?.onBackdrop?.()
    },
    size(): number {
      return holds.length
    },
  }
}

let registry: ReturnType<typeof createAdminDimRegistry> | null = null

function getRegistry(): ReturnType<typeof createAdminDimRegistry> {
  if (!registry) {
    registry = createAdminDimRegistry(postDim)
    onAdminBackdropClick(() => registry?.backdropClick())
  }
  return registry
}

/** Hold the dim for as long as the calling component is mounted (a modal). */
export function useAdminDim(entry: AdminDimHold): void {
  if (!isEmbedded()) return
  const release = getRegistry().hold(entry)
  onBeforeUnmount(release)
}

/** Hold the dim while `active()` is true (a backdrop drawn with `v-if`). */
export function useAdminDimWhile(active: () => boolean, entry: AdminDimHold): void {
  if (!isEmbedded()) return
  let release: (() => void) | null = null
  watch(
    () => Boolean(active()),
    on => {
      if (on && !release) release = getRegistry().hold(entry)
      else if (!on && release) {
        release()
        release = null
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(() => release?.())
}
