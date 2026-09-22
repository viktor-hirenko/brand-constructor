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
import AlertTriangleIcon from '@/components/icons/AlertTriangleIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import UiAccordion from '@/components/ui/UiAccordion.vue'
import UiAccordionItem from '@/components/ui/UiAccordionItem.vue'
import UiAccordionOption from '@/components/ui/UiAccordionOption.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiToggle from '@/components/ui/UiToggle.vue'

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
        <!--
          Kit toggle `3764:6920`, decorative: the whole row is the button, and
          the row's click may open the confirmation modal. Before phase 14 this
          was nested divs at 56×28 with a ⌀24 thumb, its own off colour and a
          30 travel. See `ui/uiToggle.ts` for the measured kit numbers.
        -->
        <UiToggle :model-value="isDelegated" decorative />
      </button>
    </div>

    <!-- Loading State: pixel-matched skeleton (no spinner — avoids CLS).
         Default count=5 mirrors the filtered (non-Theme) list rendered below. -->
    <VisualComponentsAccordionSkeleton v-if="isLoadingTypes" />

    <!-- Component Accordions — kit `3839:12607` (section) + `3839:12381` (row) -->
    <UiAccordion v-else :disabled="isDelegated">
      <UiAccordionItem
        v-for="type in componentTypes"
        :key="type.id"
        :title="type.name"
        :open="openAccordionId === type.id"
        @toggle="toggleAccordion(type.id)"
      >
        <!--
          Badge chip with the picked variant; amber while the pair conflicts.
          Kit badge `3453:1619` — the redrawn Visual Components canvas
          (`5382:36912`) uses the same two tones, so only the recipe moved.
        -->
        <template v-if="getSelectedVariantLabel(type.id)" #badge>
          <UiBadge
            :tone="isTypeInConflict(type.id) ? 'amber' : 'neutral'"
            :label="getSelectedVariantLabel(type.id) ?? ''"
          >
            <template v-if="isTypeInConflict(type.id)" #leading>
              <InfoCircleFilledIcon class="size-4 shrink-0" />
            </template>
          </UiBadge>
        </template>

        <UiAccordionOption
          v-for="variant in variantsByType[type.id] || []"
          :key="variant.id"
          :preview="getVariantDisplay(type.id, variant.id)?.letter ?? ''"
          :title="getVariantDisplay(type.id, variant.id)?.label ?? ''"
          :description="getIncompatibilityCaption(type.id, variant.id)"
          :selected="selections[type.id] === variant.id"
          @select="selectVariant(type.id, variant.id)"
        >
          <template v-if="selections[type.id] === variant.id" #trailing="{ iconClass }">
            <CheckIcon :class="iconClass" />
          </template>
        </UiAccordionOption>

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
      </UiAccordionItem>
    </UiAccordion>

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
