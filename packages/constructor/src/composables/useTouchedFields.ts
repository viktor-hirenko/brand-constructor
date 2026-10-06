import { reactive, watch, type Ref } from 'vue'

/**
 * Which required fields the person has dealt with — the switch behind a
 * field's «fill me in» hint, so the hint stays away on a fresh screen.
 *
 * A field counts as touched once the person changed it, left it (closed its
 * list or calendar, or moved focus away) or pressed the greyed-out «Далі».
 * Step 1 used to mark a field only when its value changed, so a GEO list
 * opened and closed empty, or a calendar dismissed without a day, said
 * nothing (H-38, run 02.10: T-004).
 */
export function useTouchedFields<K extends string>(
  fields: readonly K[],
  blockedNextPresses: Readonly<Ref<number>> | null
) {
  const touched = reactive(
    Object.fromEntries(fields.map(field => [field, false]))
  ) as Record<K, boolean>

  function touch(field: K): void {
    touched[field] = true
  }

  if (blockedNextPresses) {
    watch(blockedNextPresses, () => fields.forEach(touch))
  }

  return { touched, touch }
}
