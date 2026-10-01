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

export interface DimBand {
  left: number
  top: number
  width: number
  height: number
}

/**
 * The dim is drawn as up to four bands AROUND the frame, never as one layer
 * over it. A full-screen layer with a `clip-path` hole lets clicks through the
 * hole, but Chrome still hands it the mouse wheel: with it a wizard modal could
 * not be scrolled inside the Admin (01.10, «Замовити новий концепт»: no scroll).
 * Bands of zero size are dropped.
 */
export function wizardDimBands(frame: FrameRect, viewport: { width: number; height: number }): DimBand[] {
  const l = Math.max(0, Math.round(frame.left))
  const t = Math.max(0, Math.round(frame.top))
  const r = Math.min(viewport.width, Math.round(frame.right))
  const b = Math.min(viewport.height, Math.round(frame.bottom))
  const bands: DimBand[] = [
    { left: 0, top: 0, width: viewport.width, height: t },
    { left: 0, top: b, width: viewport.width, height: viewport.height - b },
    { left: 0, top: t, width: l, height: b - t },
    { left: r, top: t, width: viewport.width - r, height: b - t },
  ]
  return bands.filter(band => band.width > 0 && band.height > 0)
}
