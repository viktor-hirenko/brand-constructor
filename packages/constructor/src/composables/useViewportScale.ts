import { onBeforeUnmount, onMounted, ref } from 'vue'

interface UseViewportScaleOptions {
  /** Design width of the fixed shell (px). */
  baseWidth: number
  /** Design height of the fixed shell (px). */
  baseHeight: number
  /** Total outer space subtracted from the viewport on each axis (px). */
  padding?: number
  /** Allow scale factor > 1 on oversized monitors. Defaults to false (no upscale). */
  allowUpscale?: boolean
}

/**
 * Tracks viewport size and returns a scale factor that fits a fixed-size
 * design shell into the current viewport while preserving its aspect ratio.
 * Use it together with `transform: scale(var)` on the shell so all internal
 * pixel values stay 1:1 with the original design (Figma 1311×810).
 */
export function useViewportScale(options: UseViewportScaleOptions) {
  const { baseWidth, baseHeight, padding = 48, allowUpscale = false } = options
  const scale = ref(1)

  function compute() {
    const availableWidth = Math.max(0, window.innerWidth - padding)
    const availableHeight = Math.max(0, window.innerHeight - padding)
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
