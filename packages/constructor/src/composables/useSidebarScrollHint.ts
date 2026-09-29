import { computed, ref, type Ref } from 'vue'
import { logSilent } from '@/utils/log'

/**
 * The scroll hint over the step 7 Sidebar preview — DP-15450, Interface
 * Components 3 (MEDIUM), her words: «Неочевидно, що preview можна скролити. →
 * Додати hint, щоб підказати користувачу, що preview сайдбару можна скролити.
 * Показувати hint один раз при першій взаємодії з таким preview і прибирати
 * після scroll.»
 *
 * «Один раз» is kept per browser: the first scroll of the Sidebar list marks
 * the hint as seen in `localStorage`, and it never shows again there. Until
 * that scroll it shows every time the Sidebar layer is on the phone — hiding
 * the layer with the eye and showing it again is not a scroll.
 *
 * Storage can be missing or throw (private window, blocked site data); the
 * hint then lives for the page's lifetime only, which is still «до першого
 * скролу».
 */
export const SIDEBAR_SCROLL_HINT_STORAGE_KEY = 'wizard:sidebar-scroll-hint-seen'

/** The rule, without Vue: shown while the layer is up and nobody has scrolled it. */
export function shouldShowSidebarScrollHint(sidebarShown: boolean, seen: boolean): boolean {
  return sidebarShown && !seen
}

function readSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(SIDEBAR_SCROLL_HINT_STORAGE_KEY) === '1'
  } catch (err) {
    logSilent('useSidebarScrollHint/read', err)
    return false
  }
}

function writeSeen(): void {
  try {
    globalThis.localStorage?.setItem(SIDEBAR_SCROLL_HINT_STORAGE_KEY, '1')
  } catch (err) {
    logSilent('useSidebarScrollHint/write', err)
  }
}

export function useSidebarScrollHint(sidebarShown: Ref<boolean>) {
  const seen = ref(readSeen())

  const visible = computed(() => shouldShowSidebarScrollHint(sidebarShown.value, seen.value))

  /** Bound to the Sidebar list's scroll — the first one retires the hint. */
  function markScrolled(): void {
    if (seen.value) return
    seen.value = true
    writeSeen()
  }

  return { visible, markScrolled }
}
