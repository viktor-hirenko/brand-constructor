<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useConstructorStore } from '@/stores/constructor';
import { useApiList, getAssetUrl, getAuthHeader } from '@/composables/useApi';
import ConceptDetailOverlay from '@/components/constructor/ConceptDetailOverlay.vue';
import type { Concept, ExternalNaming, InternalNaming, ComponentVariant } from '@brand-constructor/shared/types';

const route = useRoute();
const router = useRouter();
const store = useConstructorStore();

const currentStep = computed(() => (route.meta.step as number) || 1);

watch(currentStep, (step) => {
  store.goToStep(step);
}, { immediate: true });

const stepTitle = computed(() => (route.meta.title as string) || '');
const stepSubtitle = computed(() => (route.meta.subtitle as string) || '');
const totalSteps = 10;
const progressPercent = computed(() => Math.round((currentStep.value / totalSteps) * 100));

const isFirstStep = computed(() => currentStep.value === 1);
const isLastStep = computed(() => currentStep.value === totalSteps);
const isFullWidth = computed(() => [3, 4, 5, 7, 8].includes(currentStep.value));

interface ExternalNamingPreview extends ExternalNaming {
  domain?: string | null;
  price?: number | null;
  price_usd?: number | null;
}

const detailConcept = ref<Concept | null>(null);

const { data: concepts, fetchData: fetchConcepts, perPage: conceptsPerPage } = useApiList<Concept>('/api/concepts');
const { data: externalNamings, fetchData: fetchExternalNamings, perPage: externalPerPage } =
  useApiList<ExternalNamingPreview>('/api/namings/external');
const { data: internalNamings, fetchData: fetchInternalNamings, perPage: internalPerPage } =
  useApiList<InternalNaming>('/api/namings/internal');

const brandBasics = computed(() => store.stepData?.brandBasics);
const hasGeo = computed(() => (brandBasics.value?.geo?.length ?? 0) > 0);
const hasDate = computed(() => (brandBasics.value?.launchDate ?? '') !== '');
const hasLinkedProduct = computed(() => (brandBasics.value?.linkedProduct ?? '').trim() !== '');

const selectedConcept = computed(() => {
  const id = store.stepData?.concept?.selectedId;
  if (!id) return null;
  return concepts.value.find((item) => item.id === id) ?? null;
});

const selectedExternalNamings = computed(() => {
  const ids = store.stepData?.externalNaming?.selectedIds ?? [];
  return ids
    .map((id) => externalNamings.value.find((item) => item.id === id))
    .filter((item): item is ExternalNamingPreview => item != null);
});

const selectedInternalNaming = computed(() => {
  const id = store.stepData?.internalNaming?.selectedId;
  if (!id) return null;
  return internalNamings.value.find((item) => item.id === id) ?? null;
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.replace(/\s*р\.$/, '');
}

function goBack() {
  if (!isFirstStep.value) {
    let prev = currentStep.value - 1;
    if (prev === 4 && store.shouldSkipStep4) prev = 3;
    router.push(`/constructor/step/${prev}`);
  }
}

function goNext() {
  if (store.isCurrentStepValid && !isLastStep.value) {
    let next = currentStep.value + 1;
    if (next === 4 && store.shouldSkipStep4) next = 5;
    router.push(`/constructor/step/${next}`);
  }
}

function getExternalDomain(naming: ExternalNamingPreview | null): string {
  if (!naming) return '—';
  if (naming.domain && naming.domain.trim() !== '') return naming.domain;
  return `${naming.name.toLowerCase().replace(/\s+/g, '')}.com`;
}

function getExternalPrice(naming: ExternalNamingPreview | null): string {
  if (!naming) return '—';
  const price = naming.price_usd ?? naming.price;
  if (typeof price === 'number' && Number.isFinite(price)) return `$${price}`;
  return '—';
}

function openConceptDetails() {
  if (selectedConcept.value) {
    detailConcept.value = selectedConcept.value;
  }
}

function loadPreviewData() {
  if (currentStep.value !== 6 && currentStep.value !== 10) return;
  conceptsPerPage.value = 100;
  externalPerPage.value = 100;
  internalPerPage.value = 100;
  fetchConcepts({ status: 'active' });
  fetchExternalNamings({ status: 'active' });
  fetchInternalNamings({ status: 'active' });
}

onMounted(loadPreviewData);
watch(currentStep, loadPreviewData);

const hasStep9Selections = computed(() => {
  return Object.keys(store.stepData?.visualComponents?.selections ?? {}).length > 0;
});

const step9VariantsCache = ref<Record<string, ComponentVariant[]>>({});
const step9SidebarVisible = ref(true);

interface ComponentSlot {
  left: string;
  top: string;
  width: string;
  height: string;
  zIndex: number;
  contain?: boolean;
}

const COMPONENT_SLOTS: Record<string, ComponentSlot> = {
  ct_header:     { left: '0px', top: '33.75px', width: '290.25px', height: '48px', zIndex: 20 },
  ct_banners:    { left: '12px', top: '81.75px', width: '278.25px', height: '144px', zIndex: 19 },
  ct_thumbnails: { left: '12px', top: '394.5px', width: '270px', height: '126px', zIndex: 18 },
  ct_tabbar:     { left: '0px', top: '557.25px', width: '289.5px', height: '57px', zIndex: 17 },
  ct_sidebar:    { left: '0px', top: '0px', width: '288.75px', height: '614.25px', zIndex: 30, contain: true },
  ct_theme:      { left: '0px', top: '0px', width: '288.75px', height: '614.25px', zIndex: 5 },
};

async function loadStep9Variants() {
  const selections = store.stepData?.visualComponents?.selections ?? {};
  const typeIds = Object.keys(selections);
  if (typeIds.length === 0) return;

  for (const typeId of typeIds) {
    if (step9VariantsCache.value[typeId]) continue;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants?status=active`,
        { headers: getAuthHeader() },
      );
      if (res.ok) {
        const json = await res.json();
        step9VariantsCache.value[typeId] = json.data?.variants || [];
      }
    } catch { /* skip */ }
  }
}

function getStep9PreviewUrl(typeId: string): string | null {
  const variantId = store.stepData?.visualComponents?.selections?.[typeId];
  if (!variantId) return null;
  const variants = step9VariantsCache.value[typeId] || [];
  const variant = variants.find(v => v.id === variantId);
  if (!variant) return null;
  const url = variant.preview_url || variant.thumbnail_url;
  if (!url) return null;
  return url.startsWith('http') ? url : getAssetUrl(url);
}

function buildLayers(hideSidebar: boolean) {
  const selections = store.stepData?.visualComponents?.selections ?? {};
  const layers: Array<{ typeId: string; url: string; slot: ComponentSlot }> = [];
  for (const [typeId, _variantId] of Object.entries(selections)) {
    if (typeId.includes('sidebar') && hideSidebar) continue;
    const slot = COMPONENT_SLOTS[typeId];
    const url = getStep9PreviewUrl(typeId);
    if (slot && url) {
      layers.push({ typeId, url, slot });
    }
  }
  return layers.sort((a, b) => a.slot.zIndex - b.slot.zIndex);
}

const step9SelectedLayers = computed(() => buildLayers(!step9SidebarVisible.value));
const step10SelectedLayers = computed(() => buildLayers(true));

const hasSidebarSelected = computed(() => {
  const selections = store.stepData?.visualComponents?.selections ?? {};
  return Object.keys(selections).some(id => id.includes('sidebar'));
});

function toggleSidebarPreview() {
  step9SidebarVisible.value = !step9SidebarVisible.value;
}

const prevSelections = ref<Record<string, string>>({});

watch(() => store.stepData?.visualComponents?.selections, (newSel) => {
  if (currentStep.value === 9) loadStep9Variants();

  const sel = (newSel ?? {}) as Record<string, string>;
  const sidebarKey = Object.keys(sel).find(k => k.includes('sidebar'));
  const prevSidebarKey = Object.keys(prevSelections.value).find(k => k.includes('sidebar'));

  const sidebarChanged = sidebarKey && sel[sidebarKey] !== prevSelections.value[sidebarKey ?? ''];
  const nonSidebarChanged = Object.keys(sel).some(k =>
    !k.includes('sidebar') && sel[k] !== prevSelections.value[k],
  ) || Object.keys(prevSelections.value).some(k =>
    !k.includes('sidebar') && prevSelections.value[k] !== sel[k],
  );

  if (sidebarChanged) {
    step9SidebarVisible.value = true;
  } else if (nonSidebarChanged) {
    step9SidebarVisible.value = false;
  }

  prevSelections.value = { ...sel };
}, { deep: true });

watch(currentStep, (step) => {
  if (step === 9) loadStep9Variants();
  if (step === 10) loadStep9Variants();
});
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div
      class="w-full max-w-[1311px] h-[calc(100vh-48px)] min-h-[740px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex"
    >
      <!-- Main Panel (full-width on step 3, 42% otherwise) -->
      <div
        :class="isFullWidth ? 'w-full' : 'w-[42%]'"
        class="bg-muted/30 flex flex-col min-h-0"
      >
        <div class="flex-1 overflow-y-auto px-12 pt-5 pb-6">
          <h1 class="text-2xl font-medium text-foreground tracking-[0.07px] mb-1">
            {{ stepTitle }}
          </h1>
          <p class="text-base text-muted-foreground tracking-[-0.31px] mb-6">
            {{ stepSubtitle }}
          </p>

          <div class="mb-8">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-muted-foreground tracking-[-0.15px]">
                Крок {{ currentStep }} з {{ totalSteps }}
              </span>
              <span class="text-sm text-muted-foreground tracking-[-0.15px]">
                {{ progressPercent }}%
              </span>
            </div>
            <div class="h-2 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all duration-300"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>

          <RouterView />
        </div>

        <div class="shrink-0 px-12 py-6 border-t border-border">
          <div class="flex items-start gap-3">
            <button
              v-if="!isFirstStep"
              class="h-[50px] px-6 border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
              @click="goBack"
            >
              Назад
            </button>
            <button
              :disabled="!store.isCurrentStepValid"
              class="h-[50px] px-6 bg-primary text-primary-foreground rounded-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all text-base font-medium"
              @click="goNext"
            >
              {{ isLastStep ? 'Завершено' : 'Далі' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: Preview (hidden on full-width steps) -->
      <div v-if="!isFullWidth" class="w-[58%] bg-white pt-12 px-12 pb-12 overflow-y-auto">

        <!-- Step 1 Preview -->
        <template v-if="currentStep === 1">
          <div v-if="hasGeo || hasDate || hasLinkedProduct" class="flex flex-col gap-6">
            <div
              v-if="hasGeo"
              class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                  <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium tracking-[-0.44px]">Географія бренду</h3>
              </div>
              <p class="text-2xl tracking-[0.07px]">
                {{ brandBasics.geo.join(', ') }}
              </p>
            </div>

            <div
              v-if="hasDate"
              class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                  <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 2v4" /><path d="M16 2v4" />
                    <rect width="18" height="18" x="3" y="4" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium tracking-[-0.44px]">Плануєма дата запуску</h3>
              </div>
              <p class="text-2xl tracking-[0.07px]">
                {{ formatDate(brandBasics.launchDate) }}
              </p>
            </div>

            <div
              v-if="hasLinkedProduct"
              class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                  <svg class="size-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium tracking-[-0.44px]">Опис бренду</h3>
              </div>
              <p class="text-2xl tracking-[0.07px]">
                {{ brandBasics.linkedProduct }}
              </p>
            </div>
          </div>

          <div v-else class="flex items-center justify-center h-96">
            <div class="text-center text-muted-foreground">
              <svg
                class="size-16 mx-auto mb-4 opacity-30"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <p>Почніть заповнювати інформацію про бренд</p>
            </div>
          </div>
        </template>

        <!-- Step 2 Preview: Mode -->
        <template v-else-if="currentStep === 2">
          <div v-if="store.stepData?.mode" class="flex flex-col gap-6">
            <div class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8">
              <div class="flex items-center gap-3 mb-6">
                <svg v-if="store.stepData.mode === 'dark'" class="size-8 text-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <svg v-else class="size-8 text-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <h3 class="text-xl font-medium tracking-[-0.45px]">
                  {{ store.stepData.mode === 'dark' ? 'Dark Mode' : 'Light Mode' }}
                </h3>
              </div>
              <p class="text-muted-foreground text-base tracking-[-0.31px] mb-6">
                {{ store.stepData.mode === 'dark'
                  ? 'Ваш бренд використовує темну тему - сучасний та елегантний підхід'
                  : 'Ваш бренд використовує світлу тему - чистий та легкий підхід'
                }}
              </p>
              <div class="flex gap-4">
                <div
                  class="flex-1 h-[124px] rounded-[14px] border-2 p-6"
                  :class="store.stepData.mode === 'dark'
                    ? 'bg-[#101828] border-[#364153]'
                    : 'bg-[#f8f9fa] border-[#e5e7eb]'"
                >
                  <div class="h-4 rounded w-24 mb-3" :class="store.stepData.mode === 'dark' ? 'bg-[#364153]' : 'bg-[#d1d5db]'" />
                  <div class="h-3 rounded w-full mb-2" :class="store.stepData.mode === 'dark' ? 'bg-[#1e2939]' : 'bg-[#e5e7eb]'" />
                  <div class="h-3 rounded w-3/4" :class="store.stepData.mode === 'dark' ? 'bg-[#1e2939]' : 'bg-[#e5e7eb]'" />
                </div>
                <div
                  class="flex-1 h-[124px] rounded-[14px] border-2 p-6"
                  :class="store.stepData.mode === 'dark'
                    ? 'bg-[#101828] border-[#364153]'
                    : 'bg-[#f8f9fa] border-[#e5e7eb]'"
                >
                  <div class="size-12 rounded-full mb-3" :class="store.stepData.mode === 'dark' ? 'bg-[#364153]' : 'bg-[#d1d5db]'" />
                  <div class="h-3 rounded w-20" :class="store.stepData.mode === 'dark' ? 'bg-[#1e2939]' : 'bg-[#e5e7eb]'" />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex items-center justify-center h-96">
            <div class="text-center text-muted-foreground">
              <div class="flex gap-4 justify-center mb-4">
                <svg class="size-16 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <svg class="size-16 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </div>
              <p>Оберіть тему для вашого бренду</p>
            </div>
          </div>
        </template>

        <!-- Step 6 Preview -->
        <template v-else-if="currentStep === 6">
          <!-- Brand card (Figma base + REDO) -->
          <div class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] flex">
            <!-- Concept image -->
            <div class="w-[192px] h-[192px] rounded-[10px] overflow-hidden bg-muted shrink-0 m-6">
              <img
                v-if="selectedConcept?.visual_url"
                :src="getAssetUrl(selectedConcept.visual_url)"
                :alt="selectedConcept.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-muted-foreground">
                <svg class="size-10 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            </div>

            <!-- Right info column -->
            <div class="flex-1 flex flex-col justify-center py-6 pr-6 gap-3">
              <!-- REDO 1: Concept name + buttons -->
              <div v-if="selectedConcept">
                <p class="text-xs text-muted-foreground mb-1 leading-4">Концепт</p>
                <p class="text-base font-medium text-foreground leading-6 tracking-[-0.31px] mb-2">{{ selectedConcept.name }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="h-7 px-3 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                    @click="openConceptDetails"
                  >
                    Переглянути деталі
                  </button>
                  <button
                    type="button"
                    class="h-7 px-3 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                    @click="router.push('/constructor/step/3')"
                  >
                    Редагувати
                  </button>
                </div>
              </div>

              <!-- REDO 1: External naming(s) with domain -->
              <template v-if="selectedExternalNamings.length > 0">
                <div v-for="(naming, idx) in selectedExternalNamings" :key="naming.id">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                    </svg>
                    <span class="text-xs text-muted-foreground leading-4">Зовнішня назва{{ selectedExternalNamings.length > 1 ? ` ${idx + 1}` : '' }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="text-base font-medium text-foreground leading-6 tracking-[-0.31px]">{{ naming.name }}</p>
                    <span v-if="getExternalDomain(naming) !== '—'" class="text-sm text-muted-foreground">{{ getExternalDomain(naming) }}</span>
                    <span v-if="getExternalPrice(naming) !== '—'" class="text-sm text-muted-foreground">{{ getExternalPrice(naming) }}</span>
                  </div>
                  <button
                    type="button"
                    class="h-7 px-3 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                    @click="router.push('/constructor/step/4')"
                  >
                    Редагувати
                  </button>
                </div>
              </template>
              <div v-else>
                <div class="flex items-center gap-2 mb-1">
                  <svg class="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                  </svg>
                  <span class="text-xs text-muted-foreground leading-4">Зовнішня назва</span>
                </div>
                <p class="text-base font-medium text-muted-foreground leading-6 tracking-[-0.31px]">—</p>
              </div>

              <!-- Internal naming + REDO 2: Редагувати -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <svg class="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                  <span class="text-xs text-muted-foreground leading-4">Внутрішня назва</span>
                </div>
                <p class="text-base font-medium leading-6 tracking-[-0.31px] mb-1" :class="selectedInternalNaming ? 'text-foreground' : 'text-muted-foreground'">
                  {{ selectedInternalNaming?.name || store.stepData.internalNaming.newNamingFeedback || '—' }}
                </p>
                <button
                  v-if="selectedInternalNaming || store.stepData.internalNaming.newNamingFeedback"
                  type="button"
                  class="h-7 px-3 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                  @click="router.push('/constructor/step/5')"
                >
                  Редагувати
                </button>
              </div>
            </div>
          </div>

          <!-- REDO 3: Briefs for new items (not from library) -->
          <div v-if="store.stepData.concept.newConceptBrief || store.stepData.externalNaming.newNamingBrief || store.stepData.internalNaming.newNamingFeedback" class="mt-6 flex flex-col gap-4">
            <!-- New concept brief -->
            <div v-if="store.stepData.concept.newConceptBrief" class="bg-[#f3f3f5] border border-black/10 rounded-[14px] p-5">
              <p class="text-sm font-medium text-foreground mb-3">Бриф нового концепту</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
                  @click="detailConcept = null"
                >
                  Переглянути бриф
                </button>
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                  @click="router.push('/constructor/step/3')"
                >
                  Редагувати
                </button>
              </div>
            </div>

            <!-- New external naming brief -->
            <div v-if="store.stepData.externalNaming.newNamingBrief" class="bg-[#f3f3f5] border border-black/10 rounded-[14px] p-5">
              <p class="text-sm font-medium text-foreground mb-3">Бриф нового External Naming</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
                >
                  Переглянути бриф
                </button>
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                  @click="router.push('/constructor/step/4')"
                >
                  Редагувати
                </button>
              </div>
            </div>

            <!-- New internal naming brief -->
            <div v-if="store.stepData.internalNaming.newNamingFeedback && !selectedInternalNaming" class="bg-[#f3f3f5] border border-black/10 rounded-[14px] p-5">
              <p class="text-sm font-medium text-foreground mb-3">Бриф нової Internal Naming</p>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
                >
                  Переглянути бриф
                </button>
                <button
                  type="button"
                  class="h-8 px-4 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all"
                  @click="router.push('/constructor/step/5')"
                >
                  Редагувати
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Step 9 Preview: iPhone with layered Visual Components -->
        <template v-else-if="currentStep === 9">
          <div class="flex flex-col items-center justify-center h-full">
            <div class="flex items-center gap-2 mb-6 text-muted-foreground">
              <svg class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
              </svg>
              <span class="text-sm">iPhone 16 Plus Preview</span>
            </div>
            <div class="relative" style="width: 311.25px; height: 632.25px;">
              <!-- iPhone frame -->
              <div class="absolute inset-0" style="z-index: 0;">
                <img
                  src="/assets/iphone-16-plus-light.png"
                  alt="iPhone frame"
                  class="object-cover"
                  style="width: 311.25px; height: 632.25px;"
                />
              </div>
              <!-- Screen content area -->
              <div class="absolute overflow-hidden" style="left: 9px; top: 9px; width: 288.75px; height: 614.25px; z-index: 10;">
                <!-- Empty state -->
                <div
                  v-if="!hasStep9Selections"
                  class="h-full flex items-center justify-center p-6 text-center bg-white/90 backdrop-blur-sm rounded-[40px]"
                >
                  <div>
                    <svg class="size-12 text-muted-foreground mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                    </svg>
                    <p class="text-sm text-muted-foreground">
                      {{ store.stepData.visualComponents.delegateToDesigners
                        ? 'Вибір компонентів делеговано дизайнерам'
                        : 'Оберіть компоненти щоб побачити превʼю'
                      }}
                    </p>
                  </div>
                </div>
                <!-- Layered components -->
                <div v-else class="relative w-full h-full overflow-hidden rounded-[40px]">
                  <!-- Component layers -->
                  <div
                    v-for="layer in step9SelectedLayers"
                    :key="layer.typeId"
                    class="absolute transition-opacity duration-300"
                    :style="{
                      left: layer.slot.left,
                      top: layer.slot.top,
                      width: layer.slot.width,
                      height: layer.slot.height,
                      zIndex: layer.slot.zIndex,
                    }"
                  >
                    <img
                      :src="layer.url"
                      :alt="layer.typeId"
                      :class="layer.slot.contain ? 'w-full h-full object-contain' : 'w-full h-full object-cover'"
                    />
                  </div>
                  <!-- Sidebar close button (REDO) -->
                  <button
                    v-if="hasSidebarSelected"
                    class="absolute flex items-center justify-center size-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                    :style="{ right: '8px', top: '42px', zIndex: 35 }"
                    :title="step9SidebarVisible ? 'Сховати сайдбар' : 'Показати сайдбар'"
                    @click="toggleSidebarPreview"
                  >
                    <svg v-if="step9SidebarVisible" class="size-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                    <svg v-else class="size-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M9 3v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Step 10 Preview: Brand summary card + iPhone -->
        <template v-else-if="currentStep === 10">
          <div class="space-y-8">
            <!-- Brand summary card -->
            <div class="p-6 bg-card border border-black/10 rounded-xl shadow-lg flex gap-6">
              <div class="relative w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
                <img
                  v-if="selectedConcept?.visual_url"
                  :src="getAssetUrl(selectedConcept.visual_url)"
                  :alt="selectedConcept.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-muted-foreground">
                  <svg class="size-10 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 flex flex-col justify-center space-y-4">
                <div class="flex flex-col gap-3">
                  <div v-if="selectedExternalNamings.length > 0 || store.stepData.externalNaming.newNamingBrief">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="size-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                      </svg>
                      <span class="text-xs text-muted-foreground">Зовнішня назва</span>
                    </div>
                    <p class="font-medium text-lg">
                      {{ selectedExternalNamings.length > 0 ? selectedExternalNamings.map(n => n.name).join(', ') : 'Новий неймінг (бриф)' }}
                    </p>
                  </div>
                  <div v-if="selectedInternalNaming || store.stepData.internalNaming.newNamingFeedback">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="size-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
                      </svg>
                      <span class="text-xs text-muted-foreground">Внутрішня назва</span>
                    </div>
                    <p class="font-medium">
                      {{ selectedInternalNaming?.name || store.stepData.internalNaming.newNamingFeedback }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- iPhone mockup -->
            <div class="flex flex-col items-center">
              <div class="relative" style="width: 207.5px; height: 421.5px;">
                <img
                  src="/assets/iphone-16-plus-light.png"
                  alt="iPhone frame"
                  class="absolute inset-0 object-cover"
                  style="width: 207.5px; height: 421.5px; z-index: 0;"
                />
                <div class="absolute overflow-hidden" style="left: 6px; top: 6px; width: 192.5px; height: 409.5px; z-index: 10;">
                  <div
                    v-if="!hasStep9Selections"
                    class="h-full flex items-center justify-center p-4 text-center bg-white/90 backdrop-blur-sm rounded-[27px]"
                  >
                    <p class="text-xs text-muted-foreground">Оберіть компоненти на кроці 9</p>
                  </div>
                  <div v-else class="relative w-full h-full overflow-hidden rounded-[40px]" style="transform: scale(0.667); transform-origin: top left; width: 288.75px; height: 614.25px;">
                    <div
                      v-for="layer in step10SelectedLayers"
                      :key="layer.typeId"
                      class="absolute"
                      :style="{
                        left: layer.slot.left,
                        top: layer.slot.top,
                        width: layer.slot.width,
                        height: layer.slot.height,
                        zIndex: layer.slot.zIndex,
                      }"
                    >
                      <img
                        :src="layer.url"
                        :alt="layer.typeId"
                        :class="layer.slot.contain ? 'w-full h-full object-contain' : 'w-full h-full object-cover'"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Other steps: generic placeholder -->
        <template v-else>
          <div class="flex items-center justify-center h-96">
            <div class="text-center text-muted-foreground">
              <svg
                class="size-16 mx-auto mb-4 opacity-30"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                <path d="M20 3v4" /><path d="M22 5h-4" />
                <path d="M4 17v2" /><path d="M5 18H3" />
              </svg>
              <p>Превʼю буде доступне після реалізації цього кроку</p>
            </div>
          </div>
        </template>
      </div>

      <ConceptDetailOverlay
        v-if="detailConcept"
        :concept="detailConcept"
        @close="detailConcept = null"
        @select="router.push('/constructor/step/3')"
      />
    </div>
  </div>
</template>
