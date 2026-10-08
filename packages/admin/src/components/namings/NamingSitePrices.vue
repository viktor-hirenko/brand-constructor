<script lang="ts">
import { ref } from 'vue'

/**
 * The server said the price check is switched off: no window of this session
 * shows the frame again — it would stand empty and vanish on every open.
 */
const off = ref(false)
</script>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import type { NamingPriceSourceReading } from '@brand-constructor/shared'
import { apiPost } from '@/composables/useApi'
import {
  looksLikeDomain,
  sitePricesRows,
  sitePricesState,
  sitePricesSummary,
  type PricePreview,
} from '@/utils/namingPriceCheck'

/**
 * What Afternic, Sedo and Namecheap ask for the domain in the field — right in
 * the create and edit windows. The owner looked for the prices there twice and
 * did not find the card behind the table (08.10). A saved domain shows what
 * the last check stored; a new or changed one is asked about on the spot, and
 * nothing is written until the save.
 *
 * The frame never changes its height: it stands in the window from the start,
 * the three rows are always there, and a skeleton holds the place of what is
 * being asked. The first version grew piece by piece and the window jumped
 * four times while a domain was typed.
 */
const props = defineProps<{
  domain: string
  /** «Автоматично» is chosen: a save writes the price shown. */
  automatic: boolean
  /** Edit: the domain as saved and what the last check read about it. */
  savedDomain?: string | null
  savedSources?: NamingPriceSourceReading[] | null
  /** The domain is free — nobody to buy it from. */
  free?: boolean
}>()

const WAIT_MS = 900
const SWITCHED_OFF = 'Price check is switched off'

const normalized = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()
const saved = computed(() =>
  normalized(props.domain) !== '' && normalized(props.domain) === normalized(props.savedDomain) && props.savedSources?.length
    ? props.savedSources
    : null
)

const loading = ref(false)
const failed = ref(false)
const preview = ref<PricePreview | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let asked = 0

function reset() {
  if (timer) clearTimeout(timer)
  timer = null
  asked++
  loading.value = false
  failed.value = false
  preview.value = null
}

async function ask(domain: string) {
  const mine = ++asked
  try {
    const data = await apiPost<PricePreview | null>('/api/namings/external/preview-price', { domain })
    if (mine !== asked) return
    preview.value = data
    failed.value = data == null
  } catch (e) {
    if (mine !== asked) return
    if (e instanceof Error && e.message === SWITCHED_OFF) off.value = true
    else failed.value = true
  } finally {
    if (mine === asked) loading.value = false
  }
}

watch(
  () => [props.domain, saved.value, props.free] as const,
  () => {
    reset()
    const domain = props.domain.trim()
    if (off.value || props.free || saved.value || !looksLikeDomain(domain)) return
    // The skeleton stands from the first keystroke of a domain, not from the request.
    loading.value = true
    timer = setTimeout(() => void ask(domain), WAIT_MS)
  },
  { immediate: true }
)

onUnmounted(reset)

const state = computed(() =>
  sitePricesState({
    domain: props.domain,
    free: props.free === true,
    saved: saved.value !== null,
    loading: loading.value,
    failed: failed.value,
    ready: preview.value !== null,
  })
)
const summary = computed(() =>
  sitePricesSummary(state.value, { preview: preview.value, automatic: props.automatic, saved: saved.value })
)
const rows = computed(() => sitePricesRows(state.value, saved.value ?? preview.value?.sources ?? null))
</script>

<template>
  <div v-if="!off" class="site-prices" :class="`site-prices--${state}`" :aria-busy="state === 'loading'">
    <div class="site-prices__summary" aria-live="polite">
      <template v-if="summary === null">
        <span class="site-prices__line"><span class="site-prices__bone site-prices__bone--long" /></span>
        <span class="site-prices__line"><span class="site-prices__bone site-prices__bone--mid" /></span>
      </template>
      <span v-else :key="summary" class="site-prices__text">{{ summary }}</span>
    </div>
    <ul class="site-prices__list">
      <li v-for="row in rows" :key="row.source" class="site-prices__row">
        <a v-if="row.url" class="site-prices__site" :href="row.url" target="_blank" rel="noopener noreferrer">
          {{ row.label }}
        </a>
        <span v-else class="site-prices__site site-prices__site--plain">{{ row.label }}</span>
        <span v-if="row.value === null" class="site-prices__bone site-prices__bone--value" aria-hidden="true" />
        <span v-else :key="row.value" class="site-prices__value">{{ row.value }}</span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
// One line of the frame: every text and every skeleton in it is this tall.
$line: calc(#{$font-size-sm} * #{$line-height-normal});

.site-prices {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  line-height: $line-height-normal;

  // Two lines, whatever the sentence: the longest one takes two, and the frame
  // must not grow when it comes.
  &__summary {
    display: flex;
    flex-direction: column;
    min-height: calc(#{$line} * 2);
  }

  &__text {
    font-weight: $font-weight-medium;
    color: $color-text;
    animation: site-prices-in 150ms ease-out;
  }

  &--idle &__text,
  &--failed &__text {
    font-weight: $font-weight-normal;
    color: $color-text-muted;
  }

  &__line {
    display: flex;
    align-items: center;
    height: $line;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    gap: $spacing-2;
    height: $line;
    color: $color-text;
  }

  &__site {
    color: $color-primary;
    text-decoration: underline;

    &--plain {
      color: $color-text-secondary;
      text-decoration: none;
    }
  }

  &__value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: site-prices-in 150ms ease-out;
  }

  &--idle &__value,
  &--failed &__value,
  &--free &__value {
    color: $color-text-muted;
  }

  &__bone {
    display: block;
    height: 10px;
    border-radius: 5px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 37%, #e2e8f0 63%);
    background-size: 400% 100%;
    animation: site-prices-shimmer 1.4s ease infinite;

    &--long {
      width: 92%;
    }

    &--mid {
      width: 56%;
    }

    &--value {
      width: 64px;
    }
  }
}

@keyframes site-prices-shimmer {
  from {
    background-position: 100% 50%;
  }

  to {
    background-position: 0 50%;
  }
}

@keyframes site-prices-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-prices__bone,
  .site-prices__text,
  .site-prices__value {
    animation: none;
  }
}
</style>
