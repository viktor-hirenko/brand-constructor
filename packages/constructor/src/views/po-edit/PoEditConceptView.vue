<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { useApiList, apiGet } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue'
import CustomerPickPreview from '@/components/constructor/ceo-reselect/CustomerPickPreview.vue'
import PoEditFooter from '@/components/constructor/po-edit/PoEditFooter.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const store = useConstructorStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const {
  data: concepts,
  loading,
  error,
  fetchData,
  perPage,
} = useApiList<Concept>('/api/concepts')

const localMode = ref<'light' | 'dark'>(store.stepData.mode === 'dark' ? 'dark' : 'light')

const poConceptId = computed(() => store.stepData.concept.selectedId)
const ceoConcept = computed(() => {
  const id = store.brandCeoSelections?.concept
  const ceoId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null
  if (!ceoId) return null
  return concepts.value.find(c => c.id === ceoId) ?? null
})

const poConcept = ref<Concept | null>(null)
async function loadPoConcept() {
  const id = poConceptId.value
  if (!id) { poConcept.value = null; return }
  try {
    poConcept.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch { poConcept.value = null }
}

/** The concept currently chosen by PO in this edit session (starts at CEO pick). */
const selectedId = ref<string | null>(
  (() => {
    const sel = store.brandCeoSelections?.concept
    return typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
  })()
)

const availableConcepts = computed(() =>
  concepts.value.filter(c => c.id !== poConceptId.value)
)

const primaryDisabled = computed(() => !selectedId.value)

const isSaving = ref(false)

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
]

function loadConcepts() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', mode: localMode.value }
  if (store.brandId) params.available_for_brand = store.brandId
  fetchData(params)
}

onMounted(() => {
  store.beginEditSection('concept', 8)
  loadPoConcept()
  loadConcepts()
})

watch(localMode, loadConcepts)

function goCancel() {
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (!selectedId.value) return
  store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
  const conceptChanged = selectedId.value !== poConceptId.value

  if (conceptChanged) {
    // Concept changed → chained flow: must pick new external naming
    // Clear PO external selections (they belonged to the old concept)
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept/external-naming`)
  } else {
    // Same concept → just save + return
    isSaving.value = true
    await store.saveBrand()
    isSaving.value = false
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
          Concept Selection
        </h1>
        <p class="text-[16px] leading-6 text-[#717182] tracking-[-0.3125px]">
          Ви можете залишити варіант CEO або обрати інший.
        </p>
      </div>

      <!-- PO previous + CEO pick side by side -->
      <div class="grid grid-cols-2 gap-4 max-w-[506px]">
        <!-- PO previous -->
        <div class="flex flex-col gap-2">
          <p class="text-[14px] font-medium leading-4 text-[#717182]">Ваш попередній вибір</p>
          <CustomerPickPreview :concept="poConcept" />
        </div>

        <!-- CEO pick (pre-selected) -->
        <div class="flex flex-col gap-2">
          <p class="text-[14px] font-medium leading-4 text-[#717182]">Вибір CEO</p>
          <div
            v-if="ceoConcept"
            class="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer border-2"
            :class="selectedId === ceoConcept.id ? 'border-[#030213]' : 'border-black/10'"
            @click="selectedId = ceoConcept!.id"
          >
            <img
              v-if="ceoConcept.visual_url"
              :src="ceoConcept.visual_url"
              :alt="ceoConcept.name"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div class="absolute inset-x-0 bottom-0 px-3 pt-8 pb-3 bg-gradient-to-t from-black/70 to-transparent">
              <p class="text-[16px] font-medium text-white truncate">{{ ceoConcept.name }}</p>
            </div>
            <div
              v-if="selectedId === ceoConcept.id"
              class="absolute top-1.5 left-1.5 size-7 rounded-full bg-white flex items-center justify-center"
            >
              <svg class="size-4 text-[#030213]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <p v-else class="text-[14px] text-[#717182] italic">Не вказано</p>
        </div>
      </div>

      <hr class="border-t border-black/10 max-w-[506px]" />

      <!-- Other concepts -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between max-w-[506px]">
          <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
            Інші концепти
          </p>
          <SegmentedControl
            v-model="localMode"
            :options="themeOptions"
          />
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <div v-else-if="error" class="text-center py-8 text-red-500">
          <p class="mb-2">{{ error }}</p>
          <button type="button" class="text-primary underline text-sm" @click="loadConcepts">Спробувати знову</button>
        </div>
        <ConceptGrid
          v-else
          :concepts="availableConcepts"
          :selected-id="selectedId"
          :preview-id="selectedId"
          @select="id => (selectedId = id)"
        />
      </div>
    </div>

    <PoEditFooter
      cancel-label="Скасувати"
      primary-label="Далі"
      :primary-disabled="primaryDisabled"
      :loading="isSaving"
      @cancel="goCancel"
      @primary="goDali"
    />
  </div>
</template>
