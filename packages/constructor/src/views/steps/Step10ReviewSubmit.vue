<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useConstructorStore } from '@/stores/constructor';
import { useApiList, getAssetUrl } from '@/composables/useApi';
import type { Concept, ExternalNaming, InternalNaming, PrPackage } from '@brand-constructor/shared/types';

const router = useRouter();
const store = useConstructorStore();

const { data: concepts, fetchData: fetchConcepts, perPage: cPerPage } = useApiList<Concept>('/api/concepts');
const { data: externalNamings, fetchData: fetchExternalNamings, perPage: ePerPage } = useApiList<ExternalNaming>('/api/namings/external');
const { data: internalNamings, fetchData: fetchInternalNamings, perPage: iPerPage } = useApiList<InternalNaming>('/api/namings/internal');
const { data: prPackages, fetchData: fetchPrPackages, perPage: pPerPage } = useApiList<PrPackage>('/api/pr-packages');

onMounted(() => {
  cPerPage.value = 100;
  ePerPage.value = 100;
  iPerPage.value = 100;
  pPerPage.value = 100;
  fetchConcepts({ status: 'active' });
  fetchExternalNamings({ status: 'active' });
  fetchInternalNamings({ status: 'active' });
  fetchPrPackages({ status: 'active' });
});

const basics = computed(() => store.stepData.brandBasics);
const mode = computed(() => store.stepData.mode);

const selectedConcept = computed(() => {
  const id = store.stepData.concept.selectedId;
  return id ? concepts.value.find(c => c.id === id) ?? null : null;
});

const isNewConcept = computed(() => store.stepData.concept.newConceptBrief !== null);

const selectedExternalNamings = computed(() => {
  const ids = store.stepData.externalNaming.selectedIds;
  return ids
    .map(id => externalNamings.value.find(n => n.id === id))
    .filter((n): n is ExternalNaming => n != null);
});

const isNewNaming = computed(() => store.stepData.externalNaming.newNamingBrief !== null);

const selectedInternalNaming = computed(() => {
  const id = store.stepData.internalNaming.selectedId;
  return id ? internalNamings.value.find(n => n.id === id) ?? null : null;
});

const internalFeedback = computed(() => store.stepData.internalNaming.newNamingFeedback);

const selectedPackage = computed(() => {
  const id = store.stepData.marketingPackage.selectedId;
  return id ? prPackages.value.find(p => p.id === id) ?? null : null;
});

const deliverables = computed(() => store.stepData.deliverables);
const visualComponents = computed(() => store.stepData.visualComponents);

const componentSelectionCount = computed(() => Object.keys(visualComponents.value.selections).length);

interface SummaryItem {
  label: string;
  value: string;
  icon: 'globe' | 'calendar' | 'file-text' | 'sun' | 'moon' | 'palette' | 'tag' | 'briefcase' | 'package' | 'scale' | 'handshake' | 'layers' | 'sparkles';
  step: number;
}

const summaryItems = computed<SummaryItem[]>(() => {
  const items: SummaryItem[] = [];

  if (basics.value.geo.length > 0) {
    items.push({ label: 'Географія', value: basics.value.geo.join(', '), icon: 'globe', step: 1 });
  }
  if (basics.value.launchDate) {
    items.push({ label: 'Дата запуску', value: formatDate(basics.value.launchDate), icon: 'calendar', step: 1 });
  }
  if (basics.value.linkedProduct) {
    items.push({ label: 'Опис', value: basics.value.linkedProduct, icon: 'file-text', step: 1 });
  }
  if (mode.value) {
    items.push({ label: 'Тема', value: mode.value === 'dark' ? 'Dark Mode' : 'Light Mode', icon: mode.value === 'dark' ? 'moon' : 'sun', step: 2 });
  }
  if (selectedConcept.value) {
    items.push({ label: 'Концепт', value: selectedConcept.value.name, icon: 'palette', step: 3 });
  } else if (isNewConcept.value) {
    items.push({ label: 'Концепт', value: 'Новий концепт (бриф)', icon: 'palette', step: 3 });
  }
  if (selectedExternalNamings.value.length > 0) {
    items.push({ label: 'Зовнішня назва', value: selectedExternalNamings.value.map(n => n.name).join(', '), icon: 'tag', step: 4 });
  } else if (isNewNaming.value) {
    items.push({ label: 'Зовнішня назва', value: 'Новий неймінг (бриф)', icon: 'tag', step: 4 });
  }
  if (selectedInternalNaming.value) {
    items.push({ label: 'Внутрішня назва', value: selectedInternalNaming.value.name, icon: 'briefcase', step: 5 });
  } else if (internalFeedback.value) {
    items.push({ label: 'Внутрішня назва', value: internalFeedback.value, icon: 'briefcase', step: 5 });
  }
  if (selectedPackage.value) {
    items.push({ label: 'Пакет', value: selectedPackage.value.name, icon: 'package', step: 7 });
  }
  if (deliverables.value.legalLanding) {
    items.push({ label: 'Юридичний лендінг', value: 'Так', icon: 'scale', step: 8 });
  }
  if (deliverables.value.partnerLanding) {
    items.push({ label: 'Партнерський продукт', value: 'Так', icon: 'handshake', step: 8 });
  }
  if (visualComponents.value.delegateToDesigners) {
    items.push({ label: 'Візуальні компоненти', value: 'Делеговано дизайнерам', icon: 'sparkles', step: 9 });
  } else if (componentSelectionCount.value > 0) {
    items.push({ label: 'Візуальні компоненти', value: `${componentSelectionCount.value} обрано`, icon: 'layers', step: 9 });
  }

  return items;
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date).replace(/\s*р\.$/, '');
}

const shareSuccess = ref(false);

const isSaving = computed(() => store.isSaving);
const saveError = computed(() => store.saveError);

function goToStep(step: number) {
  router.push(`/constructor/step/${step}`);
}

async function handleShare() {
  if (!store.brandId) {
    const saved = await store.saveBrand();
    if (!saved) return;
  }

  const shareUrl = `${window.location.origin}/constructor/brand/${store.brandId}`;

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareSuccess.value = true;
    setTimeout(() => { shareSuccess.value = false; }, 2000);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    shareSuccess.value = true;
    setTimeout(() => { shareSuccess.value = false; }, 2000);
  }
}

async function handleSave() {
  const success = await store.saveBrand();
  if (success) {
    router.push('/constructor/success');
  }
}
</script>

<template>
  <div class="space-y-6" style="opacity: 1; transform: none;">
    <!-- Success banner -->
    <div class="bg-primary/5 rounded-xl p-6">
      <div class="flex items-center gap-3 text-primary mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="text-base font-medium">Бриф готовий!</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Перегляньте всю інформацію справа. Ви можете поділитися брифом або зберегти його для подальшої роботи.
      </p>
    </div>

    <!-- Summary items -->
    <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
      <button
        v-for="item in summaryItems"
        :key="item.label"
        class="w-full p-4 bg-[#f3f3f5] border border-black/10 rounded-lg text-left hover:bg-[#ececf0] transition-colors group"
        @click="goToStep(item.step)"
      >
        <div class="flex items-start gap-3">
          <!-- Globe -->
          <svg v-if="item.icon === 'globe'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
          </svg>
          <!-- Calendar -->
          <svg v-else-if="item.icon === 'calendar'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
          </svg>
          <!-- File-text -->
          <svg v-else-if="item.icon === 'file-text'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
          </svg>
          <!-- Sun -->
          <svg v-else-if="item.icon === 'sun'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <!-- Moon -->
          <svg v-else-if="item.icon === 'moon'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <!-- Palette -->
          <svg v-else-if="item.icon === 'palette'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
          </svg>
          <!-- Tag -->
          <svg v-else-if="item.icon === 'tag'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
          <!-- Briefcase -->
          <svg v-else-if="item.icon === 'briefcase'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
          <!-- Package -->
          <svg v-else-if="item.icon === 'package'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" />
          </svg>
          <!-- Scale -->
          <svg v-else-if="item.icon === 'scale'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
          <!-- Handshake -->
          <svg v-else-if="item.icon === 'handshake'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />
          </svg>
          <!-- Layers -->
          <svg v-else-if="item.icon === 'layers'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" /><path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
          </svg>
          <!-- Sparkles -->
          <svg v-else-if="item.icon === 'sparkles'" class="size-5 text-primary flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
          </svg>

          <div class="flex-1 min-w-0">
            <p class="text-sm text-muted-foreground mb-1">{{ item.label }}</p>
            <p class="text-sm line-clamp-3">{{ item.value }}</p>
          </div>

          <svg class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </div>
      </button>
    </div>

    <!-- Error message -->
    <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
      {{ saveError }}
    </div>

    <!-- Action buttons -->
    <div class="grid grid-cols-2 gap-4 pt-4 border-t border-black/10">
      <button
        class="flex items-center justify-center gap-2 px-6 py-4 bg-[#f3f3f5] text-foreground rounded-xl hover:bg-[#ececf0] transition-colors text-base font-medium disabled:opacity-50"
        :disabled="isSaving"
        @click="handleShare"
      >
        <svg v-if="shareSuccess" class="size-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <svg v-else class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        {{ shareSuccess ? 'Скопійовано!' : 'Share' }}
      </button>
      <button
        class="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity text-base font-medium disabled:opacity-50"
        :disabled="isSaving"
        @click="handleSave"
      >
        <div v-if="isSaving" class="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
        <svg v-else class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" />
        </svg>
        {{ isSaving ? 'Зберігаємо...' : 'In work' }}
      </button>
    </div>
  </div>
</template>
