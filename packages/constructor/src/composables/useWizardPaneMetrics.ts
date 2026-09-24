import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import {
  WIZARD_CAPPED_MIN_WIDTH,
  resolveWizardPaneGeometry,
} from '@/constants/wizardResponsive'

/**
 * Measures the wizard's content row and hands back the right column's width.
 *
 * Why JS and not CSS: the kit sizes the right column **from the available
 * height** (`right = height − 56`, see `constants/wizardResponsive.ts`). CSS
 * has no way to feed a resolved height back into a sibling's width — an
 * `aspect-ratio` child inside a column flexbox is circular, because the child's
 * cross size is what the parent is trying to work out. A `ResizeObserver` on
 * the row is the honest way to do it, and it keeps the arithmetic in a pure
 * function that a unit test can hold.
 *
 * The capped regime (">1920 px" on the designer's sticker) is decided by the
 * row's own width, which inside the Admin iframe is the panel — the browser
 * viewport minus the sidebar.
 */
export function useWizardPaneMetrics(target: Ref<HTMLElement | null>) {
  const paneHeight = ref(0)
  const paneWidth = ref(0)
  let observer: ResizeObserver | null = null

  function measure(element: HTMLElement): void {
    const box = element.getBoundingClientRect()
    paneHeight.value = box.height
    paneWidth.value = box.width
  }

  onMounted(() => {
    const element = target.value
    if (!element || typeof ResizeObserver === 'undefined') return
    measure(element)
    observer = new ResizeObserver(() => measure(element))
    observer.observe(element)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  const isCapped = computed(() => paneWidth.value >= WIZARD_CAPPED_MIN_WIDTH)

  const geometry = computed(() =>
    resolveWizardPaneGeometry(paneHeight.value, { capped: isCapped.value })
  )

  /**
   * Inline style for the right column. Empty until the first measurement, so a
   * server-rendered or not-yet-painted shell keeps whatever the CSS says rather
   * than collapsing to zero.
   */
  const rightPaneStyle = computed(() =>
    geometry.value.rightPaneWidth > 0
      ? {
          width: `${geometry.value.rightPaneWidth}px`,
          flex: '0 0 auto',
        }
      : {}
  )

  return { paneHeight, paneWidth, isCapped, geometry, rightPaneStyle }
}
