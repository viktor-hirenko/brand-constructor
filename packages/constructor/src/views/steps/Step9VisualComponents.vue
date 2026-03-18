<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { getAssetUrl, getAuthHeader } from '@/composables/useApi'
import type { ComponentType, ComponentVariant } from '@brand-constructor/shared/types'

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
  {
    id: 'ct_theme',
    name: 'Theme',
    description: 'Light or dark color theme',
    sort_order: 6,
    created_at: '',
    emoji: '🎭',
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
    message: string
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
        message: `<b>${typeA?.name || ''}</b> <b>${varA?.name || ''}</b> і <b>${typeB?.name || ''}</b> <b>${varB?.name || ''}</b> конфліктують між собою. Змініть один із варіантів, щоб продовжити.`,
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
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/components/types`, {
      headers: getAuthHeader(),
    })
    if (response.ok) {
      const json = await response.json()
      const types = (json.data || []) as ComponentType[]
      if (types.length > 0) {
        componentTypes.value = types
          .map(t => ({
            ...t,
            emoji: COMPONENT_EMOJIS[t.name] || '📦',
          }))
          .sort((a, b) => (DISPLAY_ORDER[a.id] ?? 99) - (DISPLAY_ORDER[b.id] ?? 99))
        await Promise.all(types.map(type => loadVariantsForType(type.id)))
        isLoadingTypes.value = false
        return
      }
    }
  } catch {
    // API unavailable — use offline fallback (types only, no fake variants)
  }

  componentTypes.value = FALLBACK_TYPES
  isLoadingTypes.value = false
}

async function loadVariantsForType(typeId: string) {
  loadingVariants.value[typeId] = true
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants?status=active`,
      { headers: getAuthHeader() }
    )
    if (response.ok) {
      const json = await response.json()
      variantsByType.value[typeId] = json.data?.variants || []
    }
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
        <svg
          class="size-6 text-primary shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          />
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
          <path d="M4 17v2" />
          <path d="M5 18H3" />
        </svg>
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

    <!-- Loading State -->
    <div v-if="isLoadingTypes" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>

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
            <svg
              v-if="
                selections[type.id] &&
                hasConflicts &&
                conflicts.some(c => c.message.includes(type.name))
              "
              class="size-5 text-[#d97706]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <svg
            class="size-5 text-foreground transition-transform duration-200"
            :class="{ 'rotate-180': openAccordionId === type.id }"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
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
                      <svg
                        class="size-6 opacity-30"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-foreground tracking-[-0.15px]">{{
                        variant.name
                      }}</span>
                      <svg
                        v-if="selections[type.id] === variant.id"
                        class="size-5 text-foreground"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
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
          <svg
            class="size-6 text-[#d97706] shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <span class="text-base font-medium text-foreground tracking-[-0.31px]"
            >Несумісні компоненти</span
          >
        </div>
        <p
          v-for="(conflict, idx) in conflicts"
          :key="idx"
          class="text-base text-foreground/80 tracking-[-0.31px] leading-6"
          v-html="conflict.message"
        />
      </div>
    </div>

    <!-- Comment -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <svg
          class="size-4 text-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
        <span class="text-base font-medium text-foreground tracking-[-0.31px]">Коментар</span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

    <!-- Delegate Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDelegateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="cancelDelegate" />
        <div class="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div class="flex justify-center mb-4">
            <svg
              class="size-10 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
              />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
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
