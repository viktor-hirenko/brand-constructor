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
    <p class="text-muted-foreground text-base">
      Оберіть пакет для запуску вашого бренду
    </p>

    <!-- Loading: pixel-matched skeleton (no spinner — avoids CLS). -->
    <MarketingPackageGridSkeleton v-if="showSkeleton" :count="3" />

    <!-- Error -->
    <UiAsyncState v-else-if="error" :message="error" @retry="loadPackages" />

    <!-- Package Cards Grid -->
    <template v-else>
      <div v-if="packages.length > 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="relative rounded-[14px] overflow-hidden border-2 transition-all cursor-pointer"
          :class="[
            selectedId === pkg.id
              ? 'border-[#030213] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] bg-[rgba(3,2,19,0.05)]'
              : 'border-black/10 bg-white hover:border-primary/50',
          ]"
          @click="selectPackage(pkg)"
        >
          <div class="p-6 flex flex-col min-h-[280px] h-full">
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
            <div class="flex items-start gap-3 mb-4">
              <div
                class="size-12 rounded-[10px] flex items-center justify-center shrink-0"
                :class="selectedId === pkg.id ? 'bg-primary/10' : 'bg-[rgba(3,2,19,0.1)]'"
              >
                <ShieldCheckIcon
                  v-if="pkg.number === 1"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <UsersThreeIcon
                  v-else-if="pkg.number === 2"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <StarIcon
                  v-else-if="pkg.number === 3"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <NewspaperClippingIcon
                  v-else-if="pkg.number === 4"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <TrophyIcon
                  v-else-if="pkg.number === 5"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <GlobeHemisphereWestIcon
                  v-else-if="pkg.number === 6"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
                <PackageIcon
                  v-else
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                />
              </div>
              <h3 class="text-lg font-medium text-foreground mt-2.5">
                {{ pkg.name }}
              </h3>
            </div>

            <!-- Timeline -->
            <div class="space-y-3 flex-1">
              <div class="p-3 rounded-[10px] bg-[rgba(236,236,240,0.5)]">
                <div class="flex items-center gap-2 mb-1">
                  <ClockIcon class="size-4 text-muted-foreground" />
                  <span class="text-xs text-muted-foreground">Строки впровадження</span>
                </div>
                <p class="text-sm font-medium text-foreground">
                  {{ pkg.timeline }}
                </p>
              </div>

              <!-- Features -->
              <div class="p-3 rounded-[10px] bg-[rgba(236,236,240,0.5)]">
                <p class="text-xs text-muted-foreground mb-2">Опис пакета</p>
                <ul class="flex flex-col gap-1.5">
                  <li
                    v-for="(feature, idx) in parseFeatures(pkg.components_list)"
                    :key="idx"
                    class="flex items-center gap-2 text-xs"
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

            <!-- Detail button (pinned to bottom) -->
            <button
              class="mt-4 w-full py-2.5 rounded-[10px] border border-black/10 hover:bg-black/[0.02] transition-colors flex items-center justify-center gap-2 text-sm"
              @click="openDetail(pkg, $event)"
            >
              <EyeIcon class="size-4" />
              Переглянути
            </button>
          </div>

          <!-- Selected checkmark badge -->
          <div
            v-if="selectedId === pkg.id"
            class="absolute top-3 left-3 size-8 rounded-full bg-[#030213] flex items-center justify-center shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
          >
            <CheckIcon class="size-5 text-white" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16 text-muted-foreground">
        <PackageIcon class="size-16 mx-auto mb-4 opacity-30" />
        <p>PR пакети не знайдено</p>
      </div>
    </template>

    <!-- Коментар -->
    <StepCommentField v-model="comment" />

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
