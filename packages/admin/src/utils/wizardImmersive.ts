/**
 * The Admin's half of the wizard's full-screen preview.
 *
 * The owner, 12.10, on a phone and a tablet with the preview open: «у нас
 * визуально образуется какая-то лесенка» — this Admin's bar «Бриф бренду»,
 * under it the wizard's own bar with its cross, under it the preview with one
 * more. «Может, …вообще превью показывать на мобильном телефоне и на планшете
 * прям отверху?»
 *
 * The wizard is an iframe here and cannot draw over this Admin's bar. When it
 * asks (`immersive`), `WizardWorkspaceView` lays the frame over the whole
 * screen and tells the wizard how far the frame has grown on each side, so the
 * wizard can pad itself by exactly that and nothing under its panel moves.
 *
 * Pure functions, because `packages/admin` tests run in `node` and cannot mount
 * the view.
 */

import type { FrameRect } from './wizardDim'

export interface EmbedInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export const EMBED_INSETS_NONE: EmbedInsets = { top: 0, right: 0, bottom: 0, left: 0 }

/** Anything but a plain `{ on: true }` reads as "no" rather than as a frame over the screen. */
export function parseWizardImmersive(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && (payload as { on?: unknown }).on === true
}

const grown = (by: number): number => (Number.isFinite(by) && by > 0 ? by : 0)

/**
 * How far the frame, laid over `screen`, reaches beyond the `place` it stands
 * in — the Admin's bar on top below 1280, and whatever else is around it.
 * Unrounded: the wizard pads itself by this, and a rounded strip would move its
 * page by the remainder.
 */
export function embedInsets(place: FrameRect, screen: FrameRect): EmbedInsets {
  return {
    top: grown(place.top - screen.top),
    right: grown(screen.right - place.right),
    bottom: grown(screen.bottom - place.bottom),
    left: grown(place.left - screen.left),
  }
}

/** The custom properties the wizard's `app.css` reads (`html.wizard-embed .constructor-layout`). */
export function embedInsetDeclarations(insets: EmbedInsets): [string, string][] {
  return [
    ['--embed-inset-top', `${insets.top}px`],
    ['--embed-inset-right', `${insets.right}px`],
    ['--embed-inset-bottom', `${insets.bottom}px`],
    ['--embed-inset-left', `${insets.left}px`],
  ]
}
