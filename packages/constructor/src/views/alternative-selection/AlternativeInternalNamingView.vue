<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue'
import InternalNamingGridSkeleton from '@/components/constructor/skeletons/InternalNamingGridSkeleton.vue'
import CustomerInternalNamingPreview from '@/components/constructor/ceo-reselect/CustomerInternalNamingPreview.vue'
import CustomerInternalNamingPreviewSkeleton from '@/components/constructor/skeletons/CustomerInternalNamingPreviewSkeleton.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowSectionLabel from '@/components/constructor/edit-flow/EditFlowSectionLabel.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import { EDIT_FLOW_DIVIDER_CLASS } from '@/constants/editFlowLayout'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const {
  data: namings,
  loading,
  error,
  fetchData,
  perPage,
} = useApiList<InternalNaming>('/api/namings/internal')

const stagedId = computed(() => store.ceoReselectDraft.internalNamingId)

const primaryDisabled = computed(() => !stagedId.value)

const poInternalId = computed(() => store.stepData.internalNaming.selectedId)

const poInternalName = computed<string | null>(() => {
  const id = poInternalId.value
  if (!id) return store.stepData.internalNaming.newNamingFeedback || null
  const naming = namings.value.find(n => n.id === id)
  return naming?.name ?? null
})

const availableNamings = computed(() =>
  namings.value.filter(n => n.id !== poInternalId.value)
)

/** Guards against initial-render flash (see CeoReselectExternalNamingView). */
const hasFetched = ref(false)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', per_page: '100' }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  await fetchData(params)
  hasFetched.value = true
}

onMounted(async () => {
  store.seedCeoReselectFromBrand('internalNaming')
  // Pre-fill comment from PO's comment if CEO hasn't written one yet.
  if (!store.brandCeoComments?.internalNaming) {
    store.setCeoCommentValue('internalNaming', store.stepData.internalNaming.comment ?? '')
  }
  await loadNamings()
})

function handleSelect(id: string) {
  store.setCeoReselectInternalNaming(id)
}

function goCancel() {
  store.resetCeoReselectDraft()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goSave() {
  const id = stagedId.value
  if (!id) return
  const ok = await store.saveCeoSelections({ internalNaming: id })
  if (ok) {
    store.resetCeoReselectDraft()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const internalComment = computed({
  get: () => store.brandCeoComments?.internalNaming?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('internalNaming', value),
})

const isReady = computed(() => hasFetched.value && !loading.value && !error.value)
const showSkeleton = computed(() => !hasFetched.value || loading.value)
</script>

<template>
  <EditFlowStepShell
    class="ceo-reselect-internal-naming-step"
    title="Internal Naming"
    subtitle="Оберіть назву для внутрішньої комунікації команди."
  >
    <!-- Skeleton state: pixel-matched tree avoids CLS on data load.
         NB: CustomerInternalNamingPreview can't render real name until
         `namings` resolves (it looks up by id), so we replace it too. -->
    <template v-if="showSkeleton">
      <CustomerInternalNamingPreviewSkeleton />

      <div :class="EDIT_FLOW_DIVIDER_CLASS" role="separator" aria-hidden="true" />

      <div class="flex flex-col gap-3">
        <EditFlowSectionLabel>Доступні внутрішні назви</EditFlowSectionLabel>
        <InternalNamingGridSkeleton :count="6" />
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-red-500 mb-3">{{ error }}</p>
      <button type="button" class="text-primary underline text-sm" @click="loadNamings">
        Спробувати знову
      </button>
    </div>

    <!-- Ready state -->
    <template v-else-if="isReady">
      <CustomerInternalNamingPreview :name="poInternalName" />

      <div :class="EDIT_FLOW_DIVIDER_CLASS" role="separator" aria-hidden="true" />

      <div class="flex flex-col gap-3">
        <EditFlowSectionLabel>Доступні внутрішні назви</EditFlowSectionLabel>
        <InternalNamingGrid
          :namings="availableNamings"
          :selected-id="stagedId"
          @select="handleSelect"
        />
      </div>
    </template>

    <StepCommentField v-model="internalComment" label="Коментар" />

    <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
      {{ store.saveCeoSelectionsError }}
    </p>

    <template #footer>
      <EditFlowFooter
        cancel-label="Скасувати"
        primary-label="Зберегти"
        :primary-disabled="primaryDisabled"
        @cancel="goCancel"
        @primary="goSave"
      />
    </template>
  </EditFlowStepShell>
</template>
