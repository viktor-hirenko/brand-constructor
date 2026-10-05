<script setup lang="ts">
import ConceptCascadeBanner from '@/components/constructor/edit-flow/ConceptCascadeBanner.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useConstructorStore,
  SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT,
} from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/alternative-selection/ExternalNamingGrid.vue'
import ExternalNamingGridSkeleton from '@/components/constructor/skeletons/ExternalNamingGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import UiFooter from '@/components/ui/UiFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import {
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_COMMENT_OFFSET_CLASS,
  EDIT_FLOW_DIVIDER_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
  EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS,
  EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
  EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS,
} from '@/constants/editFlowLayout'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

/**
 * chained    = coming from concept edit (concept was just changed)
 * standalone = editing external naming directly (concept unchanged)
 * post-apply = PO applied CEO variant, now wants to re-edit
 */
const isChained = computed(() => route.name === 'po-edit-concept-external-naming')
const isPostApply = computed(() => route.query.mode === 'post-apply')

const { data: namings, loading, error, fetchData, perPage } = useApiList<ExternalNaming>('/api/namings/external')

interface ExternalNamingMini { id: string; name: string; domain?: string; price?: number | null }

const poExternalMini = computed<ExternalNamingMini[]>(() =>
  (store.stepData.externalNaming.selectedIds ?? [])
    .map(id => namings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null)
    .map(n => ({ id: n.id, name: n.name, domain: n.domain ?? undefined, price: n.price ?? null }))
)

const ceoExternalIds = computed<string[]>(() => {
  const val = store.brandCeoSelections?.externalNaming
  return Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : []
})

/** CEO picks resolved from the same API list — rendered with ExternalNamingGrid (same cards as below). */
const ceoNamings = computed(() =>
  namings.value.filter(n => ceoExternalIds.value.includes(n.id)),
)

const isSaving = computed(() => store.isSaving)

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds ?? [])

const isCommentRequired = computed(() =>
  isExternalNamingCommentRequired(selectedIds.value, namings.value),
)

const commentHint = computed(() =>
  getExternalNamingCommentHint(selectedIds.value, namings.value),
)

const primaryDisabled = computed(
  () =>
    !isExternalNamingStepValid(
      selectedIds.value,
      store.stepData.externalNaming.comment ?? '',
      false,
      namings.value,
    ),
)

const poExternalComment = computed({
  get: () => store.stepData.externalNaming.comment ?? '',
  set: (val: string) => store.setExternalNaming({ comment: val }),
})

const conceptIdForNamings = computed(() => store.stepData.concept.selectedId)

/**
 * PO's original picks saved on mount (standalone mode).
 * Used to render "Ваш попередній вибір" block and to exclude those IDs from the bottom grid.
 */
const poOriginalPickIds = ref<string[]>([])

const poOriginalNamings = computed(() =>
  namings.value.filter(n => poOriginalPickIds.value.includes(n.id)),
)

/**
 * Exclude from the bottom "Інші назви" grid:
 * - chained: CEO picks (shown in "Вибір CEO" block above)
 * - standalone: PO original picks + CEO picks (both shown in dedicated blocks above)
 */
const excludeFromGrid = computed(() => {
  if (isChained.value) return ceoExternalIds.value
  return [...new Set([...poOriginalPickIds.value, ...ceoExternalIds.value])]
})

/** Guards against initial-render flash (see CeoReselectExternalNamingView). */
const hasFetched = ref(false)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active' }
  if (conceptIdForNamings.value) params.concept_id = conceptIdForNamings.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
  hasFetched.value = true
}

onMounted(async () => {
  if (isChained.value) {
    // Restore in-progress selections if user went Back from here and returned again.
    // If there are none (first visit), start with empty selection.
    const pendingExternal = store.authorRevisionDraft.pendingExternalIds
    if (pendingExternal && pendingExternal.length > 0) {
      store.setExternalNaming({ selectedIds: pendingExternal, newNamingBrief: null })
    } else {
      store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    }
  } else {
    // standalone + post-apply: save the Author's current picks as a reference
    poOriginalPickIds.value = [...(store.stepData.externalNaming.selectedIds ?? [])]
    store.beginEditSection('externalNaming', 8)
  }
  await loadNamings()
})

function handleToggle(id: string) {
  store.toggleExternalNaming(id)
}

function goCancel() {
  if (isChained.value) {
    // «Назад» — the picks so far are kept for a return, the brief gets its own
    // concept and names back. NB: the draft is NOT reset — the baseline +
    // pending concept must persist across the hop to keep «Назад» idempotent.
    store.stepBackToRevisionConcept()
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept`)
  } else {
    store.cancelEditSection()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

async function goSave() {
  const saved = await store.saveBrand()
  if (saved) {
    // Chained flow (concept → external) completes here — mark both sections as
    // resolved so the final review shows «Обраний концепт / Обрані назви» even
    // if PO picked neither their original nor the Supervisor's suggestion.
    store.markConflictSectionResolved('concept')
    store.markConflictSectionResolved('externalNaming')
    store.commitEditSection()
    store.resetAuthorRevisionDraft()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const subtitleText = `Оберіть до ${SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT}-х назв, що пройдуть перевірку юристами на можливі ризики.`

const isReady = computed(() => hasFetched.value && !loading.value && !error.value)
const showSkeleton = computed(() => !hasFetched.value || loading.value)
</script>

<template>
  <EditFlowStepShell
    class="po-edit-external-naming-view"
    title="External Naming"
    :subtitle="subtitleText"
  >
    <!--
      One body wrapper for every state, so the comment field keeps the kit's
      24 below the block in all of them (32 before the refactor mockups). It used to sit outside the branches,
      where the shell's own gap-6 added to its mt-6 and made the gap 48 on this
      screen while the sibling screens showed 24 and 32 in the same slot
      (DP-15258 phase 18; the kit gives 32 on `4492:29267` → `4492:29273`).
    -->
    <div :class="EDIT_FLOW_BODY_OFFSET_CLASS">
      <!-- After a concept change the old names no longer fit: the same warning
           the draft cascade shows, 24 above the lists — `5395:107506`. -->
      <ConceptCascadeBanner
        v-if="isChained && !isPostApply"
        :class="EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS"
      />

      <!-- Skeleton state: pixel-matched tree avoids CLS on data load.
           Skeleton sections key off raw *Ids (not *Namings), because the
           resolved namings only populate after the API call. -->
      <template v-if="showSkeleton">
        <div :class="EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS">
          <div
            v-if="isPostApply && poOriginalPickIds.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Обрані назви</EditFlowSectionLabel>
            <ExternalNamingGridSkeleton :count="Math.min(poOriginalPickIds.length, 3)" />
          </div>

          <div
            v-else-if="!isChained && !isPostApply && poOriginalPickIds.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <ExternalNamingGridSkeleton :count="Math.min(poOriginalPickIds.length, 3)" />
          </div>

          <div
            v-if="!isPostApply && ceoExternalIds.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
            <ExternalNamingGridSkeleton :count="Math.min(ceoExternalIds.length, 3)" />
          </div>
        </div>

        <UiDivider :class="EDIT_FLOW_DIVIDER_CLASS" />

        <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
          <EditFlowSectionLabel>Інші назви для обраного концепту</EditFlowSectionLabel>
          <ExternalNamingGridSkeleton :count="6" />
        </div>
      </template>

      <!-- Error state -->
      <UiAsyncState v-else-if="error" :message="error" @retry="loadNamings" />

      <!-- Ready state -->
      <template v-else-if="isReady">
        <div :class="EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS">
          <div
            v-if="isPostApply && poOriginalNamings.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Обрані назви</EditFlowSectionLabel>
            <ExternalNamingGrid
              :namings="poOriginalNamings"
              :selected-ids="store.stepData.externalNaming.selectedIds"
              :max-selectable="SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT"
              @toggle="handleToggle"
            />
          </div>

          <div
            v-else-if="!isChained && !isPostApply && poOriginalNamings.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Ваш попередній вибір</EditFlowSectionLabel>
            <ExternalNamingGrid
              :namings="poOriginalNamings"
              :selected-ids="store.stepData.externalNaming.selectedIds"
              :max-selectable="SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT"
              @toggle="handleToggle"
            />
          </div>

          <div
            v-if="!isPostApply && ceoNamings.length > 0"
            :class="['flex flex-col', EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS]"
          >
            <EditFlowSectionLabel>Вибір CEO</EditFlowSectionLabel>
            <ExternalNamingGrid
              :namings="ceoNamings"
              :selected-ids="store.stepData.externalNaming.selectedIds"
              :max-selectable="SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT"
              @toggle="handleToggle"
            />
          </div>
        </div>

        <UiDivider :class="EDIT_FLOW_DIVIDER_CLASS" />

        <div :class="EDIT_FLOW_POST_DIVIDER_SECTION_CLASS">
          <EditFlowSectionLabel>Інші назви для обраного концепту</EditFlowSectionLabel>
          <ExternalNamingGrid
            :namings="namings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :exclude-ids="excludeFromGrid"
            :max-selectable="SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>
      </template>

      <StepCommentField
        v-model="poExternalComment"
        label="Коментар"
        :class="EDIT_FLOW_COMMENT_OFFSET_CLASS"
        :required="isCommentRequired"
        :required-hint="commentHint"
      />
    </div>

    <template #footer>
      <UiFooter
        :cancel-label="isChained ? 'Назад' : 'Скасувати'"
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
  </EditFlowStepShell>
</template>
