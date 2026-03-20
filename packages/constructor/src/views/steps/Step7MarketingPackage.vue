<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import { useApiList } from '@/composables/useApi'
import type { PrPackage } from '@brand-constructor/shared/types'

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
  if (detailPackage.value) {
    store.setMarketingPackage({ selectedId: detailPackage.value.id })
  }
  closeDetail()
}

function loadPackages() {
  perPage.value = 50
  fetchData({ status: 'active' })
}

onMounted(loadPackages)
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-muted-foreground text-base tracking-[-0.31px]">
      Оберіть пакет для запуску вашого бренду
    </p>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 text-red-500">
      <p>{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 bg-primary text-white rounded-[10px] text-sm"
        @click="loadPackages"
      >
        Спробувати знову
      </button>
    </div>

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
            <!-- Header: Icon + Name -->
            <div class="flex items-start gap-3 mb-4">
              <div
                class="size-12 rounded-[10px] flex items-center justify-center shrink-0"
                :class="selectedId === pkg.id ? 'bg-primary/10' : 'bg-[rgba(3,2,19,0.1)]'"
              >
                <!-- Zap -->
                <svg
                  v-if="pkg.number === 1"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                  />
                </svg>
                <!-- Rocket -->
                <svg
                  v-else-if="pkg.number === 2"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
                  />
                  <path
                    d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
                  />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
                <!-- Crown -->
                <svg
                  v-else-if="pkg.number === 3"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
                  />
                  <path d="M5 21h14" />
                </svg>
                <!-- Star -->
                <svg
                  v-else-if="pkg.number === 4"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
                  />
                </svg>
                <!-- Trophy -->
                <svg
                  v-else-if="pkg.number === 5"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                <!-- Sparkles -->
                <svg
                  v-else-if="pkg.number === 6"
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
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
                <!-- Default: Package -->
                <svg
                  v-else
                  class="size-6"
                  :class="selectedId === pkg.id ? 'text-primary' : 'text-muted-foreground'"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
                  />
                  <path d="M12 22V12" />
                  <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-foreground tracking-[-0.44px] mt-2.5">
                {{ pkg.name }}
              </h3>
            </div>

            <!-- Timeline -->
            <div class="space-y-3 flex-1">
              <div class="p-3 rounded-[10px] bg-[rgba(236,236,240,0.5)]">
                <div class="flex items-center gap-2 mb-1">
                  <svg
                    class="size-4 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span class="text-xs text-muted-foreground">Строки впровадження</span>
                </div>
                <p class="text-sm font-medium text-foreground tracking-[-0.15px]">
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
                    <svg
                      v-if="feature.included"
                      class="size-3 text-primary shrink-0"
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
                    <svg
                      v-else
                      class="size-3 text-muted-foreground shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
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
              <svg
                class="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Переглянути
            </button>
          </div>

          <!-- Selected checkmark badge -->
          <div
            v-if="selectedId === pkg.id"
            class="absolute top-3 left-3 size-8 rounded-full bg-[#030213] flex items-center justify-center shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
          >
            <svg
              class="size-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-16 text-muted-foreground">
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
          <path
            d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
          />
          <path d="M12 22V12" />
          <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
        </svg>
        <p>PR пакети не знайдено</p>
      </div>
    </template>

    <!-- Коментар -->
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
        <span class="text-base font-medium text-foreground tracking-[-0.31px]"> Коментар </span>
      </div>
      <textarea
        v-model="comment"
        rows="3"
        class="w-full px-4 py-3 bg-[#f3f3f5] border border-transparent rounded-[10px] resize-none text-base tracking-[-0.31px] placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Додайте ваші коментарі або побажання..."
      />
    </div>

    <!-- Detail Overlay -->
    <Teleport to="body">
      <div v-if="detailPackage" class="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDetail" />
        <div
          class="relative bg-white rounded-[14px] shadow-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto p-8"
        >
          <button
            class="absolute top-4 right-4 size-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            @click="closeDetail"
          >
            <svg
              class="size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <h2 class="text-2xl font-medium text-foreground tracking-[0.07px] mb-2 pr-10">
            {{ detailPackage.name }}
          </h2>
          <p class="text-muted-foreground text-base tracking-[-0.31px] mb-6">
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
                  <svg
                    v-if="feature.included"
                    class="size-3 text-primary shrink-0"
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
                  <svg
                    v-else
                    class="size-3 text-muted-foreground shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span :class="feature.included ? 'text-foreground' : 'text-muted-foreground'">
                    {{ feature.name }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 h-[50px] bg-primary text-primary-foreground rounded-[10px] font-medium hover:opacity-90 transition-all"
              @click="selectFromDetail"
            >
              Обрати пакет
            </button>
            <button
              class="h-[50px] px-6 border border-black/10 text-foreground rounded-[10px] font-medium hover:bg-black/[0.02] transition-all"
              @click="closeDetail"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
