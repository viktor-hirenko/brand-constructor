<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import { useConstructorStore } from '@/stores/constructor'

interface BrandPreviewPanelProps {
  /** Optional brand title rendered above the previews. */
  title?: string
  /** Optional subtitle (e.g. status caption). */
  subtitle?: string | null
}

withDefaults(defineProps<BrandPreviewPanelProps>(), {
  title: '',
  subtitle: null,
})

const store = useConstructorStore()
const { loadVariants, buildLayers, hasSelections, hasSidebarSelected } = useBrandPreviewLayers()

const mainLayers = computed(() => buildLayers(true))
const sidebarLayers = computed(() => buildLayers(false))

onMounted(loadVariants)

watch(
  () => store.stepData?.visualComponents?.selections,
  () => loadVariants(),
  { deep: true }
)
</script>

<template>
  <aside class="w-full h-full flex flex-col gap-6 px-6 py-8 overflow-y-auto bg-[#fafafa]">
    <header v-if="title || subtitle" class="space-y-1">
      <h2 v-if="title" class="text-lg font-medium tracking-[-0.45px] text-foreground">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="text-sm text-muted-foreground">{{ subtitle }}</p>
    </header>

    <div class="flex items-start justify-center gap-6 flex-1 min-h-0">
      <!-- Main view: no sidebar -->
      <div class="flex flex-col items-center gap-3">
        <div class="relative" style="width: 207.5px; height: 421.5px">
          <img
            src="/assets/iphone-16-plus-light.png"
            alt="iPhone preview without sidebar"
            class="absolute inset-0 object-cover"
            style="width: 207.5px; height: 421.5px; z-index: 0"
          />
          <div
            class="absolute overflow-hidden"
            style="left: 6px; top: 6px; width: 192.5px; height: 409.5px; z-index: 10"
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
              style="
                transform: scale(0.667);
                transform-origin: top left;
                width: 288.75px;
                height: 614.25px;
              "
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
        <span class="text-xs text-muted-foreground">Main</span>
      </div>

      <!-- Sidebar view: same layers + sidebar overlay (when selected) -->
      <div class="flex flex-col items-center gap-3">
        <div class="relative" style="width: 207.5px; height: 421.5px">
          <img
            src="/assets/iphone-16-plus-light.png"
            alt="iPhone preview with sidebar"
            class="absolute inset-0 object-cover"
            style="width: 207.5px; height: 421.5px; z-index: 0"
          />
          <div
            class="absolute overflow-hidden"
            style="left: 6px; top: 6px; width: 192.5px; height: 409.5px; z-index: 10"
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
              style="
                transform: scale(0.667);
                transform-origin: top left;
                width: 288.75px;
                height: 614.25px;
              "
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
        <span class="text-xs text-muted-foreground">
          {{ hasSidebarSelected ? 'Sidebar' : 'Main (Sidebar не обрано)' }}
        </span>
      </div>
    </div>
  </aside>
</template>
