<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useLibrariesStore } from '@/stores/libraries'
import PrPackagePreviewPopup from '@/components/constructor/preview/PrPackagePreviewPopup.vue'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'
import { isEmbedded } from '@/composables/useEmbedMode'

const store = useConstructorStore()
const librariesStore = useLibrariesStore()

// The backdrop's `rounded-[14px]` matches the standalone card's own corner
// radius (`SHELL_BASE_CLASS`). The embedded shell is a square, edge-to-edge
// panel (`shellBaseClass(embed)` drops the radius entirely) — rounding the
// backdrop there just shows stray rounded corners against a square panel.
const embedded = isEmbedded()

const overlayConcept = computed(() => {
  const id = store.conceptPreviewConceptId
  if (!id) return null
  return librariesStore.concepts.find(item => item.id === id) ?? null
})

const conceptBrief = computed(() => store.stepData.concept.newConceptBrief)
const externalNamingBrief = computed(
  () => store.stepData.externalNaming.newNamingBrief,
)
const internalNamingFeedback = computed(
  () => store.stepData.internalNaming.newNamingFeedback,
)

/**
 * Read-only preview modals reuse the same `New*Modal` components used for
 * editing — the form is wrapped in a disabled `<fieldset>` and the shell
 * swaps «Зберегти» for «Редагувати», which raises a one-shot signal that
 * the owning wizard view consumes to open its own editable modal.
 */
function handleRequestEdit() {
  store.requestBriefPreviewEdit()
}
</script>

<template>
  <!--
    Concept gallery preview: the slider opens as a right-side drawer over the
    right column. The brief preview is what was switched to a centered modal —
    the gallery preview keeps its drawer behaviour.

    Only the BACKDROP is here. It is mounted at the shell root on purpose: the
    dimming has to cover the wizard header too (DP-15450 · Concept Selection 6,
    «Overlay модалки має затемнювати весь viewport, включно з header»), and the
    header is not inside the row. The panel itself is `ConceptGalleryDrawer`,
    mounted in the row so that it lands exactly on the right column — at the
    root it ran the full window height and past the 1700 frame on a wide screen.
  -->
  <Transition name="concept-backdrop">
    <div
      v-if="store.conceptPreviewOpen && overlayConcept"
      class="absolute inset-0 z-[28] bg-black/50"
      :class="embedded ? '' : 'rounded-[14px]'"
      @click="store.closeConceptPreview()"
    />
  </Transition>

  <!--
    PR Package preview: centered modal (own Teleport inside
    `PrPackagePreviewPopup` via `BriefModalShell`).
  -->
  <PrPackagePreviewPopup
    v-if="store.prPackagePreviewOpen && store.prPackagePreviewPackage"
    :pkg="store.prPackagePreviewPackage"
  />

  <!--
    Brief previews: render the same `New*Modal` used for editing but in
    `readonly` mode. The shell handles centered layout + backdrop via its
    own Teleport, and the disabled `<fieldset>` makes every field inert
    while preserving the editable visual style.
  -->
  <NewConceptModal
    v-if="store.briefPreviewKind === 'concept' && conceptBrief"
    :initial-data="conceptBrief"
    readonly
    :show-edit-action="store.briefPreviewAllowEdit"
    @cancel="store.closeBriefPreview()"
    @edit="handleRequestEdit"
  />
  <NewNamingModal
    v-if="store.briefPreviewKind === 'externalNaming' && externalNamingBrief"
    :initial-data="externalNamingBrief"
    readonly
    :show-edit-action="store.briefPreviewAllowEdit"
    @cancel="store.closeBriefPreview()"
    @edit="handleRequestEdit"
  />
  <NewInternalNamingModal
    v-if="store.briefPreviewKind === 'internalNaming' && internalNamingFeedback"
    :initial-feedback="internalNamingFeedback"
    readonly
    :show-edit-action="store.briefPreviewAllowEdit"
    @cancel="store.closeBriefPreview()"
    @edit="handleRequestEdit"
  />
</template>

<style scoped>
.concept-backdrop-enter-active,
.concept-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.concept-backdrop-enter-from,
.concept-backdrop-leave-to {
  opacity: 0;
}

/* The panel's own slide lives with the panel, in `ConceptGalleryDrawer.vue`. */
</style>
