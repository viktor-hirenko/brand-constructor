import type { InjectionKey } from 'vue'
import { inject } from 'vue'

export interface VisualComponentPreviewContext {
  restoreSidebarPreview: () => void
}

export const VISUAL_COMPONENT_PREVIEW_KEY: InjectionKey<VisualComponentPreviewContext> =
  Symbol('visualComponentPreview')

export function useVisualComponentPreviewContext(): VisualComponentPreviewContext | null {
  return inject(VISUAL_COMPONENT_PREVIEW_KEY, null)
}
