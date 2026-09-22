<script setup lang="ts">
/**
 * Kit Pagination — Figma `3715:5756`, DP-15258 phase 17.
 *
 * A blurred pill of dots that floats over an image: one dot per slide, the
 * current one drawn larger and fully white. Geometry and colours live in
 * `ui/uiPagination.ts` — this file only wires them to clicks.
 *
 * The dots are real buttons: the slider they sit on lets you jump straight to
 * a slide, and that behaviour predates the kit pass.
 */
import { computed } from 'vue'
import { resolveUiPaginationClasses } from '@/components/ui/uiPagination'

const props = withDefaults(
  defineProps<{
    /** Number of dots. */
    count: number
    /** 0-based index of the current slide. */
    activeIndex: number
    /** Builds the aria-label of dot `i` (1-based). */
    dotLabel?: (index: number) => string
  }>(),
  {
    dotLabel: (index: number) => `Слайд ${index}`,
  }
)

const emit = defineEmits<{
  select: [index: number]
}>()

const classes = computed(() => resolveUiPaginationClasses())
</script>

<template>
  <div :class="classes.root">
    <div :class="classes.dots">
      <button
        v-for="i in props.count"
        :key="i - 1"
        type="button"
        :class="classes.dot(i - 1 === props.activeIndex)"
        :aria-label="props.dotLabel(i)"
        :aria-current="i - 1 === props.activeIndex ? 'true' : undefined"
        @click="emit('select', i - 1)"
      />
    </div>
  </div>
</template>
