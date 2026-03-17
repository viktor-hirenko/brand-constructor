<script setup lang="ts">
import type { Concept } from '@brand-constructor/shared/types';
import { getAssetUrl } from '@/composables/useApi';

interface Props {
  concept: Concept;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  select: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] bg-white overflow-hidden flex flex-col">
      <!-- Sticky header: per Figma h-[65px], bg-white/80 backdrop-blur, border-b -->
      <header class="sticky top-0 z-10 bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-black/10 shrink-0">
        <div class="flex items-center justify-between h-16 px-14">
          <!-- Left: name + tag -->
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold leading-[27px] tracking-[-0.44px] text-[#0a0a0a]">
              {{ concept.name }}
            </h3>
            <span
              v-if="concept.description"
              class="h-7 px-3 bg-[rgba(3,2,19,0.1)] rounded-full text-sm leading-5 tracking-[-0.15px] text-[#030213] flex items-center"
            >
              {{ concept.description.length > 40 ? concept.description.slice(0, 40) + '…' : concept.description }}
            </span>
          </div>

          <!-- Right: select button + close -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="h-11 px-6 bg-[#030213] text-white rounded-[10px] text-base font-medium leading-6 tracking-[-0.31px] hover:opacity-90 transition-all"
              @click="emit('select')"
            >
              Обрати концепт
            </button>
            <button
              type="button"
              class="size-10 rounded-full bg-[#ececf0] flex items-center justify-center hover:bg-[#dddde2] transition-colors"
              @click="emit('close')"
            >
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-[896px] mx-auto px-6 pt-12 pb-20">
          <!-- Concept name -->
          <h1 class="text-2xl font-medium leading-9 tracking-[0.07px] text-[#0a0a0a] mb-6">
            {{ concept.name }}
          </h1>

          <!-- Main hero image -->
          <div
            v-if="concept.visual_url"
            class="w-full aspect-[848/640] rounded-2xl overflow-hidden mb-10"
          >
            <img
              :src="getAssetUrl(concept.visual_url)"
              :alt="concept.name"
              class="w-full h-full object-contain"
              loading="lazy"
            />
          </div>

          <!-- Опис концепту -->
          <div v-if="concept.description" class="mb-10">
            <h3 class="text-lg font-medium leading-[27px] tracking-[-0.44px] text-[#0a0a0a] mb-3">
              Опис концепту
            </h3>
            <p class="text-lg leading-[29.25px] tracking-[-0.44px] text-[#717182]">
              {{ concept.description }}
            </p>
          </div>

          <!-- Графічні елементи (logo) -->
          <div v-if="concept.logo_url" class="mb-10">
            <h3 class="text-lg font-medium leading-[27px] tracking-[-0.44px] text-[#0a0a0a] mb-6">
              Графічні елементи
            </h3>
            <div class="flex flex-col gap-6">
              <div class="w-full rounded-2xl overflow-hidden">
                <img
                  :src="getAssetUrl(concept.logo_url)"
                  alt="Graphic elements"
                  class="w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <!-- Мобільна версія (preview as mobile mockup) -->
          <div v-if="concept.preview_url" class="mb-10">
            <h3 class="text-lg font-medium leading-[27px] tracking-[-0.44px] text-[#0a0a0a] mb-6">
              Мобільна версія
            </h3>
            <div class="flex justify-center">
              <div class="relative">
                <!-- iPhone frame -->
                <div class="bg-[#101828] rounded-[48px] border-[14px] border-[#101828] overflow-hidden w-[375px]">
                  <img
                    :src="getAssetUrl(concept.preview_url)"
                    alt="Mobile preview"
                    class="w-full object-contain"
                    loading="lazy"
                  />
                  <!-- Notch -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-[#101828] rounded-b-3xl" />
                </div>
              </div>
            </div>
          </div>

          <!-- Веб версія -->
          <div v-if="concept.preview_url" class="mb-10">
            <h3 class="text-lg font-medium leading-[27px] tracking-[-0.44px] text-[#0a0a0a] mb-6">
              Веб версія
            </h3>
            <div class="bg-[#ececf0] rounded-2xl overflow-hidden">
              <!-- Browser toolbar -->
              <div class="flex items-center gap-6 h-[49px] pl-4 pr-8 bg-[rgba(113,113,130,0.1)] border-b border-black/10">
                <div class="flex gap-1.5">
                  <div class="size-3 rounded-full bg-[rgba(251,44,54,0.8)]" />
                  <div class="size-3 rounded-full bg-[rgba(240,177,0,0.8)]" />
                  <div class="size-3 rounded-full bg-[rgba(0,201,80,0.8)]" />
                </div>
                <div class="flex-1 h-6 bg-white rounded pl-3 flex items-center">
                  <span class="text-xs text-[#717182]">brandname.com</span>
                </div>
              </div>
              <!-- Web content -->
              <div class="flex items-start justify-center">
                <img
                  :src="getAssetUrl(concept.preview_url)"
                  alt="Web preview"
                  class="w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
