<script setup lang="ts">
import UiAlert from '@/components/ui/UiAlert.vue'

/**
 * Warning banner shown on the chained External Naming step after the user
 * changed the concept during a draft inline edit from the final review.
 *
 * It stands directly above the naming list phase 16 redrew, and the designer
 * draws it there as the kit Alert, type = Warning — `5395:111306` on the "Edit
 * External Naming" frame, 527×88, `get_variable_defs` returning
 * `alert/bg/warning` #fefbe9, `alert/border/warning` #e9c162,
 * `alert/icon/warning` #ab6400, title `header/s` 18/24 in #1f1f2e and
 * description `body/regular` 16/24 in #6f6f7d at `radius/alert` 16.
 *
 * What stood here was a hand-drawn cream card at radius 8 with four colours the
 * kit does not contain (#fefce8, #f5e6bc, #eab308, #717182) and its own inline
 * SVG. `UiAlert type="warning"` is those tokens exactly, and its default glyph
 * is already the kit's own `WarningCircle` Fill (phase 23), which is the glyph
 * the mockup draws — so nothing here needs a colour, a size or a path of its
 * own. The wording is ours and unchanged: the mockup's copy is a different
 * sentence, and copy is not this task's to move.
 */
</script>

<template>
  <UiAlert
    class="concept-cascade-banner"
    type="warning"
    title="Необхідно обрати External Naming"
    description="Попередній вибір більше не відповідає новому концепту."
  />
</template>
