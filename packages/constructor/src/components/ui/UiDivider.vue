<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiDividerClasses, type UiDividerOrientation } from '@/components/ui/uiDivider'

/**
 * Kit divider — Figma `3446:5229` (horizontal) / `5259:79966` (vertical).
 *
 * Renders `<hr>` in both orientations: it is the semantic separator element,
 * and the horizontal call sites it replaces were already `<hr>`, so the DOM
 * shape (and any `:deep()` selector aimed at it) is unchanged.
 *
 * Spacing is the caller's, never the divider's — the edit-flow rules carry
 * `EDIT_FLOW_DIVIDER_CLASS` for their own `my-10` and full-bleed hook.
 */
interface UiDividerProps {
  orientation?: UiDividerOrientation
}

const props = withDefaults(defineProps<UiDividerProps>(), {
  orientation: 'horizontal',
})

const dividerClass = computed(() => resolveUiDividerClasses(props.orientation))
</script>

<template>
  <hr :class="dividerClass" :aria-orientation="orientation" />
</template>
