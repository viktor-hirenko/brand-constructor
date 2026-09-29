<script setup lang="ts">
import { computed } from 'vue'
import { PHOSPHOR_VIEW_BOX, phosphorPaths } from '@brand-constructor/shared'

/**
 * One Phosphor glyph — DP-15859.
 *
 * `svg` is a file of `@phosphor-icons/core` imported as text, e.g.
 * `import tag from '@phosphor-icons/core/regular/tag.svg?raw'`. The folder in
 * that path IS the weight; this component has no weight of its own.
 *
 * Painted in `currentColor`, sized by the caller's class — the glyph follows
 * the text it stands next to.
 */
const props = defineProps<{ svg: string }>()

const paths = computed(() => phosphorPaths(props.svg))
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="PHOSPHOR_VIEW_BOX"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
