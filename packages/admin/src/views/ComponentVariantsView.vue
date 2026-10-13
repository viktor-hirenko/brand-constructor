<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ComponentType, ComponentVariant } from '@brand-constructor/shared'
import { COMPONENT_TYPE_ASPECT_RATIOS, parseAspectRatio } from '@brand-constructor/shared'
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, getAssetUrl } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import { pinLeavingCard, useDeleteAnimation } from '@/composables/useDeleteAnimation'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useErrorDialog } from '@/composables/useErrorDialog'
import {
  VARIANT_STATUS_TABS,
  isArchivedVariant,
  variantArchiveAction,
  type VariantStatusFilter,
} from '@/utils/variantArchive'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import arrowLeft from '@phosphor-icons/core/regular/arrow-left.svg?raw'
import imageSquare from '@phosphor-icons/core/regular/image-square.svg?raw'

const { showError } = useErrorDialog()

const { transitionName, playDelete } = useDeleteAnimation()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('component_variants'))

const typeId = route.params.typeId as string
const componentType = ref<ComponentType | null>(null)
const variants = ref<(ComponentVariant & { author_name: string; brand_name: string | null })[]>([])
const loading = ref(false)
const statusFilter = ref<VariantStatusFilter>('all')

const { sortedData: sortedVariants, setSort: setVariantSort } = useTableSort(
  variants,
  'created_at',
  'desc'
)
const variantSortOption = ref('created_at:desc')

function onVariantSortChange(value: string) {
  variantSortOption.value = value
  const [field, dir] = value.split(':') as [string, 'asc' | 'desc']
  setVariantSort(field, dir)
}

const showCreateModal = ref(false)
const newName = ref('')
const creating = ref(false)

const lightboxUrl = ref<string | null>(null)
const lightboxAlt = ref('')

function openVariantLightbox(thumbnailUrl: string, name: string) {
  lightboxUrl.value = getAssetUrl(thumbnailUrl)
  lightboxAlt.value = name
}

const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deleting = ref(false)

const renamingId = ref<string | null>(null)
const renameValue = ref('')
const renaming = ref(false)

function startRename(v: { id: string; name: string }) {
  renamingId.value = v.id
  renameValue.value = v.name
}

function cancelRename() {
  renamingId.value = null
  renameValue.value = ''
}

async function confirmRename() {
  if (!renamingId.value || !renameValue.value.trim()) return
  renaming.value = true
  try {
    await apiPut(`/api/components/variants/${renamingId.value}`, {
      name: renameValue.value.trim(),
    })
    renamingId.value = null
    renameValue.value = ''
    await fetchVariants({ silent: true })
  } finally {
    renaming.value = false
  }
}

// The archive — DP-15450, visual components 5 (`utils/variantArchive.ts`): the
// variant leaves the choice of the wizard's step 7 and stays in the briefs that
// have picked it. A change of status, never a delete.
const archivingIds = ref<Set<string>>(new Set())

async function toggleArchive(v: { id: string; status: string }) {
  const action = variantArchiveAction(v)
  if (!action || archivingIds.value.has(v.id)) return
  archivingIds.value = new Set([...archivingIds.value, v.id])
  try {
    await apiPut(`/api/components/variants/${v.id}`, { status: action.status })
    await fetchVariants({ silent: true })
  } catch (err) {
    showError(err, 'save')
  } finally {
    archivingIds.value = new Set([...archivingIds.value].filter(id => id !== v.id))
  }
}

const uploadingIds = ref<Set<string>>(new Set())
const uploadInputRefs = ref<Map<string, HTMLInputElement>>(new Map())

const configRatio = COMPONENT_TYPE_ASPECT_RATIOS[typeId]?.aspect_ratio
const aspectRatioInput = ref(configRatio ? String(configRatio) : '')

function setUploadRef(el: unknown, variantId: string) {
  if (el instanceof HTMLInputElement) {
    uploadInputRefs.value.set(variantId, el)
  }
}

function triggerUpload(variantId: string) {
  uploadInputRefs.value.get(variantId)?.click()
}

async function fetchVariants(options?: { silent?: boolean }) {
  if (!options?.silent) {
    loading.value = true
  }
  try {
    const result = await apiGet<{
      type: ComponentType
      variants: (ComponentVariant & { author_name: string; brand_name: string | null })[]
    }>(`/api/components/types/${typeId}/variants?status=${statusFilter.value}`)
    componentType.value = result.type
    variants.value = result.variants
  } catch (err) {
    console.error('Failed to fetch variants:', err)
  } finally {
    if (!options?.silent) {
      loading.value = false
    }
  }
}

onMounted(() => fetchVariants())
watch(statusFilter, () => fetchVariants())

const pollingPaused = computed(
  () =>
    showCreateModal.value ||
    lightboxUrl.value !== null ||
    deleteTarget.value !== null ||
    uploadingIds.value.size > 0 ||
    archivingIds.value.size > 0 ||
    renamingId.value !== null
)
useListPolling(() => fetchVariants({ silent: true }), { paused: pollingPaused })

async function handleCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await apiPost(`/api/components/types/${typeId}/variants`, { name: newName.value.trim() })
    showCreateModal.value = false
    newName.value = ''
    fetchVariants({ silent: true })
  } finally {
    creating.value = false
  }
}

function handleDelete(id: string, name: string) {
  deleteTarget.value = { id, name }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const id = deleteTarget.value.id
    await apiDelete(`/api/components/variants/${id}`)
    deleteTarget.value = null
    // In place + quiet refresh — see BrandsView `confirmDeleteBrand`.
    playDelete(() => {
      variants.value = variants.value.filter(v => v.id !== id)
    }, () => fetchVariants({ silent: true }))
  } catch (err) {
    // Had no catch: a refused delete kept the window open and said nothing.
    showError(err, 'delete')
  } finally {
    deleting.value = false
  }
}

async function handleUploadThumbnail(event: Event, variantId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const parsedRatio = parseAspectRatio(aspectRatioInput.value)

  uploadingIds.value = new Set([...uploadingIds.value, variantId])
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'component_thumbnail')
    formData.append('entity_id', variantId)
    formData.append('component_type_id', typeId)
    if (parsedRatio !== null) {
      formData.append('aspect_ratio', String(parsedRatio))
    }
    await apiUpload('/api/assets/upload', formData)
    fetchVariants({ silent: true })
  } catch (err) {
    showError(err, 'upload')
  } finally {
    input.value = ''
    uploadingIds.value = new Set([...uploadingIds.value].filter(id => id !== variantId))
  }
}
</script>

<template>
  <div class="variants-view">
    <div class="variants-view__back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/components')">
        <PhosphorIcon :svg="arrowLeft" class="variants-view__back-icon" />
        До UI-компонентів
      </BaseButton>
    </div>

    <div class="variants-view__status-tabs">
      <button
        v-for="tab in VARIANT_STATUS_TABS"
        :key="tab.status"
        class="variants-view__status-tab"
        :class="{ 'variants-view__status-tab--active': statusFilter === tab.status }"
        @click="statusFilter = tab.status"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="componentType" class="variants-view__header">
      <div class="variants-view__header-left">
        <h2>Варіанти: {{ componentType.name }}</h2>
        <select
          :value="variantSortOption"
          class="variants-view__sort-select"
          @change="onVariantSortChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="created_at:desc">Спочатку нові</option>
          <option value="created_at:asc">Спочатку старі</option>
          <option value="name:asc">За назвою A–Z</option>
          <option value="name:desc">За назвою Z–A</option>
        </select>
      </div>
      <BaseButton v-if="canWrite" @click="showCreateModal = true">+ Новий варіант</BaseButton>
    </div>

    <div v-if="canWrite && configRatio !== undefined" class="variants-view__ratio-field">
      <BaseInput
        v-model="aspectRatioInput"
        label="Співвідношення сторін"
        placeholder="напр. 1.9 або 16:9"
      />
      <span class="variants-view__ratio-hint">
        {{ aspectRatioInput ? 'Перевірка ±1% при завантаженні' : 'Без перевірки пропорцій' }}
      </span>
    </div>

    <div v-if="loading" class="variants-view__loading">Завантаження…</div>

    <TransitionGroup
      v-else
      tag="div"
      class="variants-view__grid list-delete-cards"
      :name="transitionName"
      @before-leave="pinLeavingCard"
    >
      <div
        v-for="v in sortedVariants"
        :key="v.id"
        class="variant-card"
        :class="{ 'variant-card--archived': isArchivedVariant(v) }"
      >
        <div class="variant-card__preview">
          <img
            v-if="v.thumbnail_url"
            :src="getAssetUrl(v.thumbnail_url)"
            :alt="v.name"
            class="variant-card__img"
            @click="openVariantLightbox(v.thumbnail_url, v.name)"
          />
          <div v-else class="variant-card__placeholder">
            <PhosphorIcon :svg="imageSquare" class="variant-card__placeholder-icon" />
            <span class="variant-card__placeholder-text">Картинки поки немає</span>
          </div>
        </div>

        <input
          v-if="canWrite"
          :ref="el => setUploadRef(el, v.id)"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="variant-card__file-input"
          @change="e => handleUploadThumbnail(e, v.id)"
        />

        <div class="variant-card__body">
          <div class="variant-card__header-row">
            <template v-if="renamingId === v.id">
              <BaseInput v-model="renameValue" class="variant-card__rename-input" />
              <BaseButton
                variant="secondary"
                size="sm"
                :loading="renaming"
                :disabled="!renameValue.trim()"
                @click="confirmRename"
              >
                Зберегти
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="cancelRename">Скасувати</BaseButton>
            </template>
            <template v-else>
              <h4 class="variant-card__name">{{ v.name }}</h4>
              <BaseButton v-if="canWrite" variant="ghost" size="sm" @click="startRename(v)">
                Перейменувати
              </BaseButton>
            </template>
          </div>
          <div class="variant-card__meta">
            <span class="variant-card__author">Автор: {{ v.author_name }}</span>
            <span class="variant-card__date">{{
              new Date(v.created_at).toLocaleDateString()
            }}</span>
          </div>
          <p v-if="isArchivedVariant(v)" class="variant-card__archived">
            <strong>В архіві.</strong>
            Не пропонується на кроці Interface Components. У брифах, де його вже обрано, залишається.
          </p>
          <div v-if="canWrite" class="variant-card__actions">
            <BaseButton
              variant="secondary"
              :loading="uploadingIds.has(v.id)"
              @click="triggerUpload(v.id)"
            >
              {{ v.thumbnail_url ? 'Замінити картинку' : 'Завантажити картинку' }}
            </BaseButton>
            <BaseButton
              v-if="variantArchiveAction(v)"
              variant="secondary"
              size="sm"
              :loading="archivingIds.has(v.id)"
              @click="toggleArchive(v)"
            >
              {{ variantArchiveAction(v)?.label }}
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="handleDelete(v.id, v.name)">
              Видалити
            </BaseButton>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <Teleport to="body">
      <div v-if="lightboxUrl" class="lightbox" @click="lightboxUrl = null">
        <img :src="lightboxUrl" :alt="lightboxAlt" class="lightbox__img" />
      </div>
    </Teleport>

    <BaseModal v-if="showCreateModal" title="Новий варіант" @close="showCreateModal = false">
      <form @submit.prevent="handleCreate">
        <BaseInput
          v-model="newName"
          label="Назва варіанта"
          placeholder="напр. Modern Gradient"
          required
        />
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Скасувати</BaseButton>
        <BaseButton :loading="creating" :disabled="!newName.trim()" @click="handleCreate"
          >Створити</BaseButton
        >
      </template>
    </BaseModal>

    <BaseModal v-if="deleteTarget" title="Видалити варіант" @close="deleteTarget = null">
      <p>Видалити варіант «{{ deleteTarget?.name }}»?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="deleteTarget = null">Скасувати</BaseButton>
        <BaseButton variant="danger" :loading="deleting" @click="confirmDelete">Видалити</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.variants-view {
  &__status-tabs {
    display: flex;
    gap: $spacing-2;
    margin-bottom: $spacing-4;
  }

  &__status-tab {
    padding: $spacing-1 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg;
      color: $color-text;
    }

    &--active {
      background: $color-primary;
      border-color: $color-primary;
      color: #fff;
    }
  }

  &__back {
    margin-bottom: $spacing-4;
  }

  // DP-15859: "Arrow left → ArrowLeft, Regular" (`5658:39246`) in place of the
  // `&larr;` that was part of the label. No Admin mock-up: 16 draws the arrow
  // as wide as that character was at this button's font size.
  &__back-icon {
    width: 16px;
    height: 16px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-6;

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__sort-select {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
  }

  &__ratio-field {
    max-width: 300px;
    margin-bottom: $spacing-4;
  }

  &__ratio-hint {
    display: block;
    margin-top: $spacing-1;
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__grid {
    position: relative; // the leaving card is pinned inside it
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: $spacing-4;

    @include mobile {
      grid-template-columns: 1fr;
    }
  }
}

.variant-card {
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;

  // In the archive: the picture steps back, the card says why.
  &--archived &__preview {
    opacity: 0.45;
  }

  &__archived {
    margin-bottom: $spacing-2;
    padding: $spacing-2 $spacing-3;
    border-radius: $radius-md;
    background-color: $color-bg;
    font-size: $font-size-xs;
    line-height: 1.45;
    color: $color-text-secondary;

    strong {
      color: $color-text;
      font-weight: $font-weight-semibold;
    }
  }

  &__preview {
    background-color: #e2e8f0;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  &__placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  // DP-15859: "Placeholder → ImageSquare, Regular" (`5658:39246`); size,
  // colour and fade kept from the drawing it replaces — no Admin mock-up.
  &__placeholder-icon {
    width: 32px;
    height: 32px;
    color: $color-text-muted;
    opacity: 0.5;
  }

  &__placeholder-text {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__file-input {
    display: none;
  }

  &__body {
    padding: $spacing-4;
  }

  &__header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-2;
    margin-bottom: $spacing-1;
  }

  &__rename-input {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: $spacing-2;
  }

  &__author {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__img {
    cursor: zoom-in;
  }

  &__actions {
    margin-top: $spacing-3;
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;

  &__img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: $radius-md;
  }
}
</style>
