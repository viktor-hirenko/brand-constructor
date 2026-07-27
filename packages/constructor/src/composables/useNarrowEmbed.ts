import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { isEmbedded } from './useEmbedMode'

/**
 * Reactive flag for "narrow embedded panel" — the Admin iframe rendered below a
 * width where the 42/58 dual-pane split no longer fits (portrait tablets and
 * smaller). Inside the iframe the media query evaluates against the panel width.
 *
 * Scoped to embed only: in standalone the flag stays `false` regardless of the
 * (real) viewport width, so the `transform: scale` layout is never affected.
 */
const NARROW_EMBED_QUERY = '(max-width: 900px)'

export function useNarrowEmbed() {
  const isNarrowEmbed = ref(false)
  let mql: MediaQueryList | null = null

  function sync(): void {
    isNarrowEmbed.value = isEmbedded() && !!mql && mql.matches
  }

  onMounted(() => {
    if (!isEmbedded() || typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(NARROW_EMBED_QUERY)
    sync()
    mql.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', sync)
    mql = null
  })

  return { isNarrowEmbed: readonly(isNarrowEmbed) }
}
