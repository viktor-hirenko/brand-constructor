import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import {
  WIZARD_CAPPED_MIN_WIDTH,
  resolvePreviewFloor,
  resolvePreviewSide,
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

  // `clientWidth`/`clientHeight`, not `getBoundingClientRect()`: the rect is
  // the BORDER box, and above 1920 the frame carries a 1px rule, so the row
  // read 2 more than it actually offers. At 2560 that put a scrollbar on a
  // layout the kit draws without one — the square needs 896 of content inside
  // a 960 frame, and the border box said 960 while only 958 was there.
  function measure(element: HTMLElement): void {
    paneHeight.value = element.clientHeight
    paneWidth.value = element.clientWidth
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

  // The column comes from the WIDTH — her number at her four widths, the
  // straight line between her numbers in between. The height decides only how
  // tall the preview is drawn inside it: whole on a short window down to the
  // floor, and scrolling below that.
  const geometry = computed(() =>
    resolveWizardPaneGeometry(paneHeight.value, {
      previewSide: resolvePreviewSide(paneWidth.value),
      minSide: resolvePreviewFloor(paneWidth.value),
    })
  )

  /**
   * Inline style for the right column. Empty until the first measurement, so a
   * server-rendered or not-yet-painted shell keeps whatever the CSS says rather
   * than collapsing to zero.
   *
   * The HEIGHT is here for the same reason as the width: the panel is the
   * square plus its chrome and leaves white space under itself rather than
   * stretching. That is how every drawn screen sits — `5382:48440` is 639×695
   * in a 713-tall row, `5387:105207` the same in a 785-tall one.
   */
  const rightPaneStyle = computed(() =>
    geometry.value.rightPaneWidth > 0
      ? {
          width: `${geometry.value.rightPaneWidth}px`,
          height: `${geometry.value.rightPaneHeight}px`,
          flex: '0 0 auto',
          alignSelf: 'flex-start',
        }
      : {}
  )

  /**
   * The same width as a custom property, for overlays that have to line up with
   * the right column — today the concept-gallery drawer
   * (`preview/ConceptGalleryDrawer.vue`), which used to hardcode the old 58%.
   * Falls back to 58% until the first measurement.
   *
   * It is declared on the shell ROOT and inherited, so it reaches that panel
   * where it is mounted — at the root, beside the backdrop, because the drawer
   * is anchored to the window: it slides in from the window's right edge and
   * takes the window's full height (DP-15450, the owner's call).
   */
  const rightPaneVarStyle = computed(() => ({
    '--wizard-right-pane-width':
      geometry.value.rightPaneWidth > 0 ? `${geometry.value.rightPaneWidth}px` : '58%',
  }))

  /**
   * The square's own side, published to the box the `right` slot renders into.
   *
   * It is a DEFINITE height on the square rather than a `flex-1` box, and that
   * is the point: a `flex-1` box squashes when the row is short, so the column
   * was being sized by a square that was not inside it (divergences row 90).
   * Stated, a short row simply makes the scroll area around the square scroll —
   * and the header, which sits outside that area, stays put (row 94).
   *
   * Empty in drawer mode, where the panel is a full-height overlay and the
   * square falls back to filling it.
   */
  const rightPaneContentStyle = computed(() =>
    geometry.value.previewSide > 0
      ? { '--wizard-preview-side': `${geometry.value.previewSide}px` }
      : {}
  )

  return {
    paneHeight,
    paneWidth,
    isCapped,
    geometry,
    rightPaneStyle,
    rightPaneVarStyle,
    rightPaneContentStyle,
  }
}
