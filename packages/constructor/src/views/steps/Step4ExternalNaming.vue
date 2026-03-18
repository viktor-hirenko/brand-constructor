<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useConstructorStore } from '@/stores/constructor';
import { useApiList } from '@/composables/useApi';
import type { ExternalNaming } from '@brand-constructor/shared/types';
import type { NewNamingBrief } from '@brand-constructor/shared/types';
import NewNamingModal from '@/components/constructor/NewNamingModal.vue';

const store = useConstructorStore();

const { data: namings, loading, error, fetchData } = useApiList<ExternalNaming>('/api/namings/external');

const comment = computed({
  get: () => store.stepData.externalNaming.comment,
  set: (val: string) => store.setExternalNaming({ comment: val }),
});

const selectedIds = computed(() => store.stepData.externalNaming.selectedIds);
const selectedCount = computed(() => selectedIds.value.length);
const isCreatingNew = computed(() => store.stepData.externalNaming.newNamingBrief !== null);
const isCommentRequired = computed(() => selectedCount.value > 1);

const showNewModal = ref(false);

const selectedConceptId = computed(() => store.stepData.concept.selectedId);

function isSold(naming: ExternalNaming): boolean {
  return naming.availability_status === 'sold';
}

function toggleNaming(naming: ExternalNaming) {
  if (isCreatingNew.value || isSold(naming)) return;
  store.toggleExternalNaming(naming.id);
}

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id);
}

function handleCreateNew() {
  if (isCreatingNew.value) {
    store.setNewNamingBrief(null);
  } else {
    showNewModal.value = true;
  }
}

function handleBriefSave(brief: NewNamingBrief) {
  store.setNewNamingBrief(brief);
  store.setExternalNaming({ selectedIds: [] });
  showNewModal.value = false;
}

async function loadNamings() {
  const params: Record<string, string> = { per_page: '50', status: 'active' };
  if (selectedConceptId.value) {
    params.concept_id = selectedConceptId.value;
  }
  await fetchData(params);

  const validIds = new Set(namings.value.map(n => n.id));
  const staleIds = selectedIds.value.filter(id => !validIds.has(id));
  if (staleIds.length > 0) {
    store.setExternalNaming({
      selectedIds: selectedIds.value.filter(id => validIds.has(id)),
    });
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return `$${price.toLocaleString()}`;
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'available': return 'Available';
    case 'sold': return 'Sold';
    default: return 'Unknown';
  }
}

function getStatusClass(status: string | null): string {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800';
    case 'sold': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

onMounted(loadNamings);
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-muted-foreground text-base tracking-[-0.31px]">
      Оберіть до 3-х назв для зовнішньої комунікації
    </p>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 text-red-500">
      <p>{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 bg-primary text-white rounded-[10px] text-sm"
        @click="loadNamings"
      >
        Спробувати знову
      </button>
    </div>

    <!-- Naming Cards Grid -->
    <template v-else>
      <div
        v-if="namings.length > 0"
        class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <div
          v-for="naming in namings"
          :key="naming.id"
          class="relative rounded-[14px] overflow-hidden border-2 transition-all bg-white"
          :class="[
            isSold(naming)
              ? 'border-black/10 opacity-40 cursor-not-allowed'
              : isSelected(naming.id)
                ? 'border-[#030213] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] cursor-pointer'
                : isCreatingNew
                  ? 'border-black/10 opacity-40 cursor-not-allowed'
                  : 'border-black/10 hover:border-primary/50 cursor-pointer',
          ]"
          @click="toggleNaming(naming)"
        >
          <div class="aspect-[2/1] relative flex flex-col items-center justify-center p-4">
            <h2 class="text-center text-3xl font-medium tracking-[0.37px] text-[#0a0a0a] mb-1">
              {{ naming.name }}
            </h2>
            <p v-if="naming.domain" class="text-sm text-primary font-medium mb-1">
              {{ naming.domain }}
            </p>
            <p class="text-sm text-muted-foreground text-center tracking-[-0.15px]">
              {{ naming.tagline || '\u00A0' }}
            </p>
            <!-- Domain info row -->
            <div v-if="naming.domain || naming.price !== null" class="flex items-center gap-3 mt-2">
              <span 
                v-if="naming.availability_status" 
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="getStatusClass(naming.availability_status)"
              >
                {{ getStatusLabel(naming.availability_status) }}
              </span>
              <span v-if="naming.price !== null" class="text-sm font-semibold text-gray-700">
                {{ formatPrice(naming.price) }}
              </span>
            </div>
          </div>

          <!-- Checkmark badge -->
          <div
            v-if="isSelected(naming.id)"
            class="absolute top-4 right-4 size-8 rounded-full bg-[#030213] flex items-center justify-center shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
          >
            <svg class="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Empty state when no namings from API -->
      <div v-else class="text-center py-16 text-muted-foreground">
        <svg class="size-16 mx-auto mb-4 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <p>Неймінги не знайдено</p>
      </div>
    </template>

    <!-- Create New Naming button -->
    <button
      type="button"
      class="inline-flex items-center gap-2 h-[40px] px-4 rounded-[10px] transition-colors text-base font-medium tracking-[-0.31px] self-start"
      :class="isCreatingNew
        ? 'bg-[#030213] text-white hover:opacity-90'
        : 'bg-[rgba(3,2,19,0.1)] text-[#030213] hover:bg-[rgba(3,2,19,0.15)]'"
      @click="handleCreateNew"
    >
      <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14" /><path d="M12 5v14" />
      </svg>
      Create New External Name
    </button>

    <!-- Коментар -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <svg class="size-4 text-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
        </svg>
        <span class="text-base font-medium text-foreground tracking-[-0.31px]">
          Коментар
          <span v-if="isCommentRequired" class="text-red-500">*</span>
        </span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
      <p v-if="isCommentRequired" class="text-xs text-muted-foreground">
        Коментар є обовʼязковим при виборі більше 1 неймінгу
      </p>
    </div>

    <!-- New Naming Modal -->
    <NewNamingModal
      v-if="showNewModal"
      @save="handleBriefSave"
      @cancel="showNewModal = false"
    />
  </div>
</template>
