<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet, getAssetUrl } from '@/composables/useApi'
import { usePoEditSnapshot } from '@/composables/usePoEditSnapshot'
import type { Concept } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue'
import CustomerPickPreview from '@/components/constructor/ceo-reselect/CustomerPickPreview.vue'
import CeoCommentReadonly from '@/components/constructor/edit-flow/CeoCommentReadonly.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const store = useConstructorStore()
const route = useRoute()
const router = useRouter()

const brandId = computed(() => route.params.id as string)

const snapshot = usePoEditSnapshot(brandId)

/**
 * post-apply = PO already applied CEO variant and now wants to re-edit.
 *   Shows single "Обраний концепт" applied card + full alternatives grid.
 * choice (default) = shows "PO previous" + "CEO pick" side-by-side.
 */
const isPostApply = computed(() => route.query.mode === 'post-apply')

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
async function loadPoConceptById(id: string | null) {
  if (!id) { poConcept.value = null; return }
  try {
    poConcept.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch { poConcept.value = null }
}

/**
 * In post-apply: start from currently applied (= poConceptId = already CEO's concept).
 * In choice: start from CEO pick so it's pre-selected for one-click confirm.
 */
const selectedId = ref<string | null>(
  (() => {
    if (isPostApply.value) {
      return store.stepData.concept.selectedId ?? null
    }
    const sel = store.brandCeoSelections?.concept
    return typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
  })()
)

/**
 * The PO's original concept BEFORE the current edit session started.
 * Persisted in sessionStorage (via `usePoEditSnapshot`) keyed by brandId so
 * «Назад» from external-naming can restore the correct value even after the
 * store was mutated by goDali().
 */
const originalPoConceptId = ref<string | null>(null)

/**
 * choice mode:    exclude PO original (shown in dual header) AND CEO pick (shown in dual header).
 *                 Grid shows only "other" alternatives — neither of the two shown at top.
 * post-apply mode: exclude only the applied concept (= poConceptId, shown as single applied card).
 *                 Grid includes PO's old original as a regular option.
 */
const availableConcepts = computed(() => {
  if (isPostApply.value) {
    // post-apply: only exclude the applied (current) concept
    return concepts.value.filter(c => c.id !== poConceptId.value)
  }
  // choice: exclude both PO original and CEO pick
  const ceoId = ceoConcept.value?.id ?? null
  return concepts.value.filter(c => c.id !== poConceptId.value && c.id !== ceoId)
})

const primaryDisabled = computed(() => !selectedId.value)

const isSaving = ref(false)

const ceoCeoComment = computed(() => store.brandCeoComments?.concept?.value ?? '')

const themeOptions = [
  { value: 'light', label: 'Світла тема' },
  { value: 'dark', label: 'Темна тема' },
]

const subtitleText = computed(() =>
  isPostApply.value
    ? "Оберіть концепт та перегляньте прев'ю праворуч."
    : 'Ви можете залишити варіант CEO або обрати інший.',
)

function loadConcepts() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', mode: localMode.value }
  if (store.brandId) params.available_for_brand = store.brandId
  fetchData(params)
}

onMounted(() => {
  // Restore or initialize originalPoConceptId from sessionStorage.
  // On first open: store.stepData.concept.selectedId is PO's real original concept.
  // On «Назад» return: sessionStorage still has the real original saved from first open.
  const persisted = snapshot.loadOriginalConcept()
  if (persisted) {
    originalPoConceptId.value = persisted
  } else {
    // First time opening this edit session — snapshot the real PO concept.
    originalPoConceptId.value = store.stepData.concept.selectedId ?? null
    snapshot.saveOriginalConcept(originalPoConceptId.value)
  }

  // Begin edit section only on first open (no editingSection yet).
  if (!store.editingSection) {
    store.beginEditSection('concept', 8)
  } else {
    // Returning from external-naming: cancelEditSection was called there,
    // which restored store.stepData.concept — now re-open the section to keep
    // cancel working from concept screen too.
    store.beginEditSection('concept', 8)
  }

  // Pre-select CEO pick (choice mode) — always show CEO as highlighted.
  if (!isPostApply.value) {
    const sel = store.brandCeoSelections?.concept
    const ceoId = typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
    if (ceoId) selectedId.value = ceoId
  }

  // Seed previewId so the right-panel slider shows immediately on open.
  if (selectedId.value) store.setConcept({ previewId: selectedId.value })

  // Always load PO concept by originalPoConceptId (not the possibly mutated store value).
  loadPoConceptById(originalPoConceptId.value)
  loadConcepts()
})

watch(localMode, loadConcepts)

/** Update both the local selectedId and the store previewId so the right-panel slider reacts. */
function selectConcept(id: string) {
  selectedId.value = id
  store.setConcept({ previewId: id })
}

function goCancel() {
  // Restore externalNaming to what it was before the edit session started.
  snapshot.restoreOriginalExternal(ids => {
    store.setExternalNaming({ selectedIds: ids, newNamingBrief: null })
  })
  snapshot.clearAll()
  store.cancelEditSection()
  router.push(`/constructor/brand/${brandId.value}`)
}

async function goDali() {
  if (!selectedId.value) return
  const conceptChanged = selectedId.value !== originalPoConceptId.value

  if (conceptChanged) {
    // Save original externalNaming BEFORE clearing it, so «Скасувати» can restore it.
    snapshot.saveOriginalExternal(store.stepData.externalNaming.selectedIds ?? [])
    snapshot.savePendingConcept(selectedId.value)
    store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
    router.push(`/constructor/brand/${brandId.value}/po-edit/concept/external-naming`)
  } else {
    // Same concept as PO's original → save + return
    store.setConcept({ selectedId: selectedId.value, newConceptBrief: null })
    isSaving.value = true
    await store.saveBrand()
    isSaving.value = false
    store.commitEditSection()
    snapshot.clearAll()
    router.push(`/constructor/brand/${brandId.value}`)
  }
}
</script>

<template>
  <EditFlowStepShell class="po-edit-concept-view" title="Concept Selection" :subtitle="subtitleText">
    <!-- post-apply: single applied concept card -->
    <div v-if="isPostApply" class="flex flex-col gap-3">
      <p class="text-[16px] font-medium leading-6 text-[#414141] tracking-[-0.3125px]">
        Обраний концепт
      </p>
      <div v-if="poConcept" class="relative w-[248px] h-[248px] rounded-2xl overflow-hidden border-2 border-[#030213]">
        <img
          v-if="poConcept.visual_url"
          :src="getAssetUrl(poConcept.visual_url)"
          :alt="poConcept.name"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div class="absolute inset-x-0 bottom-0 px-4 pt-8 pb-4 bg-gradient-to-t from-black/70 to-transparent">
          <p class="text-[16px] font-medium text-white truncate">{{ poConcept.name }}</p>
        </div>
        <!-- Checkmark badge -->
        <div class="absolute top-[7px] left-[7px] size-8 rounded-full bg-white border border-black/10 shadow-[0px_8px_5px_rgba(0,0,0,0.2)] flex items-center justify-center">
          <svg class="size-4 text-[#030213]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <div v-else class="w-[248px] h-[248px] rounded-2xl border border-black/10 bg-[#f3f3f5] flex items-center justify-center">
        <span class="text-sm text-[#717182]">—</span>
      </div>
    </div>

    <!-- choice: PO previous + CEO pick side by side, same size -->
    <div v-else class="grid grid-cols-2 gap-4 max-w-[506px]">
      <!-- PO previous -->
      <div class="flex flex-col gap-2">
        <p class="text-[14px] font-medium leading-4 text-[#717182]">Ваш попередній вибір</p>
        <div
          v-if="poConcept"
          class="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer border-2"
          :class="selectedId === poConcept.id ? 'border-[#030213]' : 'border-black/10'"
          @click="selectConcept(poConcept.id)"
        >
          <img
            v-if="poConcept.visual_url"
            :src="getAssetUrl(poConcept.visual_url)"
            :alt="poConcept.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-x-0 bottom-0 px-3 pt-8 pb-3 bg-gradient-to-t from-black/70 to-transparent">
            <p class="text-[16px] font-medium text-white truncate">{{ poConcept.name }}</p>
          </div>
          <div
            v-if="selectedId === poConcept.id"
            class="absolute top-1.5 left-1.5 size-7 rounded-full bg-white flex items-center justify-center"
          >
            <svg class="size-4 text-[#030213]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <div v-else class="w-full aspect-square rounded-2xl border border-black/10 bg-muted flex items-center justify-center">
          <span class="text-sm text-[#717182]">—</span>
        </div>
      </div>

      <!-- CEO pick (pre-selected) -->
      <div class="flex flex-col gap-2">
        <p class="text-[14px] font-medium leading-4 text-[#717182]">Вибір CEO</p>
        <div
          v-if="ceoConcept"
          class="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer border-2"
          :class="selectedId === ceoConcept.id ? 'border-[#030213]' : 'border-black/10'"
          @click="selectConcept(ceoConcept.id)"
        >
          <img
            v-if="ceoConcept.visual_url"
            :src="getAssetUrl(ceoConcept.visual_url)"
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
        <div v-else class="w-full aspect-square rounded-2xl border border-black/10 bg-muted flex items-center justify-center">
          <span class="text-sm text-[#717182]">—</span>
        </div>
      </div>
    </div>

    <hr class="border-t border-black/10 max-w-[506px]" />

    <!-- Other / available concepts grid -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between max-w-[506px]">
        <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
          {{ isPostApply ? 'Доступні концепти' : 'Інші концепти' }}
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
        @select="selectConcept"
      />
    </div>

    <CeoCommentReadonly :value="ceoCeoComment" />

    <template #footer>
      <EditFlowFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        :loading="isSaving"
        @cancel="goCancel"
        @primary="goDali"
      />
    </template>
  </EditFlowStepShell>
</template>
