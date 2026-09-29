<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useLibrariesStore } from '@/stores/libraries'
import ConceptPreviewPopup from '@/components/constructor/preview/ConceptPreviewPopup.vue'
import { useNarrowEmbed } from '@/composables/useNarrowEmbed'

/**
 * The concept-gallery drawer: the panel that slides in from the right when the
 * eye beside a concept is pressed (step 2 and the final review).
 *
 * ── It is a DRAWER, and it stays one at every width ──────────────────────────
 *
 * It is mounted at the shell ROOT (`overlays`), so it slides in from the edge
 * of the window and takes its full height — including the strip the wizard
 * header occupies, which is why only ONE cross is on screen while it is open,
 * its own.
 *
 * This was tried the other way and the owner rejected it on sight. Mounted
 * inside the row, the panel became the right column exactly — which sounds
 * right and looks wrong: above 1671 the row is the 1700-wide frame, so on a
 * 2560 × 1440 screen the drawer turned into a card floating inside that frame,
 * with grey to the right of it and the wizard's own cross above it. It read as
 * a modal. A modal is not what this is, and the same control must not be a
 * drawer on a 1680 screen and a modal on a 2560 one.
 *
 * So the geometry stays: the window's right edge, the window's height. What is
 * inside it is sized by the picture — see `constants/previewLayout.ts`.
 */

const store = useConstructorStore()
const librariesStore = useLibrariesStore()

// On narrow embedded panels the drawer spans the full width (same rationale as
// the shell's own preview drawer); wide/standalone keeps the right column's
// measured width, published by the shell as `--wizard-right-pane-width`.
const { isNarrowEmbed } = useNarrowEmbed()

/**
 * Width: the right column, but never less than half the wizard.
 *
 * The column is sized from the drawn square, and above 1920 that square stops
 * growing — at 2560 the column is 904 of a 2350-wide wizard, i.e. 38%. The
 * drawer inherits that number and the picture inside it is then capped by the
 * WIDTH while a third of the drawer's height stands empty: 856 of picture in
 * 1320 of room, 232 of white above and below it. That emptiness is what the
 * owner opened this with.
 *
 * The floor is half, which is what the drawer already is everywhere the column
 * is the designer's own number — 639 of 1230 at 1440, 722 of 1470 at 1680, both
 * a hair over 50% — so nothing moves at her widths, and the big screen stops
 * being the odd one out. At 2560 the drawer becomes 1175 and the picture 1127,
 * which uses the height instead of white.
 */
const WIDTH_CLASS = 'w-[max(var(--wizard-right-pane-width,58%),50%)]'

const overlayConcept = computed(() => {
  const id = store.conceptPreviewConceptId
  if (!id) return null
  return librariesStore.concepts.find(item => item.id === id) ?? null
})
</script>

<template>
  <Transition name="concept-panel">
    <div
      v-if="store.conceptPreviewOpen && overlayConcept"
      class="absolute right-0 top-0 h-full z-[29] overflow-hidden"
      :class="isNarrowEmbed ? 'w-full' : WIDTH_CLASS"
    >
      <ConceptPreviewPopup :concept="overlayConcept" />
    </div>
  </Transition>
</template>

<style scoped>
.concept-panel-enter-active,
.concept-panel-leave-active {
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.concept-panel-enter-from,
.concept-panel-leave-to {
  transform: translateX(100%);
}
</style>
