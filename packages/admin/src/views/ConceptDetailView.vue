<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Concept, ExternalNaming, Asset } from '@brand-constructor/shared'
import { parseAspectRatio } from '@brand-constructor/shared'
import { useApi, apiPut, apiUpload, apiDelete, getAssetUrl } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useErrorDialog } from '@/composables/useErrorDialog'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import arrowLeft from '@phosphor-icons/core/regular/arrow-left.svg?raw'
import lock from '@phosphor-icons/core/regular/lock.svg?raw'

const { showError } = useErrorDialog()

interface ConceptDetail extends Concept {
  namings: ExternalNaming[]
  assets: Asset[]
  author_name: string
  /** The approved brand this concept is locked to, when it is. */
  brand_name?: string | null
}

interface GallerySlot {
  fieldKey: keyof Pick<
    Concept,
    | 'gallery_url_1'
    | 'gallery_url_2'
    | 'gallery_url_3'
    | 'gallery_url_4'
    | 'gallery_url_5'
    | 'gallery_url_6'
    | 'gallery_url_7'
    | 'gallery_url_8'
    | 'gallery_url_9'
    | 'gallery_url_10'
  >
  entityType: `concept_gallery_${number}`
  label: string
}

const GALLERY_SLOTS: GallerySlot[] = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  const fieldKey = `gallery_url_${n}` as GallerySlot['fieldKey']
  const label =
    n === 1
      ? 'Картинка галереї 1 (перегляд на мобільному)'
      : n === 2
        ? 'Картинка галереї 2 (перегляд на десктопі)'
        : `Картинка галереї ${n}`
  return {
    fieldKey,
    entityType: `concept_gallery_${n}` as `concept_gallery_${number}`,
    label,
  }
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('concepts'))

/**
 * A concept picked by an approved brand is frozen: the worker refuses to
 * change its text or its images, so the page does not offer to. The owner,
 * 29.09: once it is used, nothing on it is to be changed — title, text, theme
 * or images.
 */
const isUsedInBrand = computed(
  () => concept.value?.status === 'used' || Boolean(concept.value?.used_in_brand_id),
)
const canEdit = computed(() => canWrite.value && !isUsedInBrand.value)
const lockedBrandLabel = computed(() =>
  concept.value?.brand_name ? ` «${concept.value.brand_name}»` : '',
)

const {
  data: concept,
  loading,
  error,
  fetchData,
} = useApi<ConceptDetail>(`/api/concepts/${route.params.id}`)

const isEditing = ref(false)
const editName = ref('')
const editDescription = ref('')
const editMode = ref<'light' | 'dark' | null>(null)
const uploadingType = ref<string | null>(null)
const deletingType = ref<string | null>(null)
const deleteAssetTarget = ref<{ entityType: string; label: string } | null>(null)

const visualInputRef = ref<HTMLInputElement | null>(null)
const galleryFileInputs = ref<Record<string, HTMLInputElement | null>>({})

const visualAspectRatio = ref('1:1')
const galleryRatios = reactive<Record<string, string>>(
  Object.fromEntries(GALLERY_SLOTS.map(s => [s.entityType, '1:1']))
)

function reloadConcept(options?: { silent?: boolean }) {
  return fetchData({ silent: options?.silent })
}

onMounted(() => reloadConcept())

const pollingPaused = computed(
  () =>
    isEditing.value ||
    deleteAssetTarget.value !== null ||
    uploadingType.value !== null ||
    deletingType.value !== null
)
useListPolling(() => reloadConcept({ silent: true }), { paused: pollingPaused })

function setGalleryFileInputRef(entityType: string, el: unknown) {
  if (el && el instanceof HTMLInputElement) {
    galleryFileInputs.value[entityType] = el
  } else {
    delete galleryFileInputs.value[entityType]
  }
}

function openGalleryFileInput(entityType: string) {
  galleryFileInputs.value[entityType]?.click()
}

function startEditing() {
  if (!concept.value) return
  editName.value = concept.value.name
  editDescription.value = concept.value.description
  editMode.value = concept.value.mode
  isEditing.value = true
}

async function saveChanges() {
  if (!concept.value || !editName.value.trim()) return
  const payload = {
    name: editName.value.trim(),
    description: editDescription.value.trim(),
    mode: editMode.value,
  }
  try {
    await apiPut(`/api/concepts/${concept.value.id}`, payload)
    isEditing.value = false
    // Quiet: a plain reload swapped the whole page for «Loading...».
    await reloadConcept({ silent: true })
  } catch (err) {
    showError(err, 'save')
  }
}

async function handleFileUpload(event: Event, entityType: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !concept.value) return

  const ratioInput =
    entityType === 'concept_visual' ? visualAspectRatio.value : (galleryRatios[entityType] ?? '1:1')
  const parsedRatio = parseAspectRatio(ratioInput)

  uploadingType.value = entityType
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)
    formData.append('entity_id', concept.value.id)
    if (parsedRatio !== null) {
      formData.append('aspect_ratio', String(parsedRatio))
    }

    await apiUpload<Asset>('/api/assets/upload', formData)
    reloadConcept({ silent: true })
  } catch (err) {
    showError(err, 'upload')
  } finally {
    uploadingType.value = null
    input.value = ''
  }
}

function galleryUrl(c: ConceptDetail, slot: GallerySlot): string | null {
  return c[slot.fieldKey]
}

function findAssetRecord(entityType: string, fileUrl: string | null): Asset | undefined {
  if (!fileUrl || !concept.value?.assets) return undefined
  return concept.value.assets.find(a => a.entity_type === entityType && a.file_url === fileUrl)
}

function assetUploaderMeta(entityType: string, fileUrl: string | null): string | null {
  const asset = findAssetRecord(entityType, fileUrl)
  if (!asset) return null
  const name =
    (asset as Asset & { uploader_name?: string | null }).uploader_name ??
    concept.value?.author_name ??
    'невідомо'
  const date = new Date(asset.created_at).toLocaleDateString('uk-UA')
  return `Автор: ${name} · ${date}`
}

function requestAssetDelete(entityType: string, label: string) {
  deleteAssetTarget.value = { entityType, label }
}

async function confirmAssetDelete() {
  if (!deleteAssetTarget.value || !concept.value) return

  const { entityType } = deleteAssetTarget.value
  const fileUrl =
    entityType === 'concept_visual'
      ? concept.value.visual_url
      : galleryUrl(concept.value, GALLERY_SLOTS.find(s => s.entityType === entityType)!)

  const assetRecord = findAssetRecord(entityType, fileUrl)

  deletingType.value = entityType
  try {
    if (assetRecord) {
      await apiDelete(`/api/assets/${assetRecord.id}`)
    } else if (fileUrl) {
      const payload =
        entityType === 'concept_visual'
          ? { visual_url: null }
          : { [GALLERY_SLOTS.find(s => s.entityType === entityType)!.fieldKey]: null }
      await apiPut(`/api/concepts/${concept.value.id}`, payload)
    }
    deleteAssetTarget.value = null
    await reloadConcept({ silent: true })
  } catch (err) {
    showError(err, 'delete')
  } finally {
    deletingType.value = null
  }
}
</script>

<template>
  <div class="concept-detail">
    <div class="concept-detail__back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/concepts')">
        <PhosphorIcon :svg="arrowLeft" class="concept-detail__back-icon" />
        До концептів
      </BaseButton>
    </div>

    <div v-if="loading" class="concept-detail__loading">Завантаження…</div>

    <div v-else-if="error" class="concept-detail__error">
      <p>Не вдалося завантажити концепт: {{ error }}</p>
      <BaseButton variant="secondary" size="sm" @click="reloadConcept()">Спробувати ще раз</BaseButton>
    </div>

    <template v-else-if="concept">
      <div class="concept-detail__header">
        <div>
          <div class="concept-detail__title-row">
            <h2 v-if="!isEditing">{{ concept.name }}</h2>
            <BaseInput v-else v-model="editName" placeholder="Назва концепту" />
          </div>
          <p class="concept-detail__meta">
            Автор: {{ concept.author_name }} ·
            {{ new Date(concept.created_at).toLocaleDateString() }}
          </p>
        </div>
        <div v-if="canEdit" class="concept-detail__actions">
          <template v-if="isEditing">
            <BaseButton variant="secondary" @click="isEditing = false">Скасувати</BaseButton>
            <BaseButton @click="saveChanges">Зберегти</BaseButton>
          </template>
          <BaseButton v-else variant="secondary" @click="startEditing">Редагувати</BaseButton>
        </div>
      </div>

      <div v-if="isUsedInBrand" class="concept-detail__locked" role="status">
        <PhosphorIcon :svg="lock" class="concept-detail__locked-icon" />
        <p>
          <strong>Використано в затвердженому бренді{{ lockedBrandLabel }}.</strong>
          Назву, опис, тему і картинки змінити не можна — щоб бриф бренду залишився таким, яким
          його затвердили. Для нової версії створіть новий концепт.
        </p>
      </div>

      <div class="concept-detail__section">
        <h3>Опис</h3>
        <BaseTextarea v-if="isEditing" v-model="editDescription" :rows="4" />
        <p v-else class="concept-detail__text">
          {{ concept.description || 'Опису немає.' }}
        </p>
      </div>

      <div class="concept-detail__section">
        <h3>Тема</h3>
        <div v-if="isEditing" class="concept-detail__mode-options">
          <label class="concept-detail__mode-option">
            <input type="radio" :value="null" v-model="editMode" name="editMode" />
            <span>Не вказано</span>
          </label>
          <label class="concept-detail__mode-option">
            <input type="radio" value="light" v-model="editMode" name="editMode" />
            <span>☀️ Light</span>
          </label>
          <label class="concept-detail__mode-option">
            <input type="radio" value="dark" v-model="editMode" name="editMode" />
            <span>🌙 Dark</span>
          </label>
        </div>
        <p v-else class="concept-detail__mode-badge">
          <span v-if="concept.mode === 'light'" class="mode-badge mode-badge--light">☀️ Light</span>
          <span v-else-if="concept.mode === 'dark'" class="mode-badge mode-badge--dark"
            >🌙 Dark</span
          >
          <span v-else class="mode-badge mode-badge--none">Не вказано</span>
        </p>
      </div>

      <div class="concept-detail__section">
        <h3>Картинки</h3>
        <div class="concept-detail__assets">
          <!-- Visual -->
          <div class="asset-slot">
            <div class="asset-slot__preview">
              <img v-if="concept.visual_url" :src="getAssetUrl(concept.visual_url)" alt="Візуал" />
              <span v-else class="asset-slot__empty-text">Візуал не завантажено</span>
            </div>
            <div class="asset-slot__body">
              <span class="asset-slot__label">Візуал</span>
              <template v-if="canEdit">
                <BaseInput
                  v-model="visualAspectRatio"
                  label="Співвідношення сторін"
                  placeholder="напр. 1:1"
                  class="asset-slot__ratio-input"
                />
                <input
                  ref="visualInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="asset-slot__file-input"
                  @change="e => handleFileUpload(e, 'concept_visual')"
                />
                <div class="asset-slot__actions">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :loading="uploadingType === 'concept_visual'"
                    :disabled="uploadingType !== null || deletingType !== null"
                    @click="visualInputRef?.click()"
                  >
                    {{ concept.visual_url ? 'Замінити картинку' : 'Завантажити картинку' }}
                  </BaseButton>
                  <BaseButton
                    v-if="concept.visual_url"
                    variant="danger"
                    size="sm"
                    :loading="deletingType === 'concept_visual'"
                    :disabled="uploadingType !== null || deletingType !== null"
                    @click="requestAssetDelete('concept_visual', 'Візуал')"
                  >
                    Видалити
                  </BaseButton>
                </div>
              </template>
            </div>
            <div
              v-if="assetUploaderMeta('concept_visual', concept.visual_url)"
              class="asset-slot__footer"
            >
              <span class="asset-slot__uploader">
                {{ assetUploaderMeta('concept_visual', concept.visual_url) }}
              </span>
            </div>
          </div>

          <!-- Gallery slots -->
          <div v-for="slot in GALLERY_SLOTS" :key="slot.entityType" class="asset-slot">
            <div class="asset-slot__preview">
              <img
                v-if="galleryUrl(concept, slot)"
                :src="getAssetUrl(galleryUrl(concept, slot)!)"
                :alt="slot.label"
              />
              <span v-else class="asset-slot__empty-text">Картинку не завантажено</span>
            </div>
            <div class="asset-slot__body">
              <span class="asset-slot__label">{{ slot.label }}</span>
              <template v-if="canEdit">
                <BaseInput
                  v-model="galleryRatios[slot.entityType]"
                  label="Співвідношення сторін"
                  placeholder="напр. 1:1"
                  class="asset-slot__ratio-input"
                />
                <input
                  :ref="el => setGalleryFileInputRef(slot.entityType, el)"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="asset-slot__file-input"
                  @change="e => handleFileUpload(e, slot.entityType)"
                />
                <div class="asset-slot__actions">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :loading="uploadingType === slot.entityType"
                    :disabled="uploadingType !== null || deletingType !== null"
                    @click="openGalleryFileInput(slot.entityType)"
                  >
                    {{ galleryUrl(concept, slot) ? 'Замінити картинку' : 'Завантажити картинку' }}
                  </BaseButton>
                  <BaseButton
                    v-if="galleryUrl(concept, slot)"
                    variant="danger"
                    size="sm"
                    :loading="deletingType === slot.entityType"
                    :disabled="uploadingType !== null || deletingType !== null"
                    @click="requestAssetDelete(slot.entityType, slot.label)"
                  >
                    Видалити
                  </BaseButton>
                </div>
              </template>
            </div>
            <div
              v-if="assetUploaderMeta(slot.entityType, galleryUrl(concept, slot))"
              class="asset-slot__footer"
            >
              <span class="asset-slot__uploader">
                {{ assetUploaderMeta(slot.entityType, galleryUrl(concept, slot)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="concept-detail__section">
        <h3>Прив'язані External Namings ({{ concept.namings.length }})</h3>
        <div v-if="concept.namings.length === 0" class="concept-detail__empty">
          До концепту поки не прив'язано жодного неймінгу.
        </div>
        <div v-else class="concept-detail__namings">
          <div v-for="naming in concept.namings" :key="naming.id" class="naming-chip">
            {{ naming.name }}
          </div>
        </div>
      </div>
    </template>

    <BaseModal
      v-if="deleteAssetTarget"
      title="Видалити картинку"
      width="420px"
      @close="deleteAssetTarget = null"
    >
      <p class="concept-detail__confirm-text">
        Видалити <strong>«{{ deleteAssetTarget.label }}»</strong> з концепту?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="deleteAssetTarget = null">Скасувати</BaseButton>
        <BaseButton variant="danger" :loading="deletingType !== null" @click="confirmAssetDelete">
          Видалити
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.concept-detail {
  max-width: 900px;

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

  // The lock notice of a concept used in an approved brand. No Admin mock-up;
  // amber, the Admin's `$color-warning` family, so it reads as "note", not
  // as an error.
  &__locked {
    display: flex;
    align-items: flex-start;
    gap: $spacing-3;
    margin-bottom: $spacing-6;
    padding: $spacing-3 $spacing-4;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    line-height: 1.5;

    p {
      margin: 0;
    }
  }

  &__locked-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    color: #b45309;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-4;
    padding: $spacing-12;
    background-color: $color-bg-white;
    border: 1px solid $color-border;
    border-radius: $radius-lg;

    p {
      margin: 0;
      font-size: $font-size-sm;
      color: $color-danger;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: $spacing-6;
    padding: $spacing-6;
    background-color: $color-bg-white;
    border-radius: $radius-lg;
    border: 1px solid $color-border;

    @include mobile {
      flex-direction: column;
      gap: $spacing-4;
      padding: $spacing-4;
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  &__meta {
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-top: $spacing-1;
  }

  &__actions {
    display: flex;
    gap: $spacing-2;
  }

  &__section {
    padding: $spacing-6;
    background-color: $color-bg-white;
    border-radius: $radius-lg;
    border: 1px solid $color-border;
    margin-bottom: $spacing-4;

    @include mobile {
      padding: $spacing-4;
    }

    h3 {
      margin-bottom: $spacing-4;
      font-size: $font-size-base;
    }
  }

  &__text {
    color: $color-text-secondary;
    line-height: $line-height-normal;
  }

  &__assets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: $spacing-4;

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  &__empty {
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__namings {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

  &__confirm-text {
    font-size: $font-size-sm;
    color: $color-text;
    line-height: $line-height-normal;
  }

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

    &:has(input:checked) {
      border-color: $color-primary;
      background-color: rgba($color-primary, 0.05);
    }

    input[type='radio'] {
      margin: 0;
    }
  }

  &__mode-badge {
    margin: 0;
  }
}

.asset-slot {
  display: flex;
  flex-direction: column;
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  transition:
    box-shadow $transition-fast,
    border-color $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }

  &__preview {
    aspect-ratio: 1;
    background-color: $color-bg;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__empty-text {
    font-size: $font-size-xs;
    color: $color-text-muted;
    padding: $spacing-4;
    text-align: center;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: $spacing-3;
    padding-inline: $spacing-4;
    padding-block-start: $spacing-3;
    padding-block-end: $spacing-3;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
    color: $color-text;
  }

  &__ratio-input {
    margin: 0;
    font-weight: $font-weight-normal;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
  }

  &__file-input {
    display: none;
  }

  &__footer {
    padding: $spacing-2 $spacing-4 $spacing-3;
  }

  &__uploader {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}

.naming-chip {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background-color: $color-bg;
  border: 1px solid $color-border;
  border-radius: $radius-full;
  font-size: $font-size-sm;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-2 $spacing-3;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;

  &--light {
    background-color: #fff9e6;
    color: #b8860b;
    border: 1px solid #f0e68c;
  }

  &--dark {
    background-color: #1a1a2e;
    color: #e0e0e0;
    border: 1px solid #333;
  }

  &--none {
    background-color: $color-bg;
    color: $color-text-muted;
    border: 1px solid $color-border;
  }
}
</style>
