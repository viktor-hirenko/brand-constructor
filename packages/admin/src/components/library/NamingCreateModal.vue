<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Concept, ExternalNaming, InternalNaming, OrderListResponse } from '@brand-constructor/shared'
import { isOrderRole } from '@brand-constructor/shared'
import { apiGet, apiPost, useApiList } from '@/composables/useApi'
import { describeApiError } from '@/utils/apiErrorText'
import { briefsForKind } from '@/utils/orderBriefs'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

/**
 * «Create External / Internal Naming» — one form for the Namings page and the
 * order page (brief-orders plan, phase 2a). «For brief» is fixed on the order
 * page and an optional choice on the library page; the order page also fixes
 * which concepts a name may belong to. A refused save is said inside the
 * window instead of failing silently (H-20).
 */

interface DomainPreview {
  available: boolean
  price: number | null
  currency: string | null
  checkedAt: string
}

interface Props {
  kind: 'external' | 'internal'
  forBrand?: { id: string; name: string } | null
  /** The order page's own list of concepts a name may belong to. */
  conceptOptions?: { id: string; name: string }[] | null
  defaultConceptId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  forBrand: null,
  conceptOptions: null,
  defaultConceptId: null,
})

const emit = defineEmits<{
  close: []
  created: [naming: ExternalNaming | InternalNaming]
}>()

const authStore = useAuthStore()

const name = ref('')
const tagline = ref('')
const domain = ref('')
const conceptId = ref<string | null>(props.defaultConceptId)
const forBrandId = ref<string | null>(props.forBrand?.id ?? null)
const creating = ref(false)
const error = ref<string | null>(null)

const { data: libraryConcepts, fetchData: fetchConcepts } = useApiList<Concept>('/api/concepts')

const conceptChoices = computed(() =>
  props.conceptOptions ??
  [...libraryConcepts.value].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, name: c.name }))
)

const briefOptions = ref<{ id: string; name: string }[]>([])

onMounted(async () => {
  if (props.kind === 'external' && !props.conceptOptions) {
    fetchConcepts({ per_page: '100', include_reserved: '1' })
  }
  if (!props.forBrand && isOrderRole(authStore.user?.role ?? '')) {
    try {
      const [open, ready] = await Promise.all([
        apiGet<OrderListResponse>('/api/orders?tab=open'),
        apiGet<OrderListResponse>('/api/orders?tab=ready'),
      ])
      briefOptions.value = briefsForKind([...open.items, ...ready.items], props.kind).map(o => ({
        id: o.brandId,
        name: o.brandName,
      }))
    } catch {
      // Without the list the field just stays hidden; the naming is still made.
    }
  }
})

// --- Domain preview (external only): availability + price, not saved ---

const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewData = ref<DomainPreview | null>(null)
const previewAttempted = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | null = null

function resetPreview() {
  if (previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
  previewLoading.value = false
  previewError.value = null
  previewData.value = null
  previewAttempted.value = false
}

async function loadPreview() {
  const raw = domain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetPreview()
    return
  }
  previewLoading.value = true
  previewError.value = null
  previewData.value = null
  previewAttempted.value = false
  try {
    previewData.value = await apiPost<DomainPreview | null>('/api/namings/external/preview-domain', {
      domain: raw,
    })
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : 'Could not load domain preview'
  } finally {
    previewLoading.value = false
    previewAttempted.value = true
  }
}

watch(domain, () => {
  if (props.kind !== 'external') return
  const raw = domain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetPreview()
    return
  }
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    previewTimer = null
    void loadPreview()
  }, 500)
})

onUnmounted(resetPreview)

function formatPreviewPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2)
}

async function handleCreate() {
  if (!name.value.trim() || creating.value) return
  creating.value = true
  error.value = null
  try {
    const naming =
      props.kind === 'external'
        ? await apiPost<ExternalNaming>('/api/namings/external', {
            name: name.value.trim(),
            tagline: tagline.value.trim(),
            domain: domain.value.trim() || null,
            concept_id: conceptId.value || null,
            for_brand_id: forBrandId.value,
          })
        : await apiPost<InternalNaming>('/api/namings/internal', {
            name: name.value.trim(),
            tagline: tagline.value.trim(),
            for_brand_id: forBrandId.value,
          })
    emit('created', naming)
  } catch (e) {
    const text = describeApiError(e, 'save')
    error.value = `${text.title}. ${text.body}`
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <BaseModal
    :title="`Create ${props.kind === 'external' ? 'External' : 'Internal'} Naming`"
    @close="emit('close')"
  >
    <form class="create-form" @submit.prevent="handleCreate">
      <div v-if="props.forBrand" class="create-form__field">
        <span class="create-form__label">For brief</span>
        <span class="create-form__fixed">{{ props.forBrand.name }}</span>
      </div>
      <div v-else-if="briefOptions.length > 0" class="create-form__field">
        <label class="create-form__label" for="naming-for-brief">
          For brief
          <span class="create-form__label-hint">(optional)</span>
        </label>
        <select id="naming-for-brief" v-model="forBrandId" class="create-form__select">
          <option :value="null">— Library, no brief —</option>
          <option v-for="b in briefOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <BaseInput v-model="name" label="Naming" placeholder="Enter naming..." required />
      <BaseInput v-model="tagline" label="Tagline" placeholder="Short description..." />
      <template v-if="props.kind === 'external'">
        <BaseInput v-model="domain" label="Domain" placeholder="e.g. example.com" />
        <div v-if="domain.trim() && domain.includes('.')" class="create-form__domain-preview">
          <p v-if="previewLoading" class="create-form__hint">Checking registration estimate…</p>
          <p v-else-if="previewError" class="create-form__hint create-form__hint--error">
            {{ previewError }}
          </p>
          <p v-else-if="previewData" class="create-form__domain-preview-row">
            <span
              class="create-form__status-badge"
              :class="previewData.available ? 'create-form__status-badge--available' : 'create-form__status-badge--sold'"
            >
              {{ previewData.available ? 'Available' : 'Sold' }}
            </span>
            <span v-if="previewData.price != null" class="create-form__domain-preview-price">
              Est. registration:
              {{ previewData.currency || 'USD' }}
              {{ formatPreviewPrice(previewData.price) }}
            </span>
          </p>
          <p v-else-if="previewAttempted && !previewLoading" class="create-form__hint">
            Could not retrieve registration estimate. Final price is set when you save.
          </p>
        </div>
        <p class="create-form__hint">
          Domain availability will be checked automatically via Pananames API after creation.
        </p>
        <div class="create-form__field">
          <label class="create-form__label" for="naming-concept">Link to Concept</label>
          <select id="naming-concept" v-model="conceptId" class="create-form__select">
            <option v-if="!props.conceptOptions" :value="null">— No concept —</option>
            <option v-for="c in conceptChoices" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </template>
      <p v-if="error" class="create-form__error" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
      <BaseButton :loading="creating" :disabled="!name.trim()" @click="handleCreate">Create</BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use './createForm' as *;

.create-form {
  @include create-form;

  &__domain-preview {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__domain-preview-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-2 $spacing-3;
    margin: 0;
    font-size: $font-size-sm;
  }

  &__domain-preview-price {
    color: $color-text-secondary;
  }

  &__status-badge {
    display: inline-flex;
    align-items: center;
    margin-right: auto;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    white-space: nowrap;

    &--available {
      background-color: #d4edda;
      color: #155724;
    }

    &--sold {
      background-color: #f8d7da;
      color: #721c24;
    }
  }
}
</style>
