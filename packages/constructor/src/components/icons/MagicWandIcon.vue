<script setup lang="ts">
import { PHOSPHOR_VIEW_BOX, phosphorPaths } from '@brand-constructor/shared'
import glyph from '@phosphor-icons/core/regular/magic-wand.svg?raw'
import type { IconProps } from './types'

/**
 * Phosphor `MagicWand`, Regular weight — the kit's own glyph, node
 * `3298:4228` in icon set `3261:907`.
 *
 * DP-15859: the drawing comes from `@phosphor-icons/core`, file `regular/magic-wand.svg`,
 * not from the Figma export described below. The two were compared as
 * rasters at 96 px and match within anti-aliasing.
 *
 * Added 24.09 after the owner spotted the wrong glyph on step 7. Phase 23
 * translated icon FILES by the designer's mapping table (`5658:39246`), which
 * pairs our `Sparkles` with Phosphor `Sparkle` — correct as far as it goes.
 * But the table maps names, not places: the delegate row on step 7 draws
 * `MagicWand` (`5382:57238`), a different glyph entirely, and no file for it
 * existed. Lesson recorded: a mapping table tells you what a file becomes, not
 * what each call site should show.
 *
 * One filled path, no stroke, coordinates inside the 24 box — the shape every
 * kit glyph takes. Taken from the export, not redrawn.
 *
 * Size and colour are decided by the component that shows this icon, never
 * here.
 */
const props = defineProps<IconProps>()

const paths = phosphorPaths(glyph)
</script>

<template>
  <svg
    :class="props.class ?? 'size-4 shrink-0'"
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="PHOSPHOR_VIEW_BOX"
    fill="currentColor"
    :role="props.title ? 'img' : undefined"
    :aria-label="props.title"
    :aria-hidden="props.title ? undefined : true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
