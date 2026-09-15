<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useVisualComponentPreviewContext } from '@/composables/visualComponentPreviewContext'
import { apiGet } from '@/composables/useApi'
import type { ComponentType, ComponentVariant } from '@brand-constructor/shared/types'
import {
  buildDisplayVariants,
  findVariantConflicts,
  typeHasConflict,
  variantIncompatibilityCaption,
  type CompatibilityContext,
  type DisplayVariant,
} from '@/utils/visualComponentVariants'
import VisualComponentsAccordionSkeleton from '@/components/constructor/skeletons/VisualComponentsAccordionSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import AlertTriangleIcon from '@/components/icons/AlertTriangleIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

const store = useConstructorStore()
const previewContext = useVisualComponentPreviewContext()

const SIDEBAR_TYPE_ID = 'ct_sidebar'

const openAccordionId = ref<string | null>(null)
const showDelegateModal = ref(false)

const DISPLAY_ORDER: Record<string, number> = {
  ct_header: 1,
  ct_banners: 2,
  ct_thumbnails: 3,
  ct_tabbar: 4,
  ct_sidebar: 5,
  ct_theme: 6,
}

const FALLBACK_TYPES: ComponentType[] = [
  {
    id: 'ct_header',
    name: 'Header',
    description: 'Top header with logo and navigation',
    sort_order: 1,
    created_at: '',
  },
  {
    id: 'ct_banners',
    name: 'Banners',
    description: 'Promotional banners displayed on the main page',
    sort_order: 2,
    created_at: '',
  },
  {
    id: 'ct_thumbnails',
    name: 'Thumbnails',
    description: 'Game and category thumbnail cards',
    sort_order: 3,
    created_at: '',
  },
  {
    id: 'ct_tabbar',
    name: 'Tabbar',
    description: 'Bottom navigation tab bar',
    sort_order: 4,
    created_at: '',
  },
  {
    id: 'ct_sidebar',
    name: 'Sidebar',
    description: 'Side navigation panel',
    sort_order: 5,
    created_at: '',
  },
]

const componentTypes = ref<ComponentType[]>([])
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

/**
 * Variants as the accordion shows them: a grey letter tile and a `Type C` label,
 * numbered by display order. The database still calls them `Type 1 … Type 4`;
 * see `visualComponentVariants.ts` for why the letters are derived here.
 */
const displayByType = computed<Record<string, DisplayVariant[]>>(() => {
  const result: Record<string, DisplayVariant[]> = {}
  for (const [typeId, variants] of Object.entries(variantsByType.value)) {
    result[typeId] = buildDisplayVariants(variants)
  }
  return result
})

const compatibilityContext = computed<CompatibilityContext>(() => ({
  displayByType: displayByType.value,
  selections: selections.value,
  typeNames: Object.fromEntries(componentTypes.value.map(type => [type.id, type.name])),
}))

const conflicts = computed(() => findVariantConflicts(compatibilityContext.value))

const hasConflicts = computed(() => conflicts.value.length > 0)

watch(
  conflicts,
  newConflicts => {
    store.setComponentConflicts(
      newConflicts.map(c => ({
        typeA: c.typeIdA,
        variantA: c.variantIdA,
        typeB: c.typeIdB,
        variantB: c.variantIdB,
      }))
    )
  },
  { immediate: true }
)

function getVariantDisplay(typeId: string, variantId: string): DisplayVariant | null {
  return displayByType.value[typeId]?.find(v => v.id === variantId) ?? null
}

/** Label for the badge chip next to the type name, `null` while nothing is picked. */
function getSelectedVariantLabel(typeId: string): string | null {
  const variantId = selections.value[typeId]
  if (!variantId) return null
  return getVariantDisplay(typeId, variantId)?.label ?? null
}

function isTypeInConflict(typeId: string): boolean {
  return typeHasConflict(conflicts.value, typeId)
}

function getIncompatibilityCaption(typeId: string, variantId: string): string | null {
  return variantIncompatibilityCaption(compatibilityContext.value, typeId, variantId)
}

function toggleAccordion(typeId: string) {
  const isClosing = openAccordionId.value === typeId
  openAccordionId.value = isClosing ? null : typeId

  if (!isClosing && typeId === SIDEBAR_TYPE_ID && selections.value[SIDEBAR_TYPE_ID]) {
    previewContext?.restoreSidebarPreview()
  }
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

async function loadComponentTypes() {
  isLoadingTypes.value = true
  try {
    const types = await apiGet<ComponentType[]>('/api/components/types')
    if (types && types.length > 0) {
      componentTypes.value = types
        .filter(t => t.id !== 'ct_theme')
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
          <div class="flex items-center gap-2">
            <span class="text-base font-medium text-foreground tracking-[-0.31px]">{{
              type.name
            }}</span>
            <!--
              Badge chip with the picked variant; amber while the pair conflicts.
              Kit badge `3453:1619` — the redrawn Visual Components canvas
              (`5382:36912`) uses the same two tones, so only the recipe moved.
            -->
            <UiBadge
              v-if="getSelectedVariantLabel(type.id)"
              :tone="isTypeInConflict(type.id) ? 'amber' : 'neutral'"
              :label="getSelectedVariantLabel(type.id) ?? ''"
            >
              <template v-if="isTypeInConflict(type.id)" #leading>
                <InfoCircleFilledIcon class="size-4 shrink-0" />
              </template>
            </UiBadge>
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
            <div class="border-t border-[#ededee]" />
            <div class="p-3 space-y-2">
              <!-- Variant Items -->
              <button
                v-for="variant in variantsByType[type.id] || []"
                :key="variant.id"
                class="relative w-full pl-1 pr-6 py-1 rounded-2xl border transition-colors text-left group"
                :class="
                  selections[type.id] === variant.id
                    ? 'border-[#030213] bg-transparent'
                    : 'border-transparent hover:bg-[#f3f3f5]'
                "
                @click="selectVariant(type.id, variant.id)"
              >
                <div class="flex items-center gap-3">
                  <!-- Letter tile: the design dropped the 64×64 thumbnail picture -->
                  <div
                    class="w-16 h-16 rounded-xl bg-[#ededee] flex-shrink-0 flex items-center justify-center"
                  >
                    <span class="text-2xl leading-8 text-[#95959d]">{{
                      getVariantDisplay(type.id, variant.id)?.letter
                    }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-sm font-medium text-foreground tracking-[-0.15px]">{{
                      getVariantDisplay(type.id, variant.id)?.label
                    }}</span>
                    <span
                      v-if="getIncompatibilityCaption(type.id, variant.id)"
                      class="mt-1 block text-sm text-[#6f6f7d] tracking-[-0.15px]"
                    >
                      {{ getIncompatibilityCaption(type.id, variant.id) }}
                    </span>
                  </div>
                  <CheckIcon
                    v-if="selections[type.id] === variant.id"
                    class="size-5 shrink-0 text-foreground"
                  />
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
          <span class="text-[#ab6400]">{{ conflict.titleA }}</span>
          і
          <span class="text-[#ab6400]">{{ conflict.titleB }}</span>
          конфліктують між собою. Змініть один із варіантів, щоб продовжити.
        </p>
      </div>
    </div>

    <!-- Comment -->
    <StepCommentField v-model="comment" />

    <!-- Delegate Confirmation Modal — the wizard's own confirmation shape -->
    <ConfirmationModal
      v-if="showDelegateModal"
      title="Довірити вибір дизайнерам?"
      body="Усі вибрані компоненти буде скинуто. Компоненти визначить дизайн-команда."
      cancel-label="Скасувати"
      primary-label="Довірити"
      @cancel="cancelDelegate"
      @primary="confirmDelegate"
    />
  </div>
</template>
