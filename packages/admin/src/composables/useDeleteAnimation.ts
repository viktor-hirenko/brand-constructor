import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * A short fade for the item a person deletes — and only for it.
 *
 * The lists also change on their own (quiet polling, sorting, tab switches);
 * animating those would make rows float around. So the `<TransitionGroup>`
 * name is `list-delete` only for a moment around a delete and `list-still`
 * (no CSS, so no transition) the rest of the time. Classes live in
 * `styles/global.scss`, which also turns them off for reduced motion.
 */
export function useDeleteAnimation(ms = 350) {
  const active = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const transitionName = computed(() => (active.value ? 'list-delete' : 'list-still'))

  /**
   * Runs `remove` (the in-place drop of the deleted item) with the fade on,
   * then — once the fade is over and the switch is off again — `refresh`.
   * The refresh must wait: whatever it brings (a brand from past the page
   * limit, someone else's change) would otherwise slide in somewhere else in
   * the list while the delete is still animating (owner, 29.09).
   */
  function playDelete(remove: () => void, refresh?: () => void): void {
    active.value = true
    remove()
    clearTimeout(timer)
    timer = setTimeout(() => {
      active.value = false
      refresh?.()
    }, ms)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { transitionName, playDelete }
}

/**
 * Card grids: take the leaving card out of the flow where it stands, so the
 * cards after it can slide into its place while it fades. The grid needs
 * `position: relative`.
 */
export function pinLeavingCard(el: Element): void {
  const card = el as HTMLElement
  card.style.width = `${card.offsetWidth}px`
  card.style.height = `${card.offsetHeight}px`
  card.style.left = `${card.offsetLeft}px`
  card.style.top = `${card.offsetTop}px`
  card.style.position = 'absolute'
}
