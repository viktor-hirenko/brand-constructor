<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList, apiGet } from '@/composables/useApi'
import type { Concept } from '@brand-constructor/shared/types'
import ConceptGrid from '@/components/constructor/ceo-reselect/ConceptGrid.vue'
import CustomerPickPreview from '@/components/constructor/ceo-reselect/CustomerPickPreview.vue'
import EditFlowFooter from '@/components/constructor/edit-flow/EditFlowFooter.vue'
import EditFlowStepShell from '@/components/constructor/edit-flow/EditFlowStepShell.vue'
import StepCommentField from '@/components/constructor/StepCommentField.vue'

const store = useConstructorStore()
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

/** Local mode toggle for CEO re-select; does not mutate PO `stepData.mode`. */
const localMode = ref<'light' | 'dark'>(store.stepData.mode === 'dark' ? 'dark' : 'light')

const poConceptId = computed(() => store.stepData.concept.selectedId)

/**
 * PO-pick is fetched independently of the theme filter so it stays visible
 * regardless of which theme the CEO is currently browsing.
 */
const poConcept = ref<Concept | null>(null)

async function loadPoConcept() {
  const id = poConceptId.value
  if (!id) {
    poConcept.value = null
    return
  }
  try {
    poConcept.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch {
    poConcept.value = null
  }
}

const stagedConfirmedId = computed(() => store.ceoReselectDraft.conceptId)
const stagedPreviewId = computed(() => store.ceoReselectDraft.conceptPreviewId)

/** Available concepts (excludes the customer's pick). */
const availableConcepts = computed(() =>
  concepts.value.filter(c => c.id !== poConceptId.value)
)

const primaryDisabled = computed(
  () => !stagedConfirmedId.value || stagedConfirmedId.value === poConceptId.value
)

function loadConcepts() {
  perPage.value = 100
  const params: Record<string, string> = { status: 'active', mode: localMode.value }
  if (store.brandId) {
    params.available_for_brand = store.brandId
  }
  fetchData(params)
}

onMounted(() => {
  store.seedCeoReselectFromBrand('concept')
  if (!store.ceoReselectDraft.conceptPreviewId) {
    store.setCeoReselectConceptPreview(poConceptId.value)
  }
  loadPoConcept()
  loadConcepts()
})

watch(localMode, loadConcepts)
watch(poConceptId, loadPoConcept)

function handleSelectConcept(conceptId: string) {
  store.setCeoReselectConceptPreview(conceptId)
}

function setMode(mode: 'light' | 'dark') {
  localMode.value = mode
}

const conceptComment = computed({
  get: () => store.brandCeoComments?.concept?.value ?? '',
  set: (value: string) => store.setCeoCommentValue('concept', value),
})

function goBack() {
  router.push(`/constructor/brand/${brandId.value}`)
}

function goNext() {
  const id = stagedConfirmedId.value
  const po = poConceptId.value
  if (!id || !po) return
  if (id === po) return
  router.push(`/constructor/brand/${brandId.value}/ceo-reselect/concept/external-naming`)
}
</script>

<template>
  <EditFlowStepShell
    title="Concept Selection"
    subtitle="Оберіть концепт та перегляньте прев’ю праворуч."
  >
    <!-- Customer's pick (independent of theme filter) -->
    <CustomerPickPreview :concept="poConcept" />

    <!-- Divider after customer pick -->
    <div
      class="h-px w-full max-w-[506px] shrink-0 bg-[rgba(0,0,0,0.1)]"
      aria-hidden="true"
    />

    <!-- Theme toggle (light / dark) — filters available concepts -->
    <div
      class="inline-flex self-start rounded-full bg-[#ececf0] p-1 gap-1 border border-black/5"
      role="group"
      aria-label="Тема інтерфейсу"
    >
      <button
        type="button"
        class="h-10 px-4 rounded-full text-base font-medium tracking-[-0.31px] transition-all"
        :class="
          localMode === 'light'
            ? 'bg-white text-foreground shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1)]'
            : 'text-[#6e6e6e] hover:text-foreground'
        "
        @click="setMode('light')"
      >
        Світла тема
      </button>
      <button
        type="button"
        class="h-10 px-4 rounded-full text-base font-medium tracking-[-0.31px] transition-all"
        :class="
          localMode === 'dark'
            ? 'bg-white text-foreground shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1)]'
            : 'text-[#6e6e6e] hover:text-foreground'
        "
        @click="setMode('dark')"
      >
        Темна тема
      </button>
    </div>

    <!-- Available concepts -->
    <div class="flex flex-col gap-3">
      <p class="text-[16px] font-medium leading-6 text-[#717182] tracking-[-0.3125px]">
        Доступні концепти
      </p>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
      <div v-else-if="error" class="text-center py-12 text-red-500">
        <p class="mb-3">{{ error }}</p>
        <button type="button" class="text-primary underline text-sm" @click="loadConcepts">
          Спробувати знову
        </button>
      </div>
      <ConceptGrid
        v-else
        :concepts="availableConcepts"
        :preview-id="stagedPreviewId"
        :selected-id="stagedConfirmedId"
        @select="handleSelectConcept"
      />
    </div>

    <StepCommentField
      v-model="conceptComment"
      label="Коментар СЕО"
      placeholder="Додайте коментар СЕО..."
    />

    <p v-if="store.saveCeoSelectionsError" class="text-sm text-red-600">
      {{ store.saveCeoSelectionsError }}
    </p>

    <template #footer>
      <EditFlowFooter
        cancel-label="Скасувати"
        primary-label="Далі"
        :primary-disabled="primaryDisabled"
        @cancel="goBack"
        @primary="goNext"
      />
    </template>
  </EditFlowStepShell>
</template>
