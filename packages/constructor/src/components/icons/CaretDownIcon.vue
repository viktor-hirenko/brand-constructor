<script setup lang="ts">
import { PHOSPHOR_VIEW_BOX, phosphorPaths } from '@brand-constructor/shared'
import glyph from '@phosphor-icons/core/regular/caret-down.svg?raw'
import type { IconProps } from './types'

/**
 * Phosphor `CaretDown`, Regular weight — the kit's own chevron.
 *
 * DP-15859: the drawing comes from `@phosphor-icons/core`, file `regular/caret-down.svg`,
 * not from the Figma export described below. The two were compared as
 * rasters at 96 px and match within anti-aliasing.
 *
 * Source: the accordion header's Chevron Icon `3839:12555` exports this exact
 * path at 16×16, and the designer's Icon mapping table (`5658:39246`) names it
 * outright: "Chevron down → CaretDown, Regular".
 *
 * One file, two boxes merged. `ChevronDownIcon.vue` used to sit beside this
 * one and was a different drawing — a 24-box stroked chevron at
 * `stroke-width: 2`, which at 16 rendered ~1.33 wide and read visibly heavier.
 * That difference is what QA caught on phase 12. Phase 23 then converted it to
 * this same Phosphor path on a 24 viewBox, which made the two files the same
 * glyph twice: 16.5 of 24 and 11 of 16 are both 68.75% of the box, so they
 * render identically at any size. The clean-up work deleted the duplicate and
 * pointed its two carriers — `LandingDraftCta` and `BriefOrderButton` — here.
 *
 * The open state reuses this glyph under `rotate-180`. The kit draws a
 * separate `CaretUp` there, but it is the vertical mirror of this path in the
 * same `#6F6F7D`, so the rotation is exact rather than approximate.
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
