import { computed, ref, type Ref } from 'vue'
import { logSilent } from '@/utils/log'

/**
 * The scroll hint over the step 7 Sidebar preview — DP-15450, Interface
 * Components 3 (MEDIUM), her words: «Неочевидно, що preview можна скролити. →
 * Додати hint, щоб підказати користувачу, що preview сайдбару можна скролити.
 * Показувати hint один раз при першій взаємодії з таким preview і прибирати
 * після scroll.»
 *
 * «Один раз» is **per brief** (owner 30.09): each new brief shows it again
 * until its Sidebar list is first scrolled. It used to be one flag per
 * browser — a single scroll anywhere, ever, retired it for every future brief,
 * and the owner never saw it on a fresh one. Until that scroll it shows every
 * time the Sidebar layer is on the phone — hiding the layer with the eye and
 * showing it again is not a scroll.
 *
 * Storage can be missing or throw (private window, blocked site data); the
 * hint then lives for the page's lifetime only, which is still «до першого
 * скролу». A brief without an id yet keeps the flag in memory only.
 */
export const SIDEBAR_SCROLL_HINT_STORAGE_KEY = 'wizard:sidebar-scroll-hint-seen'

/** Per-brief storage key. */
export function sidebarScrollHintStorageKey(briefId: string): string {
  return `${SIDEBAR_SCROLL_HINT_STORAGE_KEY}:${briefId}`
}

/** The rule, without Vue: shown while the layer is up and nobody has scrolled it. */
export function shouldShowSidebarScrollHint(sidebarShown: boolean, seen: boolean): boolean {
  return sidebarShown && !seen
}

function readSeen(briefId: string | null): boolean {
  if (!briefId) return false
  try {
    return globalThis.localStorage?.getItem(sidebarScrollHintStorageKey(briefId)) === '1'
  } catch (err) {
    logSilent('useSidebarScrollHint/read', err)
    return false
  }
}

function writeSeen(briefId: string | null): void {
  if (!briefId) return
  try {
    globalThis.localStorage?.setItem(sidebarScrollHintStorageKey(briefId), '1')
  } catch (err) {
    logSilent('useSidebarScrollHint/write', err)
  }
}

export function useSidebarScrollHint(sidebarShown: Ref<boolean>, briefId: Ref<string | null> = ref(null)) {
  /** Briefs scrolled during this page's life — covers storage that fails. */
  const scrolledHere = ref<Set<string>>(new Set())
  const scrolledWithoutId = ref(false)

  const seen = computed(() => {
    const id = briefId.value
    if (!id) return scrolledWithoutId.value
    return scrolledHere.value.has(id) || readSeen(id)
  })

  const visible = computed(() => shouldShowSidebarScrollHint(sidebarShown.value, seen.value))

  /** Bound to the Sidebar list's scroll — the first one retires the hint for this brief. */
  function markScrolled(): void {
    if (seen.value) return
    const id = briefId.value
    if (!id) {
      scrolledWithoutId.value = true
      return
    }
    scrolledHere.value = new Set(scrolledHere.value).add(id)
    writeSeen(id)
  }

  return { visible, markScrolled }
}
