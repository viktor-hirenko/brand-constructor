<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import InternalNamingGrid from '@/components/constructor/alternative-selection/InternalNamingGrid.vue'
import InternalNamingGridSkeleton from '@/components/constructor/skeletons/InternalNamingGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import BriefOrderButton from '@/components/constructor/edit-flow/BriefOrderButton.vue'
import NewInternalNamingModal from '@/components/constructor/modals/NewInternalNamingModal.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_COMMENT_OFFSET_CLASS,
  EDIT_FLOW_DIVIDER_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
  EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS,
  EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
} from '@/constants/editFlowLayout'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

/**
 * post-apply = PO applied CEO variant, now wants to re-edit.
 * choice (default) = shows PO previous + CEO pick + other namings.
 */
const isPostApply = computed(() => route.query.mode === 'post-apply')

const { data: namings, loading, error, fetchData, perPage } = useApiList<InternalNaming>('/api/namings/internal')

/** PO's original pick saved on mount — never changes during the session. */
const poOriginalId = ref<string | null>(null)

/**
 * Author's naming fetched directly by ID — same guard as in
 * AlternativeInternalNamingView: `available_for_brand` filter on the list
 * endpoint may omit the PO's own pick in edge cases, causing
 * "Ваш попередній вибір → Назву не обрано" even when a naming is selected.
 */
const poOriginalNamingObj = ref<InternalNaming | null>(null)

const poOriginalNaming = computed(() => {
  const id = poOriginalId.value
  if (!id) return null
  // Prefer directly-fetched object; fall back to grid lookup.
  if (poOriginalNamingObj.value?.id === id) return poOriginalNamingObj.value
  return namings.value.find(n => n.id === id) ?? null
})

const ceoInternalId = computed<string | null>(() => {
  const sel = store.brandCeoSelections?.internalNaming
  return typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
})

const ceoNaming = computed(() =>
  namings.value.find(n => n.id === ceoInternalId.value) ?? null,
)

/**
 * "Інші внутрішні назви" — all except PO original and CEO pick.
 * In post-apply — exclude only the applied (poOriginalId).
 */
const otherNamings = computed(() => {
  if (isPostApply.value) {
    return namings.value.filter(n => n.id !== poOriginalId.value)
  }
  return namings.value.filter(
    n => n.id !== poOriginalId.value && n.id !== ceoInternalId.value,
  )
})

const poInternalComment = computed({
  get: () => store.stepData.internalNaming.comment ?? '',
  set: (val: string) => store.setInternalNaming({ comment: val }),
})

/**
 * Ordering a new Internal Naming from the revision (brief-orders plan, phase
 * 4) — the same button and form as step 4: an order replaces the pick, picking
 * a name drops the order after a confirmation.
 */
const isCreatingNew = computed(() => store.stepData.internalNaming.newNamingFeedback !== null)
const showNewModal = ref(false)
const showDeleteConfirm = ref(false)
const showSwitchConfirm = ref(false)
const pendingNamingId = ref<string | null>(null)

const primaryDisabled = computed(
  () => !store.stepData.internalNaming.selectedId && !isCreatingNew.value
)
const isSaving = computed(() => store.isSaving)

/** Guards against initial-render flash (see CeoReselectExternalNamingView). */
const hasFetched = ref(false)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', per_page: '100' }
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

async function loadPoOriginalNaming() {
  const id = poOriginalId.value
  if (!id) {
    poOriginalNamingObj.value = null
    return
  }
  try {
    poOriginalNamingObj.value = await apiGet<InternalNaming>(`/api/namings/internal/${id}`)
  } catch {
    poOriginalNamingObj.value = null
  }
}

onMounted(async () => {
  // Snapshot PO's original pick before beginEditSection snapshot
  poOriginalId.value = store.stepData.internalNaming.selectedId ?? null
  store.beginEditSection('internalNaming', 8)
  // Keep PO's original pre-selected so "Зберегти" is active immediately
  // (no override — it's already the selectedId in store)
  await Promise.all([loadNamings(), loadPoOriginalNaming()])
})

/** Single-select: clicking the already-selected card does nothing (no toggle). */
function handleSelect(id: string) {
  if (store.stepData.internalNaming.selectedId === id) return
  if (isCreatingNew.value) {
    pendingNamingId.value = id
    showSwitchConfirm.value = true
    return
  }
  store.selectInternalNaming(id)
}

function confirmSwitchSelection() {
  const id = pendingNamingId.value
  if (id == null) return
  store.setInternalNamingFeedback(null)
  showSwitchConfirm.value = false
  pendingNamingId.value = null
  store.selectInternalNaming(id)
}

function cancelSwitchSelection() {
  showSwitchConfirm.value = false
  pendingNamingId.value = null
}

function handleFeedbackSave(feedback: string) {
  store.setInternalNamingFeedback(feedback)
  store.setInternalNaming({ selectedId: null })
  showNewModal.value = false
}

function confirmDeleteBrief() {
  store.setInternalNamingFeedback(null)
  showDeleteConfirm.value = false
}

/** «Редагувати» inside the read-only brief preview reopens the form here. */
watch(
  () => store.briefPreviewEditRequested,
  kind => {
    if (kind !== 'internalNaming') return
    showNewModal.value = true
    store.consumeBriefPreviewEditRequest()
  },
)

function goCancel() {
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goSave() {
  const saved = await store.saveBrand()
  if (saved) {
    // Mark internalNaming as explicitly resolved — covers the «third-option» case
    // where PO picks neither their original nor the Supervisor's suggestion.
    store.markConflictSectionResolved('internalNaming')
    store.commitEditSection()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const isReady = computed(() => hasFetched.value && !loading.value && !error.value)
const showSkeleton = computed(() => !hasFetched.value || loading.value)
</script>

<template>
  <EditFlowStepShell
    class="po-edit-internal-naming-view"
    title="Internal Naming"
    subtitle="Оберіть назву для внутрішньої комунікації команди."
  >
    <!-- Skeleton state: pixel-matched tree avoids CLS on data load.
         Skeleton sections key off raw ids (not resolved namings), because
         the resolved values only populate after the API call. -->
    <div v-if="showSkeleton" :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <div :class="EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS">
        <div v-if="isPostApply && poOriginalId" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
          <EditFlowSectionLabel>Обрана назва</EditFlowSectionLabel>
          <InternalNamingGridSkeleton :count="1" />
        </div>

        <template v-else>
          <div v-if="poOriginalId" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <InternalNamingGridSkeleton :count="1" />
          </div>
          <div v-else :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <p class="text-[1rem] leading-6 text-ink-700 italic">Назву не обрано</p>
          </div>

          <div v-if="ceoInternalId" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
            <InternalNamingGridSkeleton :count="1" />
          </div>
        </template>
      </div>

      <UiDivider :class="EDIT_FLOW_DIVIDER_CLASS" />

      <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
        <EditFlowSectionLabel>Інші внутрішні назви</EditFlowSectionLabel>
        <InternalNamingGridSkeleton :count="6" />
      </div>
    </div>

    <!-- Error state -->
    <UiAsyncState v-else-if="error" :message="error" @retry="loadNamings" />

    <!-- Ready state -->
    <div v-else-if="isReady" :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <div :class="EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS">
        <div v-if="isPostApply && poOriginalNaming" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
          <EditFlowSectionLabel>Обрана назва</EditFlowSectionLabel>
          <InternalNamingGrid
            :namings="[poOriginalNaming]"
            :selected-id="store.stepData.internalNaming.selectedId"
            @select="handleSelect"
          />
        </div>

        <template v-else>
          <div v-if="poOriginalNaming" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <InternalNamingGrid
              :namings="[poOriginalNaming]"
              :selected-id="store.stepData.internalNaming.selectedId"
              @select="handleSelect"
            />
          </div>
          <div v-else :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <p class="text-[1rem] leading-6 text-ink-700 italic">Назву не обрано</p>
          </div>

          <div v-if="ceoNaming" :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]">
            <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
            <InternalNamingGrid
              :namings="[ceoNaming]"
              :selected-id="store.stepData.internalNaming.selectedId"
              @select="handleSelect"
            />
          </div>
        </template>
      </div>

      <UiDivider :class="EDIT_FLOW_DIVIDER_CLASS" />

      <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
        <EditFlowSectionLabel>Інші внутрішні назви</EditFlowSectionLabel>
        <InternalNamingGrid
          :namings="otherNamings"
          :selected-id="store.stepData.internalNaming.selectedId"
          @select="handleSelect"
        />

        <BriefOrderButton
          create-label="Замовити нову назву"
          created-label="Бриф назви створено"
          :is-created="isCreatingNew"
          @create="showNewModal = true"
          @view="store.openBriefPreview('internalNaming', { allowEdit: true })"
          @edit="showNewModal = true"
          @delete="showDeleteConfirm = true"
        />
      </div>

      <StepCommentField
        v-model="poInternalComment"
        label="Коментар"
        :class="EDIT_FLOW_COMMENT_OFFSET_CLASS"
      />
    </div>

    <template #footer>
      <UiFooter
        cancel-label="Скасувати"
        primary-label="Зберегти"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goSave"
      >
        <template #note>
          <p v-if="store.saveError" class="text-sm text-red-600">
            {{ store.saveError }}
          </p>
        </template>
      </UiFooter>
    </template>

    <NewInternalNamingModal
      v-if="showNewModal"
      :initial-feedback="store.stepData.internalNaming.newNamingFeedback"
      @save="handleFeedbackSave"
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
      title="Обрати цю назву?"
      body="При виборі назви створений бриф буде видалено. Цю дію неможливо скасувати."
      cancel-label="Скасувати"
      primary-label="Обрати назву"
      @cancel="cancelSwitchSelection"
      @primary="confirmSwitchSelection"
    />
  </EditFlowStepShell>
</template>
