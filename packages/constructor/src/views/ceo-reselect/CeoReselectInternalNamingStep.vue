<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue'
import CustomerInternalNamingPreview from '@/components/constructor/ceo-reselect/CustomerInternalNamingPreview.vue'
import CeoReselectFooter from '@/components/constructor/ceo-reselect/CeoReselectFooter.vue'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

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

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', per_page: '100' }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  await fetchData(params)
}

onMounted(async () => {
  store.seedCeoReselectFromBrand('internalNaming')
  await loadNamings()
})

function handleSelect(id: string) {
  store.setCeoReselectInternalNaming(id)
}

function goCancel() {
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goSave() {
  const id = stagedId.value
  if (!id) return
  const ok = await store.saveCeoSelections({ internalNaming: id })
  if (ok) {
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

const internalComment = computed({
  get: () => store.brandCeoComments?.internalNaming?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('internalNaming', value),
})
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1 class="text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8">
          Internal Naming
        </h1>
        <p class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]">
          Оберіть назву для внутрішньої комунікації команди.
        </p>
      </div>

      <CustomerInternalNamingPreview :name="poInternalName" />

      <div
        class="h-px w-full max-w-[506px] shrink-0 bg-[rgba(0,0,0,0.1)]"
        aria-hidden="true"
      />

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
      <div v-else-if="error" class="text-center py-12 text-red-500">
        <p class="mb-3">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadNamings">
          Спробувати знову
        </button>
      </div>
      <template v-else>
        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Доступні внутрішні назви
          </p>
          <InternalNamingGrid
            :namings="availableNamings"
            :selected-id="stagedId"
            @select="handleSelect"
          />
        </div>
      </template>

      <StepCommentField
        v-model="internalComment"
        label="Коментар СЕО"
        placeholder="Додайте коментар СЕО..."
      />

      <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
        {{ store.saveCeoSelectionsError }}
      </p>
    </div>

    <CeoReselectFooter
      cancel-label="Скасувати"
      primary-label="Зберегти"
      :primary-disabled="primaryDisabled"
      @cancel="goCancel"
      @primary="goSave"
    />
  </div>
</template>
