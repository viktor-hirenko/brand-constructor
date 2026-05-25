<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { getAssetUrl, apiGet } from '@/composables/useApi'
import type { ComponentType, ComponentVariant } from '@brand-constructor/shared/types'
import VisualComponentsAccordionSkeleton from '@/components/constructor/skeletons/VisualComponentsAccordionSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import AlertTriangleIcon from '@/components/icons/AlertTriangleIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const store = useConstructorStore()

const openAccordionId = ref<string | null>(null)
const showDelegateModal = ref(false)

interface ComponentTypeWithEmoji extends ComponentType {
  emoji: string
}

const COMPONENT_EMOJIS: Record<string, string> = {
  Header: '🎯',
  Banners: '🎨',
  Thumbnails: '🖼️',
  Tabbar: '📱',
  Sidebar: '📋',
  Theme: '🎭',
}

const DISPLAY_ORDER: Record<string, number> = {
  ct_header: 1,
  ct_banners: 2,
  ct_thumbnails: 3,
  ct_tabbar: 4,
  ct_sidebar: 5,
  ct_theme: 6,
}

const FALLBACK_TYPES: ComponentTypeWithEmoji[] = [
  {
    id: 'ct_header',
    name: 'Header',
    description: 'Top header with logo and navigation',
    sort_order: 1,
    created_at: '',
    emoji: '🎯',
  },
  {
    id: 'ct_banners',
    name: 'Banners',
    description: 'Promotional banners displayed on the main page',
    sort_order: 2,
    created_at: '',
    emoji: '🎨',
  },
  {
    id: 'ct_thumbnails',
    name: 'Thumbnails',
    description: 'Game and category thumbnail cards',
    sort_order: 3,
    created_at: '',
    emoji: '🖼️',
  },
  {
    id: 'ct_tabbar',
    name: 'Tabbar',
    description: 'Bottom navigation tab bar',
    sort_order: 4,
    created_at: '',
    emoji: '📱',
  },
  {
    id: 'ct_sidebar',
    name: 'Sidebar',
    description: 'Side navigation panel',
    sort_order: 5,
    created_at: '',
    emoji: '📋',
  },
]

const INCOMPATIBLE_PAIRS: Array<{
  typeIdA: string
  variantNumA: number
  typeIdB: string
  variantNumB: number
}> = [{ typeIdA: 'ct_header', variantNumA: 3, typeIdB: 'ct_tabbar', variantNumB: 2 }]

const componentTypes = ref<ComponentTypeWithEmoji[]>([])
const variantsByType = ref<Record<string, ComponentVariant[]>>({})
const isLoadingTypes = ref(false)
const loadingVariants = ref<Record<string, boolean>>({})

const selections = computed(() => store.stepData.visualComponents.selections)
const isDelegated = computed(() => store.stepData.visualComponents.delegateToDesigners)

const comment = computed({
  get: () => store.stepData.visualComponents.comment,
  set: (val: string) => store.setVisualComponents({ comment: val }),
})

const hasAnySelection = computed(() => Object.keys(selections.value).length > 0)

function getVariantNumber(typeId: string, variantId: string): number | null {
  const variant = variantsByType.value[typeId]?.find(v => v.id === variantId)
  return variant?.variant_number ?? null
}

const conflicts = computed(() => {
  const result: Array<{
    typeAName: string
    variantAName: string
    typeBName: string
    variantBName: string
    typeA: string
    variantA: string
    typeB: string
    variantB: string
  }> = []
  const sel = selections.value

  for (const rule of INCOMPATIBLE_PAIRS) {
    const selA = sel[rule.typeIdA]
    const selB = sel[rule.typeIdB]
    if (!selA || !selB) continue

    const numA = getVariantNumber(rule.typeIdA, selA)
    const numB = getVariantNumber(rule.typeIdB, selB)
    if (numA === rule.variantNumA && numB === rule.variantNumB) {
      const typeA = componentTypes.value.find(t => t.id === rule.typeIdA)
      const typeB = componentTypes.value.find(t => t.id === rule.typeIdB)
      const varA = variantsByType.value[rule.typeIdA]?.find(v => v.id === selA)
      const varB = variantsByType.value[rule.typeIdB]?.find(v => v.id === selB)

      result.push({
        typeAName: typeA?.name || '',
        variantAName: varA?.name || '',
        typeBName: typeB?.name || '',
        variantBName: varB?.name || '',
        typeA: rule.typeIdA,
        variantA: selA,
        typeB: rule.typeIdB,
        variantB: selB,
      })
    }
  }
  return result
})

const hasConflicts = computed(() => conflicts.value.length > 0)

watch(
  conflicts,
  newConflicts => {
    store.setComponentConflicts(
      newConflicts.map(c => ({
        typeA: c.typeA,
        variantA: c.variantA,
        typeB: c.typeB,
        variantB: c.variantB,
      }))
    )
  },
  { immediate: true }
)

function getSelectedVariantName(typeId: string): string | null {
  const variantId = selections.value[typeId]
  if (!variantId) return null
  const variant = variantsByType.value[typeId]?.find(v => v.id === variantId)
  return variant?.name || null
}

function toggleAccordion(typeId: string) {
  openAccordionId.value = openAccordionId.value === typeId ? null : typeId
}

function selectVariant(typeId: string, variantId: string) {
  if (isDelegated.value) return
  const currentSelection = selections.value[typeId]
  if (currentSelection === variantId) {
    store.removeComponentSelection(typeId)
  } else {
    store.setComponentSelection(typeId, variantId)
  }
}

function handleDelegateToggle() {
  if (isDelegated.value) {
    store.toggleDelegateToDesigners(false)
    return
  }

  if (hasAnySelection.value) {
    showDelegateModal.value = true
  } else {
    store.toggleDelegateToDesigners(true)
  }
}

function confirmDelegate() {
  store.resetVisualSelections()
  store.toggleDelegateToDesigners(true)
  showDelegateModal.value = false
  openAccordionId.value = null
}

function cancelDelegate() {
  showDelegateModal.value = false
}

function getThumbnailUrl(variant: ComponentVariant): string {
  if (variant.thumbnail_url) {
    return variant.thumbnail_url.startsWith('http')
      ? variant.thumbnail_url
      : getAssetUrl(variant.thumbnail_url)
  }
  return ''
}

async function loadComponentTypes() {
  isLoadingTypes.value = true
  try {
    const types = await apiGet<ComponentType[]>('/api/components/types')
    if (types && types.length > 0) {
      componentTypes.value = types
        .filter(t => t.id !== 'ct_theme')
        .map(t => ({
          ...t,
          emoji: COMPONENT_EMOJIS[t.name] || '📦',
        }))
        .sort((a, b) => (DISPLAY_ORDER[a.id] ?? 99) - (DISPLAY_ORDER[b.id] ?? 99))
      await Promise.all(types.map(type => loadVariantsForType(type.id)))
      isLoadingTypes.value = false
      return
    }
  } catch {
    // API unavailable — render type list only (no placeholder variants).
  }

  componentTypes.value = FALLBACK_TYPES
  isLoadingTypes.value = false
}

async function loadVariantsForType(typeId: string) {
  loadingVariants.value[typeId] = true
  try {
    const payload = await apiGet<{ variants?: ComponentVariant[] }>(
      `/api/components/types/${typeId}/variants?status=all`
    )
    const variants: ComponentVariant[] = (payload?.variants || []).filter(
      (v: ComponentVariant) => v.status !== 'archived' && v.status !== 'draft'
    )
    variantsByType.value[typeId] = variants.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    variantsByType.value[typeId] = []
  }
  loadingVariants.value[typeId] = false
}

function onAccordionEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.transition = 'height 0.25s ease'
}

function onAccordionAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

function onAccordionLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.overflow = 'hidden'
  htmlEl.offsetHeight
  htmlEl.style.height = '0'
  htmlEl.style.transition = 'height 0.25s ease'
}

function onAccordionAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

onMounted(loadComponentTypes)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Delegate to Designers Toggle -->
    <div class="border border-black/10 rounded-[10px] overflow-hidden">
      <button
        class="w-full px-4 py-3 bg-[#f3f3f5] flex items-center gap-2 hover:bg-[#ececf0] transition-colors"
        @click="handleDelegateToggle"
      >
        <SparklesIcon class="size-6 text-primary shrink-0" />
        <span class="flex-1 text-left text-base font-medium text-foreground tracking-[-0.31px]">
          Довірити вибір дизайнерам
        </span>
        <div
          class="w-14 h-7 rounded-full transition-colors relative shrink-0"
          :class="isDelegated ? 'bg-[#030213]' : 'bg-[#e5e5e7]'"
        >
          <div
            class="absolute top-0.5 size-6 bg-white rounded-full transition-all"
            :class="isDelegated ? 'left-[30px]' : 'left-[2px]'"
          />
        </div>
      </button>
    </div>

    <!-- Loading State: pixel-matched skeleton (no spinner — avoids CLS).
         Default count=5 mirrors the filtered (non-Theme) list rendered below. -->
    <VisualComponentsAccordionSkeleton v-if="isLoadingTypes" />

    <!-- Component Accordions -->
    <div
      v-else
      class="flex flex-col gap-2"
      :class="{ 'opacity-40 pointer-events-none': isDelegated }"
    >
      <div
        v-for="type in componentTypes"
        :key="type.id"
        class="border border-black/10 rounded-[10px] overflow-hidden"
      >
        <!-- Accordion Header -->
        <button
          class="w-full px-4 py-3 bg-[#f3f3f5] flex items-center justify-between hover:bg-[#ececf0] transition-colors"
          @click="toggleAccordion(type.id)"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl leading-7">{{ type.emoji }}</span>
            <span class="text-base font-medium text-foreground tracking-[-0.31px]">{{
              type.name
            }}</span>
            <span
              v-if="getSelectedVariantName(type.id)"
              class="text-sm font-medium text-muted-foreground tracking-[-0.15px]"
            >
              • {{ getSelectedVariantName(type.id) }}
            </span>
            <!-- Conflict indicator on the type header -->
            <AlertTriangleIcon
              v-if="
                selections[type.id] &&
                hasConflicts &&
                conflicts.some(c => c.typeAName === type.name || c.typeBName === type.name)
              "
              class="size-5 text-[#d97706]"
            />
          </div>
          <ChevronDownIcon
            class="size-5 text-foreground transition-transform duration-200"
            :class="{ 'rotate-180': openAccordionId === type.id }"
          />
        </button>

        <!-- Accordion Body (animated) -->
        <Transition
          @enter="onAccordionEnter"
          @after-enter="onAccordionAfterEnter"
          @leave="onAccordionLeave"
          @after-leave="onAccordionAfterLeave"
        >
          <div v-if="openAccordionId === type.id" class="bg-white overflow-hidden">
            <div class="p-3 space-y-2">
              <!-- Variant Items -->
              <button
                v-for="variant in variantsByType[type.id] || []"
                :key="variant.id"
                class="relative w-full p-3 rounded-[10px] border transition-all text-left group"
                :class="
                  selections[type.id] === variant.id
                    ? 'border-[#030213] bg-[rgba(3,2,19,0.05)]'
                    : 'border-black/10 hover:border-primary/50 hover:bg-primary/5'
                "
                @click="selectVariant(type.id, variant.id)"
              >
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-lg overflow-hidden bg-[#ececf0] flex-shrink-0">
                    <img
                      v-if="getThumbnailUrl(variant)"
                      :src="getThumbnailUrl(variant)"
                      :alt="variant.name"
                      class="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-muted-foreground"
                    >
                      <ImagePlaceholderIcon class="size-6 opacity-30" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-foreground tracking-[-0.15px]">{{
                        variant.name
                      }}</span>
                      <CheckIcon
                        v-if="selections[type.id] === variant.id"
                        class="size-5 text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </button>

              <!-- Loading variants -->
              <div v-if="loadingVariants[type.id]" class="flex items-center justify-center py-4">
                <div
                  class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                />
              </div>

              <!-- No variants -->
              <div
                v-if="
                  !loadingVariants[type.id] &&
                  (!variantsByType[type.id] || variantsByType[type.id].length === 0)
                "
                class="py-4 text-center text-sm text-muted-foreground"
              >
                Варіанти поки не додані
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Incompatibility Warning -->
    <div
      v-if="hasConflicts && !isDelegated"
      class="border border-black/10 rounded-[10px] overflow-hidden"
    >
      <div class="bg-[#fff8dc] px-4 py-3">
        <div class="flex items-center gap-3 mb-1">
          <AlertTriangleIcon class="size-6 text-[#d97706] shrink-0" />
          <span class="text-base font-medium text-foreground tracking-[-0.31px]"
            >Несумісні компоненти</span
          >
        </div>
        <p
          v-for="(conflict, idx) in conflicts"
          :key="idx"
          class="text-base text-foreground/80 tracking-[-0.31px] leading-6"
        >
          <span class="font-bold">{{ conflict.typeAName }} {{ conflict.variantAName }}</span>
          і
          <span class="font-bold">{{ conflict.typeBName }} {{ conflict.variantBName }}</span>
          конфліктують між собою. Змініть один із варіантів, щоб продовжити.
        </p>
      </div>
    </div>

    <!-- Comment -->
    <StepCommentField v-model="comment" />

    <!-- Delegate Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDelegateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="cancelDelegate" />
        <div class="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div class="flex justify-center mb-4">
            <SparklesIcon class="size-10 text-primary" />
          </div>
          <h3 class="text-xl font-medium text-foreground tracking-[-0.45px] mb-2">
            Довірити вибір дизайнерам?
          </h3>
          <p class="text-base text-muted-foreground tracking-[-0.31px] mb-6">
            Усі вибрані компоненти буде скинуто. Компоненти визначить дизайн-команда.
          </p>
          <div class="flex gap-3">
            <button
              class="flex-1 h-[50px] border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
              @click="cancelDelegate"
            >
              Скасувати
            </button>
            <button
              class="flex-1 h-[50px] bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-all text-base font-medium"
              @click="confirmDelegate"
            >
              Довірити
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
