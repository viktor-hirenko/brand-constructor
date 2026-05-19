<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue'
import CustomerInternalNamingPreview from '@/components/constructor/ceo-reselect/CustomerInternalNamingPreview.vue'
import PoEditFooter from '@/components/constructor/po-edit/PoEditFooter.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const { data: namings, loading, error, fetchData, perPage } = useApiList<InternalNaming>('/api/namings/internal')

const poInternalId = computed(() => store.stepData.internalNaming.selectedId)
const poInternalName = computed<string | null>(() => {
  const id = poInternalId.value
  if (!id) return store.stepData.internalNaming.newNamingFeedback ?? null
  return namings.value.find(n => n.id === id)?.name ?? null
})

const ceoInternalId = computed<string | null>(() => {
  const sel = store.brandCeoSelections?.internalNaming
  return typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
})

const ceoInternalName = computed<string | null>(() => {
  const id = ceoInternalId.value
  if (!id) return null
  return namings.value.find(n => n.id === id)?.name ?? null
})

const availableNamings = computed(() =>
  namings.value.filter(n => n.id !== poInternalId.value)
)

const primaryDisabled = computed(() => !store.stepData.internalNaming.selectedId)
const isSaving = computed(() => store.isSaving)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', per_page: '100' }
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
}

onMounted(async () => {
  store.beginEditSection('internalNaming', 8)
  // Pre-select CEO pick so it's ready for one-click save
  if (ceoInternalId.value) {
    store.selectInternalNaming(ceoInternalId.value)
  }
  await loadNamings()
})

function handleSelect(id: string) {
  store.selectInternalNaming(id)
}

function goCancel() {
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goSave() {
  const saved = await store.saveBrand()
  if (saved) {
    store.commitEditSection()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}
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

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
      <div v-else-if="error" class="text-center py-8 text-red-500">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadNamings">Спробувати знову</button>
      </div>

      <template v-else>
        <!-- PO previous pick -->
        <CustomerInternalNamingPreview :name="poInternalName" />

        <!-- CEO pick -->
        <div v-if="ceoInternalName" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Вибір CEO</p>
          <div
            v-for="n in namings.filter(n => n.id === ceoInternalId)"
            :key="n.id"
            class="rounded-[16px] border flex flex-col items-center gap-2 px-6 py-8 text-center tracking-[-0.1504px] max-w-[162px] cursor-pointer transition-all"
            :class="store.stepData.internalNaming.selectedId === n.id
              ? 'border-[#030213] border-2 bg-[#f1f1f3]'
              : 'border-black/10 bg-[#f1f1f3]'"
            @click="handleSelect(n.id)"
          >
            <p class="text-[18px] font-medium text-[#1a1a1a]">{{ n.name }}</p>
          </div>
        </div>

        <hr class="border-t border-black/10 max-w-[506px]" />

        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Доступні внутрішні назви
          </p>
          <InternalNamingGrid
            :namings="availableNamings"
            :selected-id="store.stepData.internalNaming.selectedId"
            @select="handleSelect"
          />
        </div>
      </template>
    </div>

    <PoEditFooter
      cancel-label="Скасувати"
      primary-label="Зберегти"
      :primary-disabled="primaryDisabled"
      :loading="isSaving"
      @cancel="goCancel"
      @primary="goSave"
    />
  </div>
</template>
