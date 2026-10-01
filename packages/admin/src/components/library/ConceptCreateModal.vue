<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Concept, ExternalNaming, OrderListResponse } from '@brand-constructor/shared'
import { isOrderRole } from '@brand-constructor/shared'
import { useApiList, apiPost, apiGet } from '@/composables/useApi'
import { describeApiError } from '@/utils/apiErrorText'
import { briefsForKind } from '@/utils/orderBriefs'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

/**
 * «Create New Concept» — one form for the Concepts page and the order page
 * (brief-orders plan, phase 2a). «For brief» is fixed on the order page and an
 * optional choice on the library page. A refused save is said inside the
 * window instead of failing silently (H-20).
 */

interface Props {
  /** The order page passes its brief; the field is then fixed. */
  forBrand?: { id: string; name: string } | null
}

const props = withDefaults(defineProps<Props>(), { forBrand: null })

const emit = defineEmits<{
  close: []
  created: [concept: Concept]
}>()

const authStore = useAuthStore()

const name = ref('')
const description = ref('')
const mode = ref<'light' | 'dark' | null>(null)
const selectedNamingIds = ref<string[]>([])
const forBrandId = ref<string | null>(props.forBrand?.id ?? null)
const creating = ref(false)
const error = ref<string | null>(null)

type NamingRow = ExternalNaming & { author_name: string }
const { data: availableNamings, fetchData: fetchNamings } =
  useApiList<NamingRow>('/api/namings/external')

const unlinkedNamings = computed(() =>
  availableNamings.value.filter(n => !n.concept_id).sort((a, b) => a.name.localeCompare(b.name))
)

const briefOptions = ref<{ id: string; name: string }[]>([])

onMounted(async () => {
  fetchNamings({ per_page: '100', filter: 'standalone' })
  if (!props.forBrand && isOrderRole(authStore.user?.role ?? '')) {
    try {
      const [open, ready] = await Promise.all([
        apiGet<OrderListResponse>('/api/orders?tab=open'),
        apiGet<OrderListResponse>('/api/orders?tab=ready'),
      ])
      briefOptions.value = briefsForKind([...open.items, ...ready.items], 'concept').map(o => ({
        id: o.brandId,
        name: o.brandName,
      }))
    } catch {
      // Without the list the field just stays hidden; the concept is still made.
    }
  }
})

function toggleNaming(id: string) {
  selectedNamingIds.value = selectedNamingIds.value.includes(id)
    ? selectedNamingIds.value.filter(v => v !== id)
    : [...selectedNamingIds.value, id]
}

async function handleCreate() {
  if (!name.value.trim() || creating.value) return
  creating.value = true
  error.value = null
  try {
    const payload: Record<string, unknown> = {
      name: name.value.trim(),
      description: description.value.trim(),
      mode: mode.value,
      for_brand_id: forBrandId.value,
    }
    // Names linked here would not be made for the brief; the order page adds
    // its own with «Додати назву».
    if (!forBrandId.value && selectedNamingIds.value.length > 0) {
      payload.naming_ids = selectedNamingIds.value
    }
    const concept = await apiPost<Concept>('/api/concepts', payload)
    emit('created', concept)
  } catch (e) {
    const text = describeApiError(e, 'save')
    error.value = `${text.title}. ${text.body}`
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <BaseModal title="Create New Concept" @close="emit('close')">
    <form class="create-form" @submit.prevent="handleCreate">
      <div v-if="props.forBrand" class="create-form__field">
        <span class="create-form__label">For brief</span>
        <span class="create-form__fixed">{{ props.forBrand.name }}</span>
      </div>
      <div v-else-if="briefOptions.length > 0" class="create-form__field">
        <label class="create-form__label" for="concept-for-brief">
          For brief
          <span class="create-form__label-hint">(optional)</span>
        </label>
        <select id="concept-for-brief" v-model="forBrandId" class="create-form__select">
          <option :value="null">— Library, no brief —</option>
          <option v-for="b in briefOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <BaseInput v-model="name" label="Concept Name" placeholder="e.g. WonderLand" required />
      <BaseTextarea
        v-model="description"
        label="Description"
        placeholder="Theme, mood, visual direction..."
        :rows="4"
      />
      <div class="create-form__field">
        <label class="create-form__label">Mode (Theme)</label>
        <div class="create-form__mode-options">
          <label class="create-form__mode-option">
            <input v-model="mode" type="radio" :value="null" name="mode" />
            <span>Not specified</span>
          </label>
          <label class="create-form__mode-option">
            <input v-model="mode" type="radio" value="light" name="mode" />
            <span>☀️ Light</span>
          </label>
          <label class="create-form__mode-option">
            <input v-model="mode" type="radio" value="dark" name="mode" />
            <span>🌙 Dark</span>
          </label>
        </div>
      </div>
      <div v-if="!forBrandId && unlinkedNamings.length > 0" class="create-form__field">
        <label class="create-form__label">
          Link to Naming
          <span class="create-form__label-hint">(optional)</span>
        </label>
        <div class="create-form__naming-list">
          <label v-for="naming in unlinkedNamings" :key="naming.id" class="create-form__naming-option">
            <input
              type="checkbox"
              :checked="selectedNamingIds.includes(naming.id)"
              @change="toggleNaming(naming.id)"
            />
            <span class="create-form__naming-name">{{ naming.name }}</span>
            <span v-if="naming.tagline" class="create-form__naming-tagline">{{ naming.tagline }}</span>
          </label>
        </div>
      </div>
      <p v-if="error" class="create-form__error" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
      <BaseButton :loading="creating" :disabled="!name.trim()" @click="handleCreate">
        Create Concept
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use './createForm' as *;

.create-form {
  @include create-form;

  &__mode-options {
    display: flex;
    gap: $spacing-4;
    flex-wrap: wrap;
  }

  &__mode-option {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    cursor: pointer;
    font-size: $font-size-sm;
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-primary;
    }

    &:has(input:checked) {
      border-color: $color-primary;
      background-color: rgba($color-primary, 0.05);
    }

    input[type='radio'] {
      margin: 0;
    }
  }

  &__naming-list {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    padding: $spacing-2;
  }

  &__naming-option {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-2;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: $font-size-sm;
    transition: background-color $transition-fast;

    &:hover {
      background-color: $color-bg;
    }

    input[type='checkbox'] {
      flex-shrink: 0;
    }
  }

  &__naming-name {
    font-weight: $font-weight-medium;
  }

  &__naming-tagline {
    color: $color-text-secondary;
    font-size: $font-size-xs;
  }
}
</style>
