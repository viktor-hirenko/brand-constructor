<script setup lang="ts">
import { computed } from 'vue';
import { useConstructorStore } from '@/stores/constructor';

const store = useConstructorStore();

const selectedMode = computed(() => store.stepData.mode);

function selectMode(mode: 'light' | 'dark') {
  store.setMode(mode);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-muted-foreground text-base tracking-[-0.31px]">
      Оберіть основну тему вашого бренду
    </p>

    <div class="grid grid-cols-2 gap-6">
      <!-- Light Mode -->
      <button
        type="button"
        class="relative p-8 rounded-[14px] border-2 transition-all text-center"
        :class="selectedMode === 'light'
          ? 'border-primary bg-primary/5'
          : 'border-black/10 bg-input hover:border-primary/50'"
        @click="selectMode('light')"
      >
        <div v-if="selectedMode === 'light'" class="absolute top-4 right-4 size-6 bg-primary rounded-full flex items-center justify-center">
          <svg class="size-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div class="flex flex-col items-center gap-4">
          <div class="size-16 rounded-full flex items-center justify-center bg-muted">
            <svg class="size-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" /><path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium tracking-[-0.44px] mb-1">Light Mode</h3>
            <p class="text-sm text-muted-foreground font-medium tracking-[-0.15px]">
              Світла тема для денного використання
            </p>
          </div>
        </div>
      </button>

      <!-- Dark Mode -->
      <button
        type="button"
        class="relative p-8 rounded-[14px] border-2 transition-all text-center"
        :class="selectedMode === 'dark'
          ? 'border-primary bg-primary/5'
          : 'border-black/10 bg-input hover:border-primary/50'"
        @click="selectMode('dark')"
      >
        <div v-if="selectedMode === 'dark'" class="absolute top-4 right-4 size-6 bg-primary rounded-full flex items-center justify-center">
          <svg class="size-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div class="flex flex-col items-center gap-4">
          <div class="size-16 rounded-full flex items-center justify-center bg-primary/10">
            <svg class="size-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium tracking-[-0.44px] mb-1">Dark Mode</h3>
            <p class="text-sm text-muted-foreground font-medium tracking-[-0.15px]">
              Темна тема для нічного використання
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
