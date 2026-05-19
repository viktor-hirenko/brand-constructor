<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore, CEO_RESELECT_EXTERNAL_NAMING_LIMIT } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { ExternalNaming } from '@brand-constructor/shared/types'
import ExternalNamingGrid from '@/components/constructor/ceo-reselect/ExternalNamingGrid.vue'
import CustomerNamingsRow from '@/components/constructor/ceo-reselect/CustomerNamingsRow.vue'
import PoEditFooter from '@/components/constructor/po-edit/PoEditFooter.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

/**
 * chained = coming from concept edit (concept was just changed)
 * standalone = editing external naming directly (concept unchanged)
 */
const isChained = computed(() => route.name === 'po-edit-concept-external-naming')

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

const isSaving = computed(() => store.isSaving)
const primaryDisabled = computed(() => store.stepData.externalNaming.selectedIds.length === 0)

/** Concept ID to filter namings by */
const conceptIdForNamings = computed(() => store.stepData.concept.selectedId)

/** In standalone mode, don't show PO's current picks in the alternatives grid */
const excludeFromGrid = computed(() =>
  isChained.value ? [] : store.stepData.externalNaming.selectedIds
)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active' }
  if (conceptIdForNamings.value) params.concept_id = conceptIdForNamings.value
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
}

onMounted(async () => {
  if (isChained.value) {
    // Came from concept edit — start with empty selection
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
  } else {
    // Standalone — start snapshot so Cancel can restore
    store.beginEditSection('externalNaming', 8)
  }
  await loadNamings()
})

function handleToggle(id: string) {
  store.toggleExternalNaming(id)
}

function goCancel() {
  if (isChained.value) {
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept`)
  } else {
    store.cancelEditSection()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}

async function goSave() {
  if (isChained.value) {
    // Chained: concept snapshot is still pending — save brand with both new concept + new external naming
    const saved = await store.saveBrand()
    if (saved) {
      store.commitEditSection()
      router.push(`/constructor/brand/${brandId.value}`)
    }
  } else {
    const saved = await store.saveBrand()
    if (saved) {
      store.commitEditSection()
      router.push(`/constructor/brand/${brandId.value}`)
    }
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 pr-2 pb-4">
      <div>
        <h1 class="text-2xl font-medium text-[#0a0a0a] tracking-[0.0703px] mb-2 leading-8">
          External Naming
        </h1>
        <p class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]">
          Оберіть до {{ CEO_RESELECT_EXTERNAL_NAMING_LIMIT }}-х назв, що пройдуть перевірку юристами.
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
        <!-- Standalone: show PO's previous picks -->
        <CustomerNamingsRow v-if="!isChained && poExternalMini.length > 0" :namings="poExternalMini" />

        <!-- CEO pick (if compatible with current concept) -->
        <div v-if="ceoExternalIds.length > 0" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Вибір CEO</p>
          <div class="grid grid-cols-3 gap-2 max-w-[506px]">
          <div
            v-for="naming in namings.filter(n => ceoExternalIds.includes(n.id))"
            :key="naming.id"
            class="rounded-[16px] border flex flex-col items-center gap-2 px-4 py-6 text-center tracking-[-0.1504px] cursor-pointer transition-all"
            :class="store.stepData.externalNaming.selectedIds.includes(naming.id)
              ? 'border-[#030213] border-2 bg-[#f1f1f3]'
              : 'border-black/10 bg-[#f1f1f3] hover:border-[#030213]/50'"
            @click="handleToggle(naming.id)"
          >
            <p class="text-[18px] font-medium text-[#1a1a1a] break-words w-full">{{ naming.name }}</p>
            <p v-if="naming.domain" class="text-[12px] text-[#4b4b58]">
              ({{ naming.domain }})
            </p>
          </div>
          </div>
        </div>

        <hr class="border-t border-black/10 max-w-[506px]" />

        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Варіанти назв для обраного концепту
          </p>
          <ExternalNamingGrid
            :namings="namings"
            :selected-ids="store.stepData.externalNaming.selectedIds"
            :exclude-ids="excludeFromGrid"
            :max-selectable="CEO_RESELECT_EXTERNAL_NAMING_LIMIT"
            @toggle="handleToggle"
          />
        </div>
      </template>
    </div>

    <PoEditFooter
      :cancel-label="isChained ? 'Назад' : 'Скасувати'"
      primary-label="Зберегти"
      :primary-disabled="primaryDisabled"
      :loading="isSaving"
      @cancel="goCancel"
      @primary="goSave"
    />
  </div>
</template>
