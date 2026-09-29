import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Picks how a picture sits inside the preview square: filling it and losing the
 * edges, or whole with the leftover space filled by a blurred copy of itself.
 *
 * ── DP-15450 changed the answer, and the reason is worth keeping ─────────────
 *
 * The designer's review says it twice, once per screen, both HIGH:
 *
 *   Concept Selection 4 — «Preview концепту неправильно масштабується: на різних
 *   viewport частина зображення обрізається.» → «Зберігати фіксовані пропорції
 *   preview без crop.»
 *
 *   CEO view 4 — «Preview справа некоректно масштабується: порушуються
 *   пропорції, частина контенту не вміщується.» → «Зберігати фіксовані пропорції
 *   preview без crop.»
 *
 * "Без crop" is not a preference between two looks — it is the rule. So the
 * tolerance below is what is left of the old 12% threshold: a picture is
 * cropped ONLY when its own proportions already match the square, where there
 * is nothing to crop. Anything else is shown whole.
 *
 * ── Why a tolerance at all, rather than a plain equality ─────────────────────
 *
 * The square's measured width and height are floats — the responsive section
 * derives the side from the row height, so a ratio of exactly 1 never arrives.
 * At 575 the 0.5% band is under 3px, i.e. below what the border radius already
 * hides, and it stops the mode flipping back and forth while the pane is being
 * resized.
 *
 * ── Why the decision is a pure function ──────────────────────────────────────
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — a composable that calls
 * `onMounted` and `ResizeObserver` cannot be mounted in a test. So the part
 * that can silently regress is `resolveImageFit`, which is plain arithmetic and
 * is pinned by `tests/unit/composables/adaptiveImageFit.test.ts`. Same idiom as
 * `constants/wizardResponsive.ts`.
 */

/**
 * How far the two proportions may differ and still count as "the same shape".
 * Below this the picture fills the square; at or above it, it is shown whole.
 */
export const CROP_TOLERANCE = 0.005

export type ImageFit = 'cover' | 'contain'

/**
 * The whole decision, as arithmetic.
 *
 * `containerAspect` / `imageAspect` are width ÷ height. A missing or
 * nonsensical value (nothing measured yet, a picture that has not decoded, a
 * zero-height box during the first paint) falls back to filling the square —
 * that is what the panel looked like before anything was known, and it keeps
 * the first frame from flashing a blurred backdrop.
 */
export function resolveImageFit(
  containerAspect: number | null | undefined,
  imageAspect: number | null | undefined,
): ImageFit {
  if (!containerAspect || !imageAspect) return 'cover'
  if (!Number.isFinite(containerAspect) || !Number.isFinite(imageAspect)) return 'cover'
  if (containerAspect <= 0 || imageAspect <= 0) return 'cover'

  // How much of the picture filling the box would cut away, as a fraction of
  // its longer side. Symmetric: it does not matter which of the two is wider.
  const cropped =
    containerAspect > imageAspect
      ? 1 - imageAspect / containerAspect
      : 1 - containerAspect / imageAspect

  return cropped >= CROP_TOLERANCE ? 'contain' : 'cover'
}

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

  function fitModeFor(url: string | null | undefined): ImageFit {
    if (!url) return 'cover'
    return resolveImageFit(containerAspect.value, imageAspect.value.get(url))
  }

  /**
   * The picture's own proportion, once it has decoded — `null` until then.
   *
   * The concept-gallery drawer sizes its BOX from this instead of asking how to
   * fit a picture into a box that was handed to it (DP-15450, the owner's call).
   * Everywhere else the box is the kit's square and only `fitModeFor` matters.
   */
  function aspectFor(url: string | null | undefined): number | null {
    if (!url) return null
    return imageAspect.value.get(url) ?? null
  }

  return { containerRef, recordAspect, fitModeFor, aspectFor }
}
