<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import { useConstructorStore } from '@/stores/constructor'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const store = useConstructorStore()
const { loadVariants, buildLayers, hasSelections } = useBrandPreviewLayers()

const mainLayers = computed(() => buildLayers(true))
const sidebarLayers = computed(() => buildLayers(false))

onMounted(loadVariants)

watch(() => Object.keys(store.stepData?.visualComponents?.selections ?? {}).join(','), loadVariants)
</script>

<template>
  <aside class="relative w-full h-full flex flex-col gap-6 overflow-y-auto bg-white">
    <header class="space-y-1">
      <h2
        class="text-lg font-medium tracking-[-0.45px] text-foreground inline-flex items-center gap-2"
      >
        <SparklesIcon class="size-6 shrink-0 text-[#5B5B62]" />
        <span class="text-[20px]">Превʼю</span>
      </h2>
    </header>

    <div class="flex items-start justify-center gap-6 flex-1 min-h-0">
      <!-- Main view: no sidebar -->
      <div class="flex flex-col items-center">
        <div class="relative" style="width: 311.25px; height: 632.25px">
          <img
            src="/assets/iphone-16-plus-light.png"
            alt="iPhone preview without sidebar"
            class="absolute inset-0 object-cover"
            style="width: 311.25px; height: 632.25px; z-index: 0"
          />
          <div
            class="absolute overflow-hidden"
            style="width: 288.75px; height: 614.25px; left: 9px; top: 9px; z-index: 10"
          >
            <div
              v-if="!hasSelections"
              class="h-full flex items-center justify-center p-4 text-center bg-white/90 rounded-[27px]"
            >
              <p class="text-xs text-muted-foreground">Компоненти ще не обрано</p>
            </div>
            <div
              v-else
              class="relative w-full h-full overflow-hidden rounded-[40px]"
              style="width: 288.75px; height: 614.25px"
            >
              <div
                v-for="layer in mainLayers"
                :key="layer.typeId"
                class="absolute"
                :style="{
                  left: layer.slot.left,
                  top: layer.slot.top,
                  width: layer.slot.width,
                  height: layer.slot.height,
                  zIndex: layer.slot.zIndex,
                }"
              >
                <img
                  :src="layer.url"
                  :alt="layer.typeId"
                  :class="
                    layer.slot.contain
                      ? 'w-full h-full object-contain'
                      : 'w-full h-full object-cover'
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar view -->
      <div class="flex flex-col items-center">
        <div class="relative" style="width: 311.25px; height: 632.25px">
          <img
            src="/assets/iphone-16-plus-light.png"
            alt="iPhone preview with sidebar"
            class="absolute inset-0 object-cover"
            style="width: 311.25px; height: 632.25px; z-index: 0"
          />
          <div
            class="absolute overflow-hidden"
            style="left: 6px; top: 6px; width: 288.75px; height: 614.25px; z-index: 10"
          >
            <div
              v-if="!hasSelections"
              class="h-full flex items-center justify-center p-4 text-center bg-white/90 rounded-[27px]"
            >
              <p class="text-xs text-muted-foreground">Компоненти ще не обрано</p>
            </div>
            <div
              v-else
              class="relative w-full h-full overflow-hidden rounded-[40px]"
              style="width: 288.75px; height: 614.25px"
            >
              <div
                v-for="layer in sidebarLayers"
                :key="layer.typeId"
                class="absolute"
                :style="{
                  left: layer.slot.left,
                  top: layer.slot.top,
                  width: layer.slot.width,
                  height: layer.slot.height,
                  zIndex: layer.slot.zIndex,
                }"
              >
                <img
                  :src="layer.url"
                  :alt="layer.typeId"
                  :class="
                    layer.slot.contain
                      ? 'w-full h-full object-contain'
                      : 'w-full h-full object-cover'
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
