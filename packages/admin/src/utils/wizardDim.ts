/**
 * DP-15450, Concept Selection 6 — the Admin's half of the wizard's dim.
 *
 * «Overlay модалки має затемнювати весь viewport, включно з header.» Her exit
 * modal `5374:25673` darkens the whole screen, this Admin's left menu included.
 * The wizard is an iframe here and its backdrops stop at the frame edge, so it
 * reports how dark it is (`dim`) and the Admin lays the same black over
 * everything OUTSIDE the frame — never over it, or the frame would be darkened
 * twice.
 *
 * Pure functions, because `packages/admin` tests run in `node` and cannot mount
 * the view (see `tests/unit/components/appHeader.test.ts`).
 */

export interface WizardDimState {
  alpha: number
  fadeMs: number
}

export const WIZARD_DIM_OFF: WizardDimState = { alpha: 0, fadeMs: 0 }

/** Anything malformed reads as "no dim" rather than as a black screen. */
export function parseWizardDim(payload: unknown): WizardDimState {
  const p = (payload ?? {}) as { alpha?: unknown; fadeMs?: unknown }
  const alpha = typeof p.alpha === 'number' && Number.isFinite(p.alpha) ? p.alpha : 0
  const fadeMs = typeof p.fadeMs === 'number' && Number.isFinite(p.fadeMs) ? p.fadeMs : 0
  return {
    alpha: Math.min(Math.max(alpha, 0), 0.9),
    fadeMs: Math.min(Math.max(fadeMs, 0), 1000),
  }
}

export interface FrameRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * The dim layer covers the viewport with a hole exactly where the iframe is.
 * `evenodd` turns the inner rectangle into a hole, and a clipped-away area
 * does not take clicks either, so the wizard under the hole stays usable.
 */
export function wizardDimClipPath(frame: FrameRect): string {
  const l = Math.round(frame.left)
  const t = Math.round(frame.top)
  const r = Math.round(frame.right)
  const b = Math.round(frame.bottom)
  return (
    'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' +
    `${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`
  )
}
