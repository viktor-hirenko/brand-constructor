<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming, BrandExternalNamingData } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/alternative-selection/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import ConceptCascadeBanner from '@/components/constructor/edit-flow/ConceptCascadeBanner.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
} from '@/constants/editFlowLayout'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'

/**
 * Draft inline-edit — chained External Naming screen (Figma "Twil" flow).
 *
 * Reached only via the concept cascade (the Author changed the concept on the
 * previous screen, so the dependent external naming was cleared and must be
 * re-picked). Footer is «Назад» + «Зберегти»:
 *  - «Назад» restores the original external slice and returns to the concept
 *    screen (concept pick preserved).
 *  - «Зберегти» persists the new concept + external pair and returns to review.
 */
const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const { data: namings, loading, error, fetchData, perPage } = useApiList<ExternalNaming>('/api/namings/external')

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds ?? [])

const comment = computed({
  get: () => store.stepData.externalNaming.comment ?? '',
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const isCommentRequired = computed(() =>
  isExternalNamingCommentRequired(selectedIds.value, namings.value),
)

const commentHint = computed(() => getExternalNamingCommentHint(selectedIds.value, namings.value))

const primaryDisabled = computed(
  () =>
    !isExternalNamingStepValid(
      selectedIds.value,
      store.stepData.externalNaming.comment ?? '',
      false,
      namings.value,
    ),
)

const conceptIdForNamings = computed(() => store.stepData.concept.selectedId)

const isSaving = computed(() => store.isSaving)

const hasFetched = ref(false)
const showSkeleton = computed(() => !hasFetched.value || loading.value)

async function loadNamings() {
  perPage.value = 50
  const params: Record<string, string> = { status: 'active' }
  if (conceptIdForNamings.value) params.concept_id = conceptIdForNamings.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(async () => {
  // Defensive: this screen is only valid mid-cascade (editingSection === 'concept').
  // A stale/cold entry without an active session redirects to the review.
  // (Cold-start F5 is already intercepted by the router's cold-start guard.)
  if (store.editingSection !== 'concept') {
    router.replace(`/constructor/brand/${brandId.value}`)
    return
  }
  await loadNamings()
})

function handleToggle(id: string) {
  store.toggleExternalNaming(id)
}

function goBack() {
  // Restore external to its pre-cascade baseline so the concept screen reopens
  // with a clean slice; keep the concept pick the user just made.
  const snap = store.cascadeSnapshots.externalNaming as BrandExternalNamingData | null
  if (snap) {
    store.setExternalNaming({
      selectedIds: [...(snap.selectedIds ?? [])],
      newNamingBrief: snap.newNamingBrief ?? null,
    })
  }
  router.push(`/constructor/brand/${brandId.value}/draft-edit/concept`)
}

async function goSave() {
  const saved = await store.saveBrand()
  if (!saved) return
  store.commitEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

const subtitleText = 'Оберіть до 3-х назв, що пройдуть перевірку юристами на можливі ризики.'
</script>

<template>
  <EditFlowStepShell
    class="draft-edit-external-naming-view"
    title="External Naming"
    :subtitle="subtitleText"
  >
    <div :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <ConceptCascadeBanner class="mb-6" />

      <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
        <EditFlowSectionLabel>Назви для обраного концепту</EditFlowSectionLabel>

        <ExternalNamingGridSkeleton v-if="showSkeleton" :count="6" />
        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-500 mb-3">{{ error }}</p>
          <button type="button" class="text-primary underline text-sm" @click="loadNamings">
            Спробувати знову
          </button>
        </div>
        <ExternalNamingGrid
          v-else
          :namings="namings"
          :selected-ids="selectedIds"
          @toggle="handleToggle"
        />
      </div>

      <StepCommentField
        v-model="comment"
        label="Коментар"
        class="mt-6"
        :required="isCommentRequired"
        :required-hint="commentHint"
      />

      <p v-if="store.saveError" class="text-sm text-red-600 mt-2">
        {{ store.saveError }}
      </p>
    </div>

    <template #footer>
      <UiFooter
        cancel-label="Назад"
        primary-label="Зберегти"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goBack"
        @primary="goSave"
      />
    </template>
  </EditFlowStepShell>
</template>
