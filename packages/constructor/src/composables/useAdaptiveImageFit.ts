import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Decides `cover` vs `contain` for an image against its container by measuring
 * how much `object-fit: cover` would actually crop — container aspect ratio
 * vs the image's own natural aspect ratio.
 *
 * Rationale: a slider canvas is normally sized to match its slides (Figma
 * card, 1440×900 in standalone). But a wide-but-short viewport — an old
 * laptop, a docked window, screen mirroring to a TV, a narrow embed drawer —
 * distorts that ratio. `cover` then crops meaningful content (text baked into
 * the slide) with no way to see it. This only switches to `contain` once the
 * crop exceeds a threshold, so normal cases keep today's `cover` look exactly
 * as-is — including the standalone card, whose measured box never changes.
 */
const CONTAIN_CROP_THRESHOLD = 0.12

export function useAdaptiveImageFit() {
  const containerRef = ref<HTMLElement | null>(null)
  const containerAspect = ref<number | null>(null)
  const imageAspect = ref(new Map<string, number>())
  let observer: ResizeObserver | null = null

  onMounted(() => {
    if (!containerRef.value || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      containerAspect.value = rect && rect.height > 0 ? rect.width / rect.height : null
    })
    observer.observe(containerRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  function recordAspect(url: string | null | undefined, event: Event): void {
    if (!url) return
    const img = event.target as HTMLImageElement
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      imageAspect.value.set(url, img.naturalWidth / img.naturalHeight)
    }
  }

  function fitModeFor(url: string | null | undefined): 'cover' | 'contain' {
    if (!url || !containerAspect.value) return 'cover'
    const imgAspect = imageAspect.value.get(url)
    if (!imgAspect) return 'cover'
    const cAspect = containerAspect.value
    const cropped = cAspect > imgAspect ? 1 - imgAspect / cAspect : 1 - cAspect / imgAspect
    return cropped > CONTAIN_CROP_THRESHOLD ? 'contain' : 'cover'
  }

  return { containerRef, recordAspect, fitModeFor }
}
