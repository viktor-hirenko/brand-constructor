<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useConstructorStore } from '@/stores/constructor';

const router = useRouter();
const store = useConstructorStore();

const brandId = computed(() => store.brandId ?? '—');
const createdDate = computed(() => {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
});

function handleNewBrief() {
  store.reset();
  router.push('/constructor/step/1');
}

function handleGoHome() {
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div class="w-full max-w-lg text-center">
      <div class="bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-12">
        <div class="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg class="size-8 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 class="text-2xl font-medium text-foreground mb-2">Бриф успішно створено!</h1>
        <p class="text-muted-foreground mb-8">Ваш бриф збережено та готовий до роботи.</p>

        <div class="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">ID брифу</span>
            <span class="text-sm font-mono font-medium">{{ brandId }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">Дата створення</span>
            <span class="text-sm font-medium">{{ createdDate }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            class="w-full h-[50px] bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-all text-base font-medium"
            @click="handleNewBrief"
          >
            Створити новий бриф
          </button>
          <button
            class="w-full h-[50px] border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
            @click="handleGoHome"
          >
            Повернутись на головну
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
