<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useConstructorStore } from '@/stores/constructor';
import { useAuthStore } from '@/stores/auth';
import { useApiList, apiPatch } from '@/composables/useApi';
import type { Concept, ExternalNaming, InternalNaming, PrPackage, Brand } from '@brand-constructor/shared/types';
import { usePrintBrand, type PrintBrandData } from '@/composables/usePrintBrand';
import { getAuthHeader } from '@/composables/useApi';

const router = useRouter();
const { printBrand } = usePrintBrand();
const store = useConstructorStore();
const authStore = useAuthStore();

const isCeoView = computed(() => authStore.isCeoOrAdmin);

const { data: concepts, fetchData: fetchConcepts, perPage: cPerPage } = useApiList<Concept>('/api/concepts');
const { data: externalNamings, fetchData: fetchExternalNamings, perPage: ePerPage } = useApiList<ExternalNaming>('/api/namings/external');
const { data: internalNamings, fetchData: fetchInternalNamings, perPage: iPerPage } = useApiList<InternalNaming>('/api/namings/internal');
const { data: prPackages, fetchData: fetchPrPackages, perPage: pPerPage } = useApiList<PrPackage>('/api/pr-packages');

onMounted(() => {
  cPerPage.value = 100;
  ePerPage.value = 100;
  iPerPage.value = 100;
  pPerPage.value = 100;
  fetchConcepts({});
  fetchExternalNamings({});
  fetchInternalNamings({});
  fetchPrPackages({});
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
  sectionKey: string;
  icon: 'globe' | 'calendar' | 'file-text' | 'sun' | 'moon' | 'palette' | 'tag' | 'briefcase' | 'package' | 'scale' | 'handshake' | 'layers' | 'sparkles';
  step: number;
}

const summaryItems = computed<SummaryItem[]>(() => {
  const items: SummaryItem[] = [];

  if (basics.value.geo.length > 0) {
    items.push({ label: 'Географія', value: basics.value.geo.join(', '), sectionKey: 'basics', icon: 'globe', step: 1 });
  }
  if (basics.value.launchDate) {
    items.push({ label: 'Дата запуску', value: formatDate(basics.value.launchDate), sectionKey: 'basics', icon: 'calendar', step: 1 });
  }
  if (basics.value.linkedProduct) {
    items.push({ label: 'Опис', value: basics.value.linkedProduct, sectionKey: 'basics', icon: 'file-text', step: 1 });
  }
  if (mode.value) {
    items.push({ label: 'Тема', value: mode.value === 'dark' ? 'Dark Mode' : 'Light Mode', sectionKey: 'mode', icon: mode.value === 'dark' ? 'moon' : 'sun', step: 2 });
  }
  if (selectedConcept.value) {
    items.push({ label: 'Концепт', value: selectedConcept.value.name, sectionKey: 'concept', icon: 'palette', step: 3 });
  } else if (isNewConcept.value) {
    items.push({ label: 'Концепт', value: 'Новий концепт (бриф)', sectionKey: 'concept', icon: 'palette', step: 3 });
  }
  if (selectedExternalNamings.value.length > 0) {
    items.push({ label: 'Зовнішня назва', value: selectedExternalNamings.value.map(n => n.name).join(', '), sectionKey: 'externalNaming', icon: 'tag', step: 4 });
  } else if (isNewNaming.value) {
    items.push({ label: 'Зовнішня назва', value: 'Новий неймінг (бриф)', sectionKey: 'externalNaming', icon: 'tag', step: 4 });
  }
  if (selectedInternalNaming.value) {
    items.push({ label: 'Внутрішня назва', value: selectedInternalNaming.value.name, sectionKey: 'internalNaming', icon: 'briefcase', step: 5 });
  } else if (internalFeedback.value) {
    items.push({ label: 'Внутрішня назва', value: internalFeedback.value, sectionKey: 'internalNaming', icon: 'briefcase', step: 5 });
  }
  if (selectedPackage.value) {
    items.push({ label: 'Пакет', value: selectedPackage.value.name, sectionKey: 'marketingPackage', icon: 'package', step: 7 });
  }
  if (deliverables.value.legalLanding) {
    items.push({ label: 'Юридичний лендінг', value: 'Так', sectionKey: 'deliverables', icon: 'scale', step: 8 });
  }
  if (deliverables.value.partnerLanding) {
    items.push({ label: 'Партнерський продукт', value: 'Так', sectionKey: 'deliverables', icon: 'handshake', step: 8 });
  }
  if (visualComponents.value.delegateToDesigners) {
    items.push({ label: 'Візуальні компоненти', value: 'Делеговано дизайнерам', sectionKey: 'visualComponents', icon: 'sparkles', step: 9 });
  } else if (componentSelectionCount.value > 0) {
    items.push({ label: 'Візуальні компоненти', value: `${componentSelectionCount.value} обрано`, sectionKey: 'visualComponents', icon: 'layers', step: 9 });
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
const statusActionLoading = ref(false);
const statusActionError = ref<string | null>(null);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Чернетка', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'На розгляді', color: 'bg-blue-100 text-blue-700' },
  needs_revision: { label: 'Потребує доопрацювання', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Затверджено', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Відхилено', color: 'bg-red-100 text-red-700' },
};

const brandStatus = computed(() => store.brandStatus ?? 'draft');
const statusInfo = computed(() => STATUS_LABELS[brandStatus.value] ?? STATUS_LABELS.draft);

const hasNewBrief = computed(() => {
  return (
    store.stepData?.concept?.newConceptBrief != null ||
    store.stepData?.externalNaming?.newNamingBrief != null
  );
});

const showCeoReview = computed(() =>
  isCeoView.value &&
  !hasNewBrief.value &&
  (brandStatus.value === 'submitted' || brandStatus.value === 'needs_revision')
);

const showCeoLibraryModal = ref(false);
const ceoLibraryType = ref<'concept' | 'externalNaming' | 'internalNaming'>('concept');
const ceoSelections = reactive<Record<string, string>>({});

function openCeoLibrary(type: 'concept' | 'externalNaming' | 'internalNaming') {
  ceoLibraryType.value = type;
  showCeoLibraryModal.value = true;
}

function selectCeoAlternative(type: string, id: string) {
  ceoSelections[type] = id;
  showCeoLibraryModal.value = false;
}

const ceoLibraryItems = computed(() => {
  if (ceoLibraryType.value === 'concept') {
    return concepts.value.map(c => ({ id: c.id, name: c.name }));
  }
  if (ceoLibraryType.value === 'externalNaming') {
    return externalNamings.value.map(n => ({ id: n.id, name: n.name }));
  }
  return internalNamings.value.map(n => ({ id: n.id, name: n.name }));
});

const ceoLibraryTitle = computed(() => {
  const titles: Record<string, string> = {
    concept: 'Оберіть концепт',
    externalNaming: 'Оберіть зовнішню назву',
    internalNaming: 'Оберіть внутрішню назву',
  };
  return titles[ceoLibraryType.value] ?? '';
});

const ceoComments = reactive<Record<string, string>>({
  concept: '',
  externalNaming: '',
  internalNaming: '',
  marketingPackage: '',
  deliverables: '',
  visualComponents: '',
  general: '',
});

const CEO_COMMENT_SECTIONS = [
  { key: 'concept', label: 'Концепт' },
  { key: 'externalNaming', label: 'Зовнішня назва' },
  { key: 'internalNaming', label: 'Внутрішня назва' },
  { key: 'marketingPackage', label: 'PR пакет' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'visualComponents', label: 'Візуальні компоненти' },
  { key: 'general', label: 'Загальний коментар' },
];

const nonEmptyCeoComments = computed(() => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(ceoComments)) {
    if (value.trim()) result[key] = value.trim();
  }
  return result;
});

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

const draftSaved = ref(false);

async function handleSaveDraft() {
  const success = await store.saveBrand();
  if (success) {
    draftSaved.value = true;
    setTimeout(() => { draftSaved.value = false; }, 3000);
  }
}

async function handleStatusChange(newStatus: 'submitted' | 'approved' | 'needs_revision') {
  if (!store.brandId) {
    const saved = await store.saveBrand();
    if (!saved) return;
  }

  statusActionLoading.value = true;
  statusActionError.value = null;

  try {
    const payload: Record<string, unknown> = { status: newStatus };
    if (isCeoView.value && Object.keys(nonEmptyCeoComments.value).length > 0) {
      payload.ceoComments = nonEmptyCeoComments.value;
    }
    if (isCeoView.value && Object.keys(ceoSelections).length > 0) {
      payload.ceoSelections = { ...ceoSelections };
    }
    await apiPatch<Brand>(`/api/brands/${store.brandId}/status`, payload);
    store.setBrandStatus(newStatus);
  } catch (err) {
    statusActionError.value = err instanceof Error ? err.message : 'Помилка зміни статусу';
  } finally {
    statusActionLoading.value = false;
  }
}

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  ct_header: 'Хедер',
  ct_banners: 'Банери',
  ct_thumbnails: 'Сабнейли',
  ct_tabbar: 'Таббар',
  ct_sidebar: 'Сайдбар',
  ct_theme: 'Тема',
};

async function handlePrintBrand() {
  const selections = store.stepData?.visualComponents?.selections ?? {};
  const componentLabels: Record<string, string> = {};

  for (const [typeId, variantId] of Object.entries(selections)) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants`,
        { headers: getAuthHeader() },
      );
      if (res.ok) {
        const json = await res.json();
        const variants = json.data?.variants || [];
        const variant = variants.find((v: { id: string; name: string }) => v.id === variantId);
        componentLabels[typeId] = variant?.name ?? variantId;
      } else {
        componentLabels[typeId] = variantId;
      }
    } catch {
      componentLabels[typeId] = variantId;
    }
  }

  const data: PrintBrandData = {
    brandName: store.brandInternalName || 'New Brand',
    conceptName: selectedConcept.value?.name ?? null,
    externalNamingNames: selectedExternalNamings.value.map(n => n.name),
    internalNamingName: selectedInternalNaming.value?.name ?? null,
    prPackageName: selectedPackage.value?.name ?? null,
    componentLabels,
  };

  printBrand(data);
}
</script>

<template>
  <div class="space-y-6" style="opacity: 1; transform: none;">
    <!-- Status badge -->
    <div v-if="store.brandId" class="flex items-center gap-2">
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        :class="statusInfo.color"
      >
        {{ statusInfo.label }}
      </span>
    </div>

    <!-- Banner -->
    <div class="bg-primary/5 rounded-xl p-6">
      <div class="flex items-center gap-3 text-primary mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="text-base font-medium">
          {{ showCeoReview ? 'Бриф на розгляд' : 'Бриф готовий!' }}
        </h3>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ showCeoReview
          ? 'Перегляньте бриф та залиште коментарі. Затвердіть або поверніть на доопрацювання.'
          : 'Перегляньте всю інформацію справа. Ви можете поділитися брифом або зберегти його для подальшої роботи.'
        }}
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

    <!-- CEO Comments Section -->
    <div v-if="showCeoReview && (brandStatus === 'submitted' || brandStatus === 'needs_revision')" class="space-y-4 pt-4 border-t border-black/10">
      <h4 class="text-sm font-medium text-foreground">Коментарі CEO</h4>
      <div
        v-for="section in CEO_COMMENT_SECTIONS"
        :key="section.key"
        class="space-y-1"
      >
        <label class="text-xs text-muted-foreground">{{ section.label }}</label>
        <textarea
          v-model="ceoComments[section.key]"
          rows="2"
          class="w-full px-3 py-2 bg-[#f3f3f5] border border-transparent rounded-lg resize-none text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          :placeholder="`Коментар до секції «${section.label}»...`"
        />
      </div>
    </div>

    <!-- Error messages -->
    <div v-if="saveError || statusActionError" class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
      {{ statusActionError || saveError }}
    </div>

    <!-- CEO Selections indicator -->
    <div v-if="showCeoReview && Object.keys(ceoSelections).length > 0" class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
      <p class="font-medium mb-1">Обрані альтернативи CEO:</p>
      <ul class="list-disc list-inside space-y-0.5">
        <li v-if="ceoSelections.concept">
          Концепт: {{ concepts.find(c => c.id === ceoSelections.concept)?.name ?? ceoSelections.concept }}
        </li>
        <li v-if="ceoSelections.externalNaming">
          Зовн. назва: {{ externalNamings.find(n => n.id === ceoSelections.externalNaming)?.name ?? ceoSelections.externalNaming }}
        </li>
        <li v-if="ceoSelections.internalNaming">
          Внутр. назва: {{ internalNamings.find(n => n.id === ceoSelections.internalNaming)?.name ?? ceoSelections.internalNaming }}
        </li>
      </ul>
    </div>

    <!-- CEO Action Buttons -->
    <div v-if="showCeoReview && (brandStatus === 'submitted' || brandStatus === 'needs_revision')" class="grid grid-cols-1 gap-3 pt-4 border-t border-black/10">
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading"
        @click="handleStatusChange('approved')"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        {{ statusActionLoading ? 'Зачекайте...' : 'Затвердити' }}
      </button>
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading"
        @click="handleStatusChange('needs_revision')"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
        Повернути на доопрацювання
      </button>
      <button
        class="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        @click="openCeoLibrary('concept')"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /></svg>
        Переглянути бібліотеку
      </button>
    </div>

    <!-- CEO Library Modal -->
    <Teleport to="body">
      <div v-if="showCeoLibraryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-black/10">
            <h3 class="text-base font-semibold">{{ ceoLibraryTitle }}</h3>
            <button class="text-muted-foreground hover:text-foreground transition-colors" @click="showCeoLibraryModal = false">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
          <div class="flex gap-2 px-6 pt-4">
            <button
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="ceoLibraryType === 'concept' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="ceoLibraryType = 'concept'"
            >Концепти</button>
            <button
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="ceoLibraryType === 'externalNaming' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="ceoLibraryType = 'externalNaming'"
            >Зовнішні назви</button>
            <button
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="ceoLibraryType === 'internalNaming' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="ceoLibraryType = 'internalNaming'"
            >Внутрішні назви</button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <button
              v-for="item in ceoLibraryItems"
              :key="item.id"
              class="w-full text-left px-4 py-3 rounded-lg border transition-colors"
              :class="ceoSelections[ceoLibraryType] === item.id ? 'border-primary bg-primary/5 text-primary' : 'border-black/10 hover:bg-gray-50'"
              @click="selectCeoAlternative(ceoLibraryType, item.id)"
            >
              <span class="text-sm font-medium">{{ item.name }}</span>
              <span v-if="ceoSelections[ceoLibraryType] === item.id" class="ml-2 text-xs text-primary">Обрано</span>
            </button>
            <p v-if="ceoLibraryItems.length === 0" class="text-center text-sm text-muted-foreground py-8">
              Немає доступних елементів
            </p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- PO Action Buttons -->
    <div v-if="!showCeoReview" class="space-y-3 pt-4 border-t border-black/10">
      <!-- Submit for Review (only for draft / needs_revision) -->
      <button
        v-if="brandStatus === 'draft' || brandStatus === 'needs_revision'"
        class="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        :disabled="statusActionLoading || isSaving"
        @click="handleStatusChange('submitted')"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
        {{ statusActionLoading ? 'Відправляємо...' : 'Відправити на розгляд' }}
      </button>

      <div class="grid grid-cols-2 gap-4">
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
          class="flex items-center justify-center gap-2 px-6 py-4 bg-[#f3f3f5] text-foreground rounded-xl hover:bg-[#ececf0] transition-colors text-base font-medium disabled:opacity-50"
          :disabled="isSaving"
          @click="handleSaveDraft"
        >
          <div v-if="isSaving" class="animate-spin size-5 border-2 border-foreground border-t-transparent rounded-full" />
          <svg v-else-if="draftSaved" class="size-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg v-else class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" />
          </svg>
          {{ isSaving ? 'Зберігаємо...' : draftSaved ? 'Збережено!' : 'Зберегти як чернетку' }}
        </button>
      </div>

      <button
        class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-black/10 text-foreground rounded-xl hover:bg-black/[0.02] transition-colors text-sm font-medium"
        @click="handlePrintBrand"
      >
        <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        Завантажити PDF
      </button>
    </div>
  </div>
</template>
