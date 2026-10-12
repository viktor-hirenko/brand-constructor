import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * The client box of the preview's scroll area, kept up to date.
 *
 * Only the full-screen panel of a narrow wizard needs it: there the phones are
 * sized from the panel itself (`fitPhonesToPanel`) — its width and the height
 * it shows — because the column and the square that size them on a laptop are
 * not there. `clientWidth` / `clientHeight`, so a classic scrollbar is already
 * off the width.
 *
 * The element is WATCHED rather than read once on mount: on step 7 the scroll
 * area sits inside a `v-if`, and a ref read at mount would be empty for good —
 * the way `useAdaptiveImageFit` never starts when its box appears later.
 */
export function usePreviewPanelBox() {
  const panelRef = ref<HTMLElement | null>(null)
  const box = ref({ width: 0, height: 0 })
  let observer: ResizeObserver | null = null

  function stop(): void {
    observer?.disconnect()
    observer = null
  }

  watch(
    panelRef,
    element => {
      stop()
      if (!element || typeof ResizeObserver === 'undefined') return
      const measure = () => {
        box.value = { width: element.clientWidth, height: element.clientHeight }
      }
      measure()
      observer = new ResizeObserver(measure)
      observer.observe(element)
    },
    { flush: 'post' }
  )

  onBeforeUnmount(stop)

  return { panelRef, box }
}
