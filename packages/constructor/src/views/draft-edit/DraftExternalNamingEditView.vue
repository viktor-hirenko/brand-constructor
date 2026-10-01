<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { isBriefOrderLocked } from '@/utils/briefOrderLock'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming, BrandExternalNamingData, NewNamingBrief } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/alternative-selection/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import ConceptCascadeBanner from '@/components/constructor/edit-flow/ConceptCascadeBanner.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import NewNamingModal from '@/components/constructor/modals/NewNamingModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import {
  EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS,
  EDIT_FLOW_STACK_CLASS,
} from '@/constants/editFlowLayout'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'
import { isMadeForBrief, splitMadeForBrief } from '@/utils/madeForBrief'
import { useLibrariesStore } from '@/stores/libraries'
import MadeForBriefGroups from '@/components/constructor/edit-flow/MadeForBriefGroups.vue'

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
const orderLocked = computed(() => isBriefOrderLocked(store.brandStatus))
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const { data: namings, loading, error, fetchData, perPage } = useApiList<ExternalNaming>('/api/namings/external')
const librariesStore = useLibrariesStore()

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds ?? [])

const comment = computed({
  get: () => store.stepData.externalNaming.comment ?? '',
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const isCommentRequired = computed(() =>
  isExternalNamingCommentRequired(selectedIds.value, namings.value),
)

const commentHint = computed(() => getExternalNamingCommentHint(selectedIds.value, namings.value))

const isCreatingNew = computed(() => store.stepData.externalNaming.newNamingBrief != null)

const primaryDisabled = computed(
  () =>
    !isExternalNamingStepValid(
      selectedIds.value,
      store.stepData.externalNaming.comment ?? '',
      isCreatingNew.value,
      namings.value,
    ),
)

/**
 * Brief-orders plan, phase 2b: names the team made for this brief's order come
 * first, once the order was sent to the author; picking one needs no «Обрати
 * цей неймінг?» — it fulfils the order rather than replacing it.
 */
const namingGroups = computed(() =>
  splitMadeForBrief(namings.value, {
    brandId: store.brandId,
    ordersReadyAt: store.brandOrdersReadyAt,
    pickedIds: selectedIds.value,
  })
)

/**
 * The concept just picked was made for this brief's order: the names to pick
 * are the ones made with it, and there was no earlier choice to replace.
 */
const pickedMadeConcept = computed(() => {
  const id = store.stepData.concept.selectedId
  const concept = id ? librariesStore.concepts.find(c => c.id === id) : null
  return !!concept && isMadeForBrief(concept, store.brandId)
})

const MADE_CONCEPT_BANNER = {
  title: 'Оберіть External Naming для концепту',
  description: '',
} as const

function isMadeName(id: string): boolean {
  return namingGroups.value.made.some(n => n.id === id)
}

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

/*
 * «Замовити нову назву» — `5387:99881` draws it under the list on this screen
 * too (owner 29.09). Same behaviour as step 3 (`ExternalNamingView.vue`): a
 * brief replaces the picked names, picking a name drops the brief after a
 * confirmation.
 */
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)
const showSwitchConfirm = ref(false)
const pendingNamingId = ref<string | null>(null)

function handleBriefSave(brief: NewNamingBrief) {
  store.setNewNamingBrief(brief)
  store.setExternalNaming({ selectedIds: [] })
  showNewModal.value = false
}

function confirmDeleteBrief() {
  store.setNewNamingBrief(null)
  showDeleteConfirm.value = false
}

function handleToggle(id: string) {
  if (isCreatingNew.value && isMadeName(id)) {
    store.setNewNamingBrief(null)
    store.toggleExternalNaming(id)
    return
  }
  if (isCreatingNew.value) {
    pendingNamingId.value = id
    showSwitchConfirm.value = true
    return
  }
  store.toggleExternalNaming(id)
}

function confirmSwitchSelection() {
  const id = pendingNamingId.value
  if (id == null) return
  store.setNewNamingBrief(null)
  showSwitchConfirm.value = false
  pendingNamingId.value = null
  store.toggleExternalNaming(id)
}

function cancelSwitchSelection() {
  showSwitchConfirm.value = false
  pendingNamingId.value = null
}

watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'externalNaming') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)

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
    <!--
      `5387:99881`: Step header, Alert, the list with its button, the comment —
      24 apart; cards 8 apart, list → «Замовити нову назву» 16. No section
      label above the list on this screen.
    -->
    <div :class="['draft-edit-external-naming-view__body', EDIT_FLOW_STACK_CLASS]">
      <ConceptCascadeBanner v-if="pickedMadeConcept" v-bind="MADE_CONCEPT_BANNER" />
      <ConceptCascadeBanner v-else />

      <div :class="EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS">
        <ExternalNamingGridSkeleton v-if="showSkeleton" :count="6" />
        <UiAsyncState v-else-if="error" :message="error" @retry="loadNamings" />
        <MadeForBriefGroups v-else :made="namingGroups.made" :library="namingGroups.library">
          <template #default="{ items }">
            <ExternalNamingGrid
              :namings="items"
              :selected-ids="selectedIds"
              @toggle="handleToggle"
            />
          </template>
        </MadeForBriefGroups>

        <BriefOrderButton
          create-label="Замовити нову назву"
          created-label="Бриф неймінгу створено"
          :is-created="isCreatingNew"
          :locked="orderLocked"
          @create="showNewModal = true"
          @view="store.openBriefPreview('externalNaming', { allowEdit: !orderLocked })"
          @edit="showNewModal = true"
          @delete="showDeleteConfirm = true"
        />
      </div>

      <StepCommentField
        v-model="comment"
        label="Коментар"
        :required="isCommentRequired"
        :required-hint="commentHint"
      />

      <p v-if="store.saveError" class="text-sm text-red-600">
        {{ store.saveError }}
      </p>

      <NewNamingModal
        v-if="showNewModal"
        :initial-data="store.stepData.externalNaming.newNamingBrief"
        @save="handleBriefSave"
        @cancel="showNewModal = false"
      />

      <ConfirmationModal
        v-if="showDeleteConfirm"
        title="Видалити бриф?"
        body="Дані брифу буде втрачено. Цю дію неможливо скасувати."
        cancel-label="Скасувати"
        primary-label="Видалити"
        @cancel="showDeleteConfirm = false"
        @primary="confirmDeleteBrief"
      />

      <ConfirmationModal
        v-if="showSwitchConfirm"
        title="Обрати цей неймінг?"
        body="При виборі неймінгу створений бриф буде видалено. Цю дію неможливо скасувати."
        cancel-label="Скасувати"
        primary-label="Обрати неймінг"
        @cancel="cancelSwitchSelection"
        @primary="confirmSwitchSelection"
      />
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
