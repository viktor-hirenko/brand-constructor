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
import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeSlashIcon from '@/components/icons/EyeSlashIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import MagicWandIcon from '@/components/icons/MagicWandIcon.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import UiAlert from '@/components/ui/UiAlert.vue'
import UiAccordion from '@/components/ui/UiAccordion.vue'
import UiAccordionItem from '@/components/ui/UiAccordionItem.vue'
import UiAccordionOption from '@/components/ui/UiAccordionOption.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiToggle from '@/components/ui/UiToggle.vue'
import {
  UI_ACCORDION_HEADER_ACTION_CLASS,
  UI_ACCORDION_ACTION_ICON_CLASS,
} from '@/components/ui/uiAccordion'

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

/**
 * The Sidebar row's eye — DP-15450 `visual components 4`.
 *
 * «Прибрати інтерактивний хрестик і окрему кнопку в preview. Додати eye /
 * eye-off біля рядка Sidebar для показу/приховування компонента. Хрестик у PNG
 * лишити неінтерактивним.» The control used to float over the phone in the
 * right column; `5382:33712` draws it in this row, between the `Type A` badge
 * and the chevron.
 *
 * It appears only once a Sidebar variant is picked, which is the same
 * condition the floating button had: with nothing picked there is no layer to
 * show or hide. The preview itself lives in `BriefShellView`, so the state
 * comes through the injected context — see `visualComponentPreviewContext.ts`.
 */
const canToggleSidebarPreview = computed(
  () => previewContext !== null && !isDelegated.value && Boolean(selections.value[SIDEBAR_TYPE_ID]),
)

/**
 * **The glyph names the STATE, not the action, and that is her drawing rather
 * than our inference.** Both of her step-7 screens agree: `5382:33712` shows
 * the Sidebar layer over the phone with a plain eye in this row, and
 * `5382:64114` shows the phone without it and a crossed eye. The floating
 * button this replaces read the other way round — it showed a crossed eye
 * while the sidebar WAS visible, i.e. it named what clicking would do.
 */
const isSidebarPreviewVisible = computed(() => previewContext?.sidebarVisible.value ?? true)

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
    <!--
      Delegate row — kit `Designer mode` `5382:57235`, measured 24.09
      (divergences row 43). The row is 527x56, WHITE on a 1px `#eaeaeb`
      border at radius 16 — not the grey `#f3f3f5` box at radius 10 that
      stood here. The glyph sits in a 48x48 `bg/alt-3` `#eaeaeb` square inset
      4 from the row, so that square's radius is the row's 16 minus the inset
      = 12. Text opens at x=68 (4 + 48 + 16) and the toggle ends 16 from the
      right edge: `p-1 pr-4` plus `gap-4` prints exactly that.

      Letter-spacing dropped — the kit sets 0 on `body/medium`, and open
      question 7 only defends tracking on screens a phase is NOT rewriting.
    -->
    <!--
      Inner 1px stroke, black while the choice is delegated — `Designer mode`
      on `5382:70251` is 56 tall with `#030213` inside. It was a grey border
      outside the 56 in both states (58, no black). Owner 30.09.
    -->
    <div
      :class="[
        'overflow-hidden rounded-2xl outline outline-1 -outline-offset-1',
        isDelegated ? 'outline-primary' : 'outline-ink-300',
      ]"
    >
      <button
        class="flex h-14 w-full items-center gap-4 bg-white p-1 pr-4 transition-colors hover:bg-ink-100"
        @click="handleDelegateToggle"
      >
        <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-300">
          <MagicWandIcon class="size-6 text-ink-900" />
        </span>
        <span class="flex-1 text-left text-base font-medium text-ink-900">
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

    <!--
      The accordions and the incompatibility alert share one box, because the
      kit puts them in one: `Container` `5382:57241` holds the accordion list
      (ends at y=512) and the `Alert` (opens at y=528) — a gap of **16**, not
      the 24 the outer column hands everything else. The container itself sits
      24 under the delegate row and 24 over the comment field, which is what
      the outer `gap-6` already gives.
    -->
    <div class="flex flex-col gap-4">
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

          <!-- Kit slot `Visibility Icon` `I5382:33737;5352:37363` — a bare 16
               glyph 8 from the badge and 8 from the chevron. Its own button,
               because the row's header is no longer one. -->
          <template v-if="type.id === SIDEBAR_TYPE_ID && canToggleSidebarPreview" #actions>
            <button
              type="button"
              :class="UI_ACCORDION_HEADER_ACTION_CLASS"
              :aria-pressed="isSidebarPreviewVisible"
              :title="isSidebarPreviewVisible ? 'Сховати сайдбар' : 'Показати сайдбар'"
              :aria-label="isSidebarPreviewVisible ? 'Сховати сайдбар' : 'Показати сайдбар'"
              @click="previewContext?.toggleSidebarPreview()"
            >
              <EyeIcon
                v-if="isSidebarPreviewVisible"
                :class="UI_ACCORDION_ACTION_ICON_CLASS"
              />
              <EyeSlashIcon v-else :class="UI_ACCORDION_ACTION_ICON_CLASS" />
            </button>
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

      <!--
        Incompatibility warning — kit `Alert` instance `5382:57256`, 527x112.
        `get_variable_defs` returns `alert/bg/warning` #fefbe9,
        `alert/border/warning` #e9c162, `alert/icon/warning` #ab6400, title
        `header/s` 18/24 medium #1f1f2e, description `body/regular` 16/24
        #6f6f7d, `radius/alert` 16 — byte for byte `UiAlert type="warning"`.
        What stood here was a hand-rolled `#fff8dc` box at radius 10 with a
        `#d97706` triangle: three hexes the kit does not contain (row 13).

        The two conflicting names are amber `#ab6400` (`--color-warning`) at
        the description's regular weight — owner 29.09 against `5382:57226`:
        colour, not bold. The triangle goes —
        `AlertTriangleIcon` has no kit pair (row 32), while `UiAlert`'s own
        glyph is the Phosphor WarningCircle Fill the kit actually draws.
      -->
      <UiAlert v-if="hasConflicts && !isDelegated" type="warning" title="Несумісні компоненти">
        <p v-for="(conflict, idx) in conflicts" :key="idx">
          <span class="text-warning" data-test="conflict-name">{{ conflict.titleA }}</span>
          і
          <span class="text-warning" data-test="conflict-name">{{ conflict.titleB }}</span>
          конфліктують між собою. Змініть один із варіантів, щоб продовжити.
        </p>
      </UiAlert>
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
