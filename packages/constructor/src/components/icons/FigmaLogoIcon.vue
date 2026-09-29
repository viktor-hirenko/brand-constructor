<script setup lang="ts">
import { PHOSPHOR_VIEW_BOX, phosphorPaths } from '@brand-constructor/shared'
import glyph from '@phosphor-icons/core/regular/figma-logo.svg?raw'
import type { IconProps } from './types'

/**
 * Phosphor `FigmaLogo`, Regular weight — the kit's own glyph, node `5658:39709`.
 *
 * DP-15859: the drawing comes from `@phosphor-icons/core`, file `regular/figma-logo.svg`,
 * not from the Figma export described below. The two were compared as
 * rasters at 96 px and match within anti-aliasing.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "UI рішення | → FigmaLogo, Regular".
 *
 * New file. The slot it fills — the "UI рішення" feature row on the wizard
 * landing — carried `TargetIcon`. Phase 23 read this pair and rejected it as
 * meaningless; the pairing is the designer's call, not ours.
 *
 * The kit draws one filled path and no stroke at all.
 *
 * Size and colour are decided by the component that shows this icon, never
 * here — see `uiProperty.ts`, `uiButton.ts`, `uiIconButton.ts`, `uiLink.ts`.
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
