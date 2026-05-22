<script setup lang="ts">
import { ref, computed } from 'vue';
import { GEO_COUNTRIES, type GeoOption } from '@/data/geo-countries';
import CloseIcon from '@/components/icons/CloseIcon.vue'
import CheckIcon from '@/components/icons/CheckIcon.vue';

const model = defineModel<string[]>({ required: true });

const isOpen = ref(false);
const search = ref('');
const containerRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const popularGeos = computed(() =>
  GEO_COUNTRIES.filter((g) => g.popular),
);
const otherGeos = computed(() =>
  GEO_COUNTRIES.filter((g) => !g.popular),
);

function matchesSearch(geo: GeoOption): boolean {
  if (!search.value) return true;
  const q = search.value.toLowerCase();
  return geo.code.toLowerCase().includes(q) || geo.name.toLowerCase().includes(q);
}

const popularFiltered = computed(() => popularGeos.value.filter(matchesSearch));
const otherFiltered = computed(() => otherGeos.value.filter(matchesSearch));
const hasResults = computed(() => popularFiltered.value.length > 0 || otherFiltered.value.length > 0);

function isSelected(code: string): boolean {
  return model.value.includes(code);
}

function toggleGeo(code: string) {
  if (isSelected(code)) {
    model.value = model.value.filter((c) => c !== code);
  } else {
    model.value = [...model.value, code];
  }
}

function removeGeo(code: string) {
  model.value = model.value.filter((c) => c !== code);
}

function openDropdown() {
  isOpen.value = true;
  search.value = '';
}

// Click-outside handled by backdrop overlay
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- Trigger area -->
    <div
      class="w-full px-3 py-2.5 bg-input border border-black/10 rounded-[10px] flex items-center gap-2 flex-wrap min-h-[50px] cursor-text transition-all"
      :class="isOpen ? 'ring-2 ring-primary/20' : ''"
      @click="openDropdown(); searchInputRef?.focus()"
    >
      <span
        v-for="code in model"
        :key="code"
        class="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-md text-sm font-medium"
      >
        {{ code }}
        <button
          class="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
          @click.stop="removeGeo(code)"
        >
          <CloseIcon class="size-3.5" :stroke-width="2.5" />
        </button>
      </span>
      <input
        ref="searchInputRef"
        v-model="search"
        type="text"
        :placeholder="model.length === 0 ? 'Наприклад: UK, DE, PT' : 'Пошук...'"
        class="flex-1 min-w-[80px] bg-transparent outline-none text-base placeholder:text-foreground/50"
        @focus="openDropdown"
      />
    </div>

    <!-- Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 top-full left-0 w-full mt-1.5 bg-white border border-black/10 rounded-[10px] shadow-lg max-h-[280px] overflow-y-auto"
      >
        <template v-if="hasResults">
          <!-- Popular -->
          <div v-if="popularFiltered.length" class="p-1.5">
            <div class="text-xs font-medium text-muted-foreground px-2.5 py-1.5 uppercase tracking-wider">
              Популярні
            </div>
            <button
              v-for="geo in popularFiltered"
              :key="geo.code"
              class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors"
              :class="isSelected(geo.code) ? 'bg-primary/5 text-primary' : 'hover:bg-black/[0.03]'"
              @click="toggleGeo(geo.code)"
            >
              <span class="text-sm">
                <span class="font-medium">{{ geo.code }}</span>
                <span class="text-muted-foreground ml-1.5">{{ geo.name }}</span>
              </span>
              <CheckIcon
                v-if="isSelected(geo.code)"
                class="size-4 text-primary shrink-0"
              />
            </button>
          </div>

          <!-- Divider -->
          <div v-if="popularFiltered.length && otherFiltered.length" class="border-t border-black/5" />

          <!-- Other -->
          <div v-if="otherFiltered.length" class="p-1.5">
            <div class="text-xs font-medium text-muted-foreground px-2.5 py-1.5 uppercase tracking-wider">
              Інші
            </div>
            <button
              v-for="geo in otherFiltered"
              :key="geo.code"
              class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors"
              :class="isSelected(geo.code) ? 'bg-primary/5 text-primary' : 'hover:bg-black/[0.03]'"
              @click="toggleGeo(geo.code)"
            >
              <span class="text-sm">
                <span class="font-medium">{{ geo.code }}</span>
                <span class="text-muted-foreground ml-1.5">{{ geo.name }}</span>
              </span>
              <CheckIcon
                v-if="isSelected(geo.code)"
                class="size-4 text-primary shrink-0"
              />
            </button>
          </div>
        </template>

        <div v-else class="p-4 text-center text-sm text-muted-foreground">
          Нічого не знайдено
        </div>
      </div>
    </Transition>
  </div>
</template>
