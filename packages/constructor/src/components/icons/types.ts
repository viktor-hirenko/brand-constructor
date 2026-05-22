import type { HTMLAttributes } from 'vue'

export interface IconProps {
  class?: HTMLAttributes['class']
  /** When set, icon is exposed to assistive tech via aria-label. */
  title?: string
}

export interface StrokeIconProps extends IconProps {
  strokeWidth?: number | string
}

export interface FileIconProps extends StrokeIconProps {
  /** `full` includes text lines; `compact` is folded document only. */
  variant?: 'full' | 'compact'
}
