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
import SearchSelect from '@/components/ui/SearchSelect.vue'
import NamingDomainModeField from '@/components/namings/NamingDomainModeField.vue'
import {
  buildDomainModeBody,
  canSaveDomainMode,
  domainPreviewProblem,
  type DomainPreviewProblem,
  type DomainMode,
} from '@/utils/namingDomainStatus'

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
const domainMode = ref<DomainMode>('automatic')
const purchasePrice = ref('')
const creating = ref(false)
const error = ref<string | null>(null)

const { data: libraryConcepts, fetchData: fetchConcepts } = useApiList<Concept>('/api/concepts')

const conceptChoices = computed(() =>
  props.conceptOptions ??
  [...libraryConcepts.value].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, name: c.name }))
)

/** The concept is picked by typing (SearchSelect): the list grows with the library. */
const conceptSelectOptions = computed(() => [
  ...(props.conceptOptions ? [] : [{ value: null, label: '— Без концепту —' }]),
  ...conceptChoices.value.map(c => ({ value: c.id, label: c.name })),
])

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
const previewError = ref<DomainPreviewProblem | null>(null)
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
    previewError.value = domainPreviewProblem(e instanceof Error ? e.message : null)
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

const canCreate = computed(
  () =>
    name.value.trim() !== '' &&
    (props.kind !== 'external' || canSaveDomainMode(domainMode.value, purchasePrice.value))
)

async function handleCreate() {
  if (!canCreate.value || creating.value) return
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
            ...buildDomainModeBody(domainMode.value, purchasePrice.value, false),
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
    :title="`Новий ${props.kind === 'external' ? 'External' : 'Internal'} Naming`"
    @close="emit('close')"
  >
    <form class="create-form" @submit.prevent="handleCreate">
      <div v-if="props.forBrand" class="create-form__field">
        <span class="create-form__label">Для брифу</span>
        <span class="create-form__fixed">{{ props.forBrand.name }}</span>
      </div>
      <div v-else-if="briefOptions.length > 0" class="create-form__field">
        <label class="create-form__label" for="naming-for-brief">
          Для брифу
          <span class="create-form__label-hint">(необов'язково)</span>
        </label>
        <select id="naming-for-brief" v-model="forBrandId" class="create-form__select">
          <option :value="null">— Бібліотека, без брифу —</option>
          <option v-for="b in briefOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <BaseInput v-model="name" label="Назва" placeholder="Введіть назву…" required />
      <BaseInput v-model="tagline" label="Опис" placeholder="Короткий опис…" />
      <template v-if="props.kind === 'external'">
        <BaseInput v-model="domain" label="Домен" placeholder="напр. example.com" />
        <!-- Always in the window, one row tall: what the registrar says comes into it and pushes nothing. -->
        <div class="create-form__domain-preview">
          <p v-if="previewLoading" class="create-form__hint">Перевіряємо домен…</p>
          <p
            v-else-if="previewError"
            class="create-form__hint"
            :class="{ 'create-form__hint--error': previewError.error }"
          >
            {{ previewError.text }}
          </p>
          <p v-else-if="previewData" class="create-form__domain-preview-row">
            <span
              class="create-form__status-badge"
              :class="previewData.available ? 'create-form__status-badge--available' : 'create-form__status-badge--sold'"
            >
              {{ previewData.available ? 'Available' : 'Sold' }}
            </span>
            <span v-if="previewData.price != null" class="create-form__domain-preview-price">
              Реєстрація:
              {{ previewData.currency || 'USD' }}
              {{ formatPreviewPrice(previewData.price) }}
            </span>
          </p>
          <p v-else-if="previewAttempted && !previewLoading" class="create-form__hint">
            Не вдалося перевірити домен. Статус і ціну буде визначено після збереження.
          </p>
        </div>
        <NamingDomainModeField
          v-model:mode="domainMode"
          v-model:purchase-price="purchasePrice"
          name="create-domain-mode"
          :domain="domain"
          :free="previewData?.available === true"
        />
        <div class="create-form__field">
          <label class="create-form__label" for="naming-concept">Концепт</label>
          <SearchSelect id="naming-concept" v-model="conceptId" :options="conceptSelectOptions" />
        </div>
      </template>
      <p v-if="error" class="create-form__error" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">Скасувати</BaseButton>
      <BaseButton :loading="creating" :disabled="!canCreate" @click="handleCreate">Створити</BaseButton>
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
    justify-content: center;
    gap: $spacing-1;
    min-height: 28px;
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
