<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import { useConstructorStore } from '@/stores/constructor'
import { MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS } from '@/constants/previewLayout'
import VisualComponentsIphoneFrame from '@/components/constructor/preview/VisualComponentsIphoneFrame.vue'
import VisualComponentsPhoneEmptyState from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const store = useConstructorStore()
const { loadVariants, buildLayers } = useBrandPreviewLayers()

const isDelegated = computed(() => store.stepData.visualComponents.delegateToDesigners)

const mainLayers = computed(() => buildLayers(true))
const sidebarLayers = computed(() => buildLayers(false))

onMounted(loadVariants)

watch(() => Object.keys(store.stepData?.visualComponents?.selections ?? {}).join(','), loadVariants)
</script>

<template>
  <aside
    :class="['relative w-full h-full flex flex-col overflow-y-auto bg-white', MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS]"
  >
    <header class="space-y-1">
      <h2
        class="text-lg font-medium tracking-[-0.45px] text-foreground inline-flex items-center gap-2"
      >
        <SparklesIcon class="size-6 shrink-0 text-[#5B5B62]" />
        <span class="text-[20px]">Превʼю</span>
      </h2>
    </header>

    <!-- Delegated: single iPhone + empty state (same mockup as step 7). -->
    <div
      v-if="isDelegated"
      class="flex flex-1 min-h-0 w-full items-center justify-center"
    >
      <VisualComponentsIphoneFrame>
        <VisualComponentsPhoneEmptyState variant="delegated" />
      </VisualComponentsIphoneFrame>
    </div>

    <!-- Normal: dual iPhone — main view + sidebar view. -->
    <div v-else class="flex items-start justify-center gap-[40px] flex-1 min-h-0">
      <div class="flex flex-col items-center">
        <VisualComponentsIphoneFrame>
          <div class="relative w-full h-full overflow-hidden">
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
                class="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </VisualComponentsIphoneFrame>
      </div>

      <div class="flex flex-col items-center">
        <VisualComponentsIphoneFrame>
          <div class="relative w-full h-full overflow-hidden">
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
                class="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </VisualComponentsIphoneFrame>
      </div>
    </div>
  </aside>
</template>
