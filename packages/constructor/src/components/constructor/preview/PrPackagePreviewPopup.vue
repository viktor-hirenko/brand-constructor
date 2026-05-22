<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import type { PrPackage } from '@brand-constructor/shared/types'
import { useConstructorStore } from '@/stores/constructor'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ClockIcon from '@/components/icons/ClockIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'

interface PrPackagePreviewPopupProps {
  pkg: PrPackage | null
}

const props = defineProps<PrPackagePreviewPopupProps>()

const store = useConstructorStore()

interface PackageFeature {
  name: string
  included: boolean
}

function parseFeatures(componentsList: string | null | undefined): PackageFeature[] {
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

const features = computed<PackageFeature[]>(() =>
  parseFeatures(props.pkg?.components_list ?? null)
)

function handleClose() {
  store.closePrPackagePreview()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') handleClose()
}

watch(
  () => !!props.pkg,
  open => {
    if (typeof document === 'undefined') return
    if (open) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div
    v-if="pkg"
    class="flex flex-col h-full w-full bg-white px-6 pt-6 pb-6 gap-6"
    role="dialog"
    aria-modal="true"
    :aria-label="`Перегляд пакету ${pkg.name}`"
  >
    <header class="flex items-start justify-between gap-4 shrink-0">
      <div class="min-w-0 flex-1">
        <h2
          class="text-[24px] font-medium leading-8 tracking-[-0.4492px] text-[#0a0a0a] truncate"
        >
          {{ pkg.name }}
        </h2>
        <p
          v-if="pkg.description"
          class="mt-2 text-base text-muted-foreground tracking-[-0.31px]"
        >
          {{ pkg.description }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center size-12 shrink-0 rounded-full bg-[#f9f9fb] text-[#141B34] hover:bg-[#ececf0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8c7cc]"
        aria-label="Закрити"
        @click="handleClose"
      >
        <CloseIcon class="size-6" :stroke-width="1.5" />
      </button>
    </header>

    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
      <div v-if="pkg.timeline" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <div class="flex items-center gap-2 mb-1">
          <ClockIcon class="size-4 text-muted-foreground shrink-0" />
          <p class="text-xs text-muted-foreground">Строки впровадження</p>
        </div>
        <p class="text-sm font-medium text-foreground tracking-[-0.15px]">
          {{ pkg.timeline }}
        </p>
      </div>

      <div v-if="pkg.goals" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <p class="text-xs text-muted-foreground mb-1">Цілі</p>
        <p class="text-sm whitespace-pre-line text-foreground">{{ pkg.goals }}</p>
      </div>

      <div v-if="pkg.requirements" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <p class="text-xs text-muted-foreground mb-1">Вимоги</p>
        <p class="text-sm whitespace-pre-line text-foreground">
          {{ pkg.requirements }}
        </p>
      </div>

      <div v-if="pkg.teams_involved" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <p class="text-xs text-muted-foreground mb-1">Задіяні команди</p>
        <p class="text-sm whitespace-pre-line text-foreground">
          {{ pkg.teams_involved }}
        </p>
      </div>

      <div v-if="pkg.expenses" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <p class="text-xs text-muted-foreground mb-1">Витрати</p>
        <p class="text-sm whitespace-pre-line text-foreground">{{ pkg.expenses }}</p>
      </div>

      <div v-if="features.length > 0" class="p-4 bg-[#f3f3f5] rounded-[10px]">
        <p class="text-xs text-muted-foreground mb-2">Компоненти пакету</p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="(feature, idx) in features"
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
  </div>
</template>
