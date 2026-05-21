<script setup lang="ts">
import { computed } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useLibrariesStore } from '@/stores/libraries'
import ConceptPreviewPopup from '@/components/constructor/preview/ConceptPreviewPopup.vue'
import PrPackagePreviewPopup from '@/components/constructor/preview/PrPackagePreviewPopup.vue'

const store = useConstructorStore()
const librariesStore = useLibrariesStore()

const overlayConcept = computed(() => {
  const id = store.conceptPreviewConceptId
  if (!id) return null
  return librariesStore.concepts.find(item => item.id === id) ?? null
})
</script>

<template>
  <!-- Concept Preview: fullscreen backdrop + right-column popup -->
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

  <!-- PR Package Preview: fullscreen backdrop + right-column drawer -->
  <Transition name="concept-backdrop">
    <div
      v-if="store.prPackagePreviewOpen && store.prPackagePreviewPackage"
      class="absolute inset-0 z-[28] bg-black/50 rounded-[14px]"
      @click="store.closePrPackagePreview()"
    />
  </Transition>
  <Transition name="concept-panel">
    <div
      v-if="store.prPackagePreviewOpen && store.prPackagePreviewPackage"
      class="absolute right-0 top-0 h-full w-[58%] z-[29] overflow-hidden"
    >
      <PrPackagePreviewPopup :pkg="store.prPackagePreviewPackage" />
    </div>
  </Transition>
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
