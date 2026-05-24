import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DESIGN_SHELL_VIEWPORT_GUTTER,
} from '@/constants/layoutShell'

/**
 * Fits a fixed-size shell into the viewport via CSS scale (no upscale by default).
 * Below `minViewportWidth`, subtracts `padding` so the shell keeps side gutters.
 */
interface UseViewportScaleOptions {
  baseWidth: number
  baseHeight: number
  padding?: number
  minViewportWidth?: number
  allowUpscale?: boolean
}

export function useViewportScale(options: UseViewportScaleOptions) {
  const {
    baseWidth,
    baseHeight,
    padding = DESIGN_SHELL_VIEWPORT_GUTTER,
    minViewportWidth = baseWidth,
    allowUpscale = false,
  } = options
  const scale = ref(1)

  function compute() {
    const useGutter = window.innerWidth < minViewportWidth ? padding : 0
    const availableWidth = Math.max(0, window.innerWidth - useGutter)
    const availableHeight = Math.max(0, window.innerHeight - useGutter)
    const next = Math.min(availableWidth / baseWidth, availableHeight / baseHeight)
    scale.value = allowUpscale ? next : Math.min(next, 1)
  }

  onMounted(() => {
    compute()
    window.addEventListener('resize', compute, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', compute)
  })

  return { scale }
}
