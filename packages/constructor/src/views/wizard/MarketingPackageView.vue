<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { PrPackage } from '@brand-constructor/shared/types'
import MarketingPackageGridSkeleton from '@/components/constructor/skeletons/MarketingPackageGridSkeleton.vue'
import StepCommentField from '@/components/constructor/fields/StepCommentField.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ClockIcon from '@/components/icons/ClockIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import GlobeHemisphereWestIcon from '@/components/icons/GlobeHemisphereWestIcon.vue'
import NewspaperClippingIcon from '@/components/icons/NewspaperClippingIcon.vue'
import PackageIcon from '@/components/icons/PackageIcon.vue'
import ShieldCheckIcon from '@/components/icons/ShieldCheckIcon.vue'
import StarIcon from '@/components/icons/StarIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'
import UsersThreeIcon from '@/components/icons/UsersThreeIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import SelectionPillBadge from '@/components/ui/SelectionPillBadge.vue'
import UiAsyncState from '@/components/ui/UiAsyncState.vue'
import { resolveUiIconButtonClasses } from '@/components/ui/uiIconButton'
import {
  MARKETING_PACKAGE_CARD_BODY_CLASS,
  MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS,
  MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS,
  MARKETING_PACKAGE_CARD_CLASS,
  MARKETING_PACKAGE_CARD_CONTENT_CLASS,
  MARKETING_PACKAGE_CARD_FEATURE_CROSS_CLASS,
  MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS,
  MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS,
  MARKETING_PACKAGE_CARD_HEADER_CLASS,
  MARKETING_PACKAGE_CARD_ICON_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_ROW_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS,
  MARKETING_PACKAGE_CARD_TILE_CLASS,
  MARKETING_PACKAGE_CARD_TITLE_CLASS,
  MARKETING_PACKAGE_COMMENT_WIDTH_CLASS,
  MARKETING_PACKAGE_GRID_CLASS,
} from '@/constants/marketingPackageCard'

/**
 * Step 5 against the drawn screen `Marketing Package (step 5)` `5411:37221`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37221&m=dev
 *
 * Every number of the card lives in `constants/marketingPackageCard.ts`.
 *
 * The screen has no right panel: `Step panel` `5411:37227` is the full 1230 and
 * the `Divider` beside it is a node of width 0. `BriefShellView` already knew
 * that — step 5 is in its `isFullWidth` list.
 *
 * `Frame 2087327397` `5658:38999` stacks the grid (ending at y = 1116) and the
 * comment Input (y = 1140) at `spacing/24`, so the comment field opts out of
 * its own 8 with `flush`.
 */

const store = useConstructorStore()
const {
  data: packages,
  loading,
  error,
  fetchData,
  perPage,
} = useApiList<PrPackage>('/api/pr-packages')

const comment = computed({
  get: () => store.stepData.marketingPackage.comment,
  set: (val: string) => store.setMarketingPackage({ comment: val }),
})

const selectedId = computed(() => store.stepData.marketingPackage.selectedId)
const detailPackage = ref<PrPackage | null>(null)

const isDetailPackageSelected = computed(
  () => detailPackage.value !== null && detailPackage.value.id === selectedId.value,
)

interface PackageFeature {
  name: string
  included: boolean
}

function selectPackage(pkg: PrPackage) {
  const newId = selectedId.value === pkg.id ? null : pkg.id
  store.setMarketingPackage({ selectedId: newId })
}

function parseFeatures(componentsList: string): PackageFeature[] {
  if (!componentsList) return []
  try {
    const parsed = JSON.parse(componentsList)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return componentsList
      .split('\n')
      .filter(line => line.trim())
      .map(line => ({
        name: line.replace(/^[+-]\s*/, '').trim(),
        included: line.trim().startsWith('+'),
      }))
  }
}

function openDetail(pkg: PrPackage, event: Event) {
  event.stopPropagation()
  detailPackage.value = pkg
}

function closeDetail() {
  detailPackage.value = null
}

function selectFromDetail() {
  if (!detailPackage.value || isDetailPackageSelected.value) return
  store.setMarketingPackage({ selectedId: detailPackage.value.id })
  closeDetail()
}

/**
 * The selected mark. She draws six unselected cards and the kit has no Selected
 * variant for this frame, so selection keeps the mark the wizard already uses
 * for exactly this job on the concept cards — the kit icon button Solid S-32,
 * rendered decoratively because the card itself is the control.
 */
const selectedMarkClasses = resolveUiIconButtonClasses({
  variant: 'solid',
  size: 'S',
  decorative: true,
})

const hasFetched = ref(false)
const showSkeleton = computed(() => !hasFetched.value || loading.value)

async function loadPackages() {
  perPage.value = 50
  await fetchData({ status: 'active' })
  hasFetched.value = true
}

onMounted(loadPackages)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!--
      No second subtitle here. `Step header` `5411:37230` carries the whole
      caption — "Оберіть пакет для запуску вашого бренду." — and this view used
      to print a copy of it right underneath, so the screen said it twice. The
      one sentence now lives in the router meta. Same fix as row 74 made on the
      step 7 heading.
    -->

    <!-- Loading: pixel-matched skeleton (no spinner — avoids CLS). -->
    <MarketingPackageGridSkeleton v-if="showSkeleton" :count="3" />

    <!-- Error -->
    <UiAsyncState v-else-if="error" :message="error" @retry="loadPackages" />

    <!-- Package Cards Grid -->
    <template v-else>
      <div v-if="packages.length > 0" :class="MARKETING_PACKAGE_GRID_CLASS">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="relative"
          :class="[
            MARKETING_PACKAGE_CARD_CLASS,
            selectedId === pkg.id
              ? MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS
              : MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS,
          ]"
          @click="selectPackage(pkg)"
        >
          <div :class="MARKETING_PACKAGE_CARD_CONTENT_CLASS">
            <!--
              Header: Icon + Name.

              The designer's mapping table (`5658:39246`, section
              WIZARD — SEMANTIC ICONS) assigns these six glyphs by PACKAGE NAME,
              not by ours: Trust Focus → ShieldCheck, Social Trust → UsersThree,
              Full Reputation → Star, Media Reputation → NewspaperClipping,
              Brand Excellence → Trophy, Total Market Presence →
              GlobeHemisphereWest. Names map to `number` 1..6 in the packages
              table, so the switch stays on `number` — that is the field the
              wizard actually receives. Rename a package in admin and the glyph
              follows the slot, not the name; see divergence row 31.
            -->
            <div :class="MARKETING_PACKAGE_CARD_HEADER_CLASS">
              <div :class="MARKETING_PACKAGE_CARD_TILE_CLASS">
                <ShieldCheckIcon
                  v-if="pkg.number === 1"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <UsersThreeIcon
                  v-else-if="pkg.number === 2"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <StarIcon
                  v-else-if="pkg.number === 3"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <NewspaperClippingIcon
                  v-else-if="pkg.number === 4"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <TrophyIcon
                  v-else-if="pkg.number === 5"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <GlobeHemisphereWestIcon
                  v-else-if="pkg.number === 6"
                  :class="MARKETING_PACKAGE_CARD_ICON_CLASS"
                />
                <PackageIcon v-else :class="MARKETING_PACKAGE_CARD_ICON_CLASS" />
              </div>
              <h3 :class="MARKETING_PACKAGE_CARD_TITLE_CLASS">
                {{ pkg.name }}
              </h3>
            </div>

            <div :class="MARKETING_PACKAGE_CARD_BODY_CLASS">
              <!-- Timeline -->
              <div :class="MARKETING_PACKAGE_CARD_PANEL_CLASS">
                <div :class="MARKETING_PACKAGE_CARD_PANEL_ROW_CLASS">
                  <ClockIcon :class="MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS" />
                  <span :class="MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS">
                    Строки впровадження
                  </span>
                </div>
                <p :class="MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS">
                  {{ pkg.timeline }}
                </p>
              </div>

              <!--
                Components. She draws this as a plain disc list with no
                include/exclude distinction, and in production every line of
                every package is a `+`. The bullet is hers; the cross stays ours
                for the `-` lines an admin can still author. Divergences row 116.
              -->
              <div :class="MARKETING_PACKAGE_CARD_PANEL_CLASS">
                <p :class="MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS">Опис пакета</p>
                <ul :class="MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS">
                  <li
                    v-for="(feature, idx) in parseFeatures(pkg.components_list)"
                    :key="idx"
                    :class="
                      feature.included ? undefined : MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS
                    "
                  >
                    <template v-if="feature.included">{{ feature.name }}</template>
                    <template v-else>
                      <CloseIcon :class="MARKETING_PACKAGE_CARD_FEATURE_CROSS_CLASS" />
                      <span>{{ feature.name }}</span>
                    </template>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- `Button` Secondary M-40, full width, `Eye` 16 in the left slot. -->
          <UiButton
            variant="secondary"
            size="M"
            class="w-full"
            @click="openDetail(pkg, $event)"
          >
            <template #icon-left="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
            Переглянути
          </UiButton>

          <!-- Selected mark — see `selectedMarkClasses`. -->
          <span
            v-if="selectedId === pkg.id"
            :class="selectedMarkClasses.root"
            class="pointer-events-none absolute top-2 left-2"
          >
            <CheckIcon :class="selectedMarkClasses.icon" />
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16 text-muted-foreground">
        <PackageIcon class="size-16 mx-auto mb-4 opacity-30" />
        <p>PR пакети не знайдено</p>
      </div>
    </template>

    <!-- Коментар -->
    <StepCommentField v-model="comment" :class="MARKETING_PACKAGE_COMMENT_WIDTH_CLASS" flush />

    <!-- Detail Overlay — the wizard modal shell, same as the confirmations -->
    <UiModal v-if="detailPackage" size="md" @close="closeDetail">
      <template #title>
        {{ detailPackage.name }}
        <SelectionPillBadge v-if="isDetailPackageSelected" label="Обраний пакет" />
      </template>

      <div class="marketing-package-detail flex flex-col gap-6">
        <p class="text-muted-foreground text-base">
          {{ detailPackage.description }}
        </p>

        <div class="flex flex-col gap-4">
          <div v-if="detailPackage.timeline" class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-1">Строки впровадження</p>
            <p class="text-sm font-medium">{{ detailPackage.timeline }}</p>
          </div>

          <div v-if="detailPackage.goals" class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-1">Цілі</p>
            <p class="text-sm whitespace-pre-line">{{ detailPackage.goals }}</p>
          </div>

          <div v-if="detailPackage.requirements" class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-1">Вимоги</p>
            <p class="text-sm whitespace-pre-line">{{ detailPackage.requirements }}</p>
          </div>

          <div v-if="detailPackage.teams_involved" class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-1">Задіяні команди</p>
            <p class="text-sm whitespace-pre-line">{{ detailPackage.teams_involved }}</p>
          </div>

          <div v-if="detailPackage.expenses" class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-1">Витрати</p>
            <p class="text-sm whitespace-pre-line">{{ detailPackage.expenses }}</p>
          </div>

          <div class="p-4 bg-[#f3f3f5] rounded-[10px]">
            <p class="text-xs text-muted-foreground mb-2">Компоненти пакету</p>
            <ul class="flex flex-col gap-2">
              <li
                v-for="(feature, idx) in parseFeatures(detailPackage.components_list)"
                :key="idx"
                class="flex items-center gap-2 text-sm"
              >
                <CheckIcon
                  v-if="feature.included"
                  class="size-3 text-primary shrink-0"
                />
                <CloseIcon
                  v-else
                  class="size-3 text-muted-foreground shrink-0"
                />
                <span :class="feature.included ? 'text-foreground' : 'text-muted-foreground'">
                  {{ feature.name }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="!isDetailPackageSelected">
          <UiButton size="L" variant="primary" block @click="selectFromDetail">
            Обрати пакет
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
