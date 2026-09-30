<script setup lang="ts">
/**
 * A library picture (concept, gallery) that never shows half-loaded — see
 * `uiAssetImage.ts` for why and which copy it asks for.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { getAssetUrl } from '@/composables/useApi'
import {
  UI_ASSET_IMAGE_FADE_CLASS,
  resolveUiAssetImageSources,
  resolveUiAssetImageStateClass,
  type UiAssetImageSize,
} from './uiAssetImage'

const props = withDefaults(
  defineProps<{
    /** `file_url` as stored (`/api/assets/…`) or any absolute URL. */
    src: string
    alt?: string
    size?: UiAssetImageSize
    loading?: 'lazy' | 'eager'
  }>(),
  { alt: '', size: 'small', loading: 'lazy' },
)

const emit = defineEmits<{ load: [event: Event] }>()

const sources = computed(() => resolveUiAssetImageSources(getAssetUrl(props.src), props.size))
const currentSrc = ref(sources.value.src)
const loaded = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

watch(sources, next => {
  currentSrc.value = next.src
  loaded.value = false
})

function reveal() {
  loaded.value = true
}

function handleLoad(event: Event) {
  emit('load', event)
  const img = event.target as HTMLImageElement
  const src = currentSrc.value
  // Wait for the decode as well: a loaded-but-undecoded picture can still be
  // painted in strips on a slow device.
  Promise.resolve(img.decode?.())
    .catch(() => {})
    .finally(() => {
      if (currentSrc.value === src) reveal()
    })
}

function handleError() {
  const { fallback } = sources.value
  if (fallback && currentSrc.value !== fallback) currentSrc.value = fallback
}

onMounted(() => {
  // Already in the browser cache: no load event races the first paint.
  const img = imgRef.value
  if (img?.complete && img.naturalWidth > 0) reveal()
})
</script>

<template>
  <img
    ref="imgRef"
    :src="currentSrc"
    :alt="alt"
    :loading="loading"
    decoding="async"
    :class="[UI_ASSET_IMAGE_FADE_CLASS, resolveUiAssetImageStateClass(loaded)]"
    @load="handleLoad"
    @error="handleError"
  />
</template>
