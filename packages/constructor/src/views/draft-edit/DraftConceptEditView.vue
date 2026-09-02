<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type {
  Concept,
  BrandConceptData,
  BrandExternalNamingData,
} from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/alternative-selection/ConceptGrid.vue'
import ConceptGridSkeleton from '@/components/constructor/skeletons/ConceptGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
} from '@/constants/editFlowLayout'

/**
 * Draft inline-edit — concept selection screen (Figma "Twil" flow).
 *
 * Opened from the *draft* final review when the Author re-picks a concept.
 * Mirrors the po-edit / ceo-reselect edit-flow pattern (wide layout,
 * UiFooter «Скасувати / Далі») but without the CEO-suggestion blocks.
 *
 * Cascade: when the concept actually changes AND the brief already had
 * external-naming picks, «Далі» clears external and chains to the dedicated
 * external-naming screen (re-selection required). Otherwise «Далі» saves and
 * returns to the review.
 */
const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const { data: concepts, loading, error, fetchData, perPage } = useApiList<Concept>('/api/concepts')

const selectedId = computed(() => store.stepData.concept.selectedId)
const previewId = computed(() => store.stepData.concept.previewId ?? null)
const hasBrief = computed(() => store.stepData.concept.newConceptBrief !== null)

const comment = computed({
  get: () => store.stepData.concept.comment ?? '',
  set: (val: string) => store.setConcept({ comment: val }),
})

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
] as const

const themeMode = computed({
  get: () => store.stepData.mode ?? 'light',
  set: (value: string) => {
    if (value === 'light' || value === 'dark') store.setMode(value)
  },
})

const selectedMode = computed(() => store.stepData.mode)

const isSaving = ref(false)
const primaryDisabled = computed(() => !selectedId.value && !hasBrief.value)

const hasFetched = ref(false)
const showSkeleton = computed(() => !hasFetched.value || loading.value)

/**
 * The concept the brief had BEFORE this edit session started. Read from the
 * inline-edit snapshot (captured by `beginEditSection`), which survives the
 * concept ↔ external hop because we never re-begin the session while it is
 * already active.
 */
const baselineConceptId = computed(() => {
  const snap = store.editingSectionSnapshot as BrandConceptData | null
  return snap?.selectedId ?? null
})

async function loadConcepts() {
  perPage.value = 50
  const params: Record<string, string> = { status: 'active' }
  if (selectedMode.value) params.mode = selectedMode.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(() => {
  // Begin a fresh edit session only when one is not already active. On the
  // first entry from the review this snapshots the original concept; when the
  // user returns via «Назад» from the external screen the session is still
  // open, so we keep the original snapshot (and cascade snapshot) intact.
  if (store.editingSection !== 'concept') {
    store.beginEditSection('concept', 8)
  }
  if (store.stepData.mode == null) store.setMode('light')
  loadConcepts()
})

watch(selectedMode, loadConcepts)

function handleSelect(conceptId: string) {
  if (conceptId === selectedId.value) {
    store.setConcept({ selectedId: null, previewId: null })
  } else {
    store.setConcept({ selectedId: conceptId, previewId: conceptId })
  }
}

function goCancel() {
  // Restores concept (primary snapshot) AND external (cascade snapshot, if a
  // cascade was triggered earlier this session) atomically.
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (primaryDisabled.value) return

  const nextConceptId = store.stepData.concept.selectedId
  const isBriefConcept = store.stepData.concept.newConceptBrief !== null
  const conceptChanged = nextConceptId !== baselineConceptId.value

  // The original external slice — from the cascade snapshot if already
  // captured this session, otherwise the current (untouched) slice.
  const originalExternal = (
    Object.prototype.hasOwnProperty.call(store.cascadeSnapshots, 'externalNaming')
      ? (store.cascadeSnapshots.externalNaming as BrandExternalNamingData | null)
      : store.stepData.externalNaming
  )
  const hadExternalPicks =
    (originalExternal?.selectedIds?.length ?? 0) > 0 ||
    originalExternal?.newNamingBrief != null

  // Cascade: concept changed (to another concept, not a brief) and external
  // naming had picks → clear external and require re-selection on the next step.
  if (conceptChanged && !isBriefConcept && hadExternalPicks) {
    if (!Object.prototype.hasOwnProperty.call(store.cascadeSnapshots, 'externalNaming')) {
      store.captureCascadeSnapshot('externalNaming')
    }
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    router.push(`/constructor/brand/${brandId.value}/draft-edit/concept/external-naming`)
    return
  }

  // No cascade needed → persist and return to the review.
  isSaving.value = true
  const saved = await store.saveBrand()
  isSaving.value = false
  if (!saved) return
  store.commitEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}
</script>

<template>
  <EditFlowStepShell
    class="draft-edit-concept-view"
    title="Concept Selection"
    subtitle="Оберіть концепт та перегляньте прев'ю праворуч."
  >
    <div :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
        <div class="flex items-center justify-between max-w-[506px]">
          <EditFlowSectionLabel>Концепти</EditFlowSectionLabel>
          <SegmentedControl v-model="themeMode" :options="[...themeOptions]" aria-label="Тема інтерфейсу" />
        </div>

        <ConceptGridSkeleton v-if="showSkeleton" />
        <div v-else-if="error" class="text-center py-8 text-red-500">
          <p class="mb-2">{{ error }}</p>
          <button type="button" class="text-primary underline text-sm" @click="loadConcepts">
            Спробувати знову
          </button>
        </div>
        <ConceptGrid
          v-else
          :concepts="concepts"
          :selected-id="selectedId"
          :preview-id="previewId"
          :selection-ring="true"
          @select="handleSelect"
        />
      </div>

      <StepCommentField v-model="comment" label="Коментар" class="mt-6" />
    </div>

    <template #footer>
      <UiFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goDali"
      />
    </template>
  </EditFlowStepShell>
</template>
