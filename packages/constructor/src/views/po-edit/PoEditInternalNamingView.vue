<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { InternalNaming } from '@brand-constructor/shared/types'
import InternalNamingGrid from '@/components/constructor/ceo-reselect/InternalNamingGrid.vue'
import PoEditFooter from '@/components/constructor/po-edit/PoEditFooter.vue'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

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

const poOriginalNaming = computed(() =>
  namings.value.find(n => n.id === poOriginalId.value) ?? null,
)

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

const comment = computed({
  get: () => store.stepData.internalNaming.comment ?? '',
  set: (val: string) => store.setInternalNaming({ comment: val }),
})

const primaryDisabled = computed(() => !store.stepData.internalNaming.selectedId)
const isSaving = computed(() => store.isSaving)

async function loadNamings() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', per_page: '100' }
  if (store.brandId) params.available_for_brand = store.brandId
  await fetchData(params)
}

onMounted(async () => {
  // Snapshot PO's original pick before beginEditSection snapshot
  poOriginalId.value = store.stepData.internalNaming.selectedId ?? null
  store.beginEditSection('internalNaming', 8)
  // Keep PO's original pre-selected so "Зберегти" is active immediately
  // (no override — it's already the selectedId in store)
  await loadNamings()
})

/** Single-select: clicking the already-selected card does nothing (no toggle). */
function handleSelect(id: string) {
  if (store.stepData.internalNaming.selectedId === id) return
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
        <!-- post-apply: applied name as interactive grid -->
        <div v-if="isPostApply && poOriginalNaming" class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Обрана назва</p>
          <InternalNamingGrid
            :namings="[poOriginalNaming]"
            :selected-id="store.stepData.internalNaming.selectedId"
            @select="handleSelect"
          />
        </div>

        <!-- choice mode: PO previous (interactive) + CEO pick (interactive) -->
        <template v-else>
          <!-- PO previous pick -->
          <div v-if="poOriginalNaming" class="flex flex-col gap-3">
            <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Ваш попередній вибір</p>
            <InternalNamingGrid
              :namings="[poOriginalNaming]"
              :selected-id="store.stepData.internalNaming.selectedId"
              @select="handleSelect"
            />
          </div>
          <div v-else class="flex flex-col gap-2">
            <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Ваш попередній вибір</p>
            <p class="text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] italic">Назву не обрано</p>
          </div>

          <!-- CEO pick -->
          <div v-if="ceoNaming" class="flex flex-col gap-3">
            <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">Вибір CEO</p>
            <InternalNamingGrid
              :namings="[ceoNaming]"
              :selected-id="store.stepData.internalNaming.selectedId"
              @select="handleSelect"
            />
          </div>
        </template>

        <hr class="border-t border-black/10 max-w-[506px]" />

        <!-- Other internal namings (excludes PO original + CEO) -->
        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Інші внутрішні назви
          </p>
          <InternalNamingGrid
            :namings="otherNamings"
            :selected-id="store.stepData.internalNaming.selectedId"
            @select="handleSelect"
          />
        </div>

        <StepCommentField v-model="comment" label="Коментар замовника" />
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
