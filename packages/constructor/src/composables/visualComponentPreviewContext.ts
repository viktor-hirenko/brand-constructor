import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

/**
 * What the step-7 screen may ask of the preview beside it.
 *
 * `sidebarVisible` and `toggleSidebarPreview` arrived with DP-15450
 * `visual components 4`: the eye that shows and hides the Sidebar layer used
 * to float over the phone in the right column, and the designer's screen
 * `5382:33712` puts it inside the «Sidebar» accordion row on the LEFT. The
 * state it reflects still lives in `BriefShellView`, which owns the preview —
 * so the row reads it through here rather than keeping a second copy.
 */
export interface VisualComponentPreviewContext {
  restoreSidebarPreview: () => void
  /** True while the Sidebar layer is drawn over the phone. */
  sidebarVisible: Ref<boolean>
  toggleSidebarPreview: () => void
}

export const VISUAL_COMPONENT_PREVIEW_KEY: InjectionKey<VisualComponentPreviewContext> =
  Symbol('visualComponentPreview')

export function useVisualComponentPreviewContext(): VisualComponentPreviewContext | null {
  return inject(VISUAL_COMPONENT_PREVIEW_KEY, null)
}
