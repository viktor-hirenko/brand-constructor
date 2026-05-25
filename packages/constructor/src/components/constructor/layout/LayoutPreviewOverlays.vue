<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useLibrariesStore } from '@/stores/libraries'
import ConceptPreviewPopup from '@/components/constructor/preview/ConceptPreviewPopup.vue'
import PrPackagePreviewPopup from '@/components/constructor/preview/PrPackagePreviewPopup.vue'
import NewConceptModal from '@/components/constructor/modals/NewConceptModal.vue'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'

const store = useConstructorStore()
const librariesStore = useLibrariesStore()

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
    Concept gallery preview: existing slider opens as a right-side drawer
    above the right column. The brief preview is what was switched to a
    centered modal — the gallery preview keeps its drawer behaviour.
  -->
  <Transition name="concept-backdrop">
    <div
      v-if="store.conceptPreviewOpen && overlayConcept"
      class="absolute inset-0 z-[28] bg-black/50 rounded-[14px]"
      @click="store.closeConceptPreview()"
    />
  </Transition>
  <Transition name="concept-panel">
    <div
      v-if="store.conceptPreviewOpen && overlayConcept"
      class="absolute right-0 top-0 h-full w-[58%] z-[29] overflow-hidden"
    >
      <ConceptPreviewPopup :concept="overlayConcept" />
    </div>
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

.concept-panel-enter-active,
.concept-panel-leave-active {
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.concept-panel-enter-from,
.concept-panel-leave-to {
  transform: translateX(100%);
}
</style>
