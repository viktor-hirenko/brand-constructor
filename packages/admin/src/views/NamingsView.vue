<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ExternalNaming, InternalNaming, Concept } from '@brand-constructor/shared'
import { useApiList, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import { useDeleteAnimation } from '@/composables/useDeleteAnimation'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import NamingDomainModeField from '@/components/namings/NamingDomainModeField.vue'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import pencilSimple from '@phosphor-icons/core/regular/pencil-simple.svg?raw'
import trash from '@phosphor-icons/core/regular/trash.svg?raw'
import { countUk } from '@/utils/pluralUk'
import {
  buildDomainModeBody,
  domainPreviewErrorText,
  canSaveDomainMode,
  initialDomainMode,
  resolveNamingPrice,
  resolveNamingStatusBadge,
  type DomainMode,
} from '@/utils/namingDomainStatus'

interface DomainPreview {
  available: boolean
  price: number | null
  currency: string | null
  checkedAt: string
}

const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('external_namings'))

const activeTab = ref<'external' | 'internal'>('external')
const conceptFilter = ref<string>('all')
const statusFilter = ref<'all' | 'active' | 'used'>('all')

type ExternalNamingRow = ExternalNaming & {
  concept_name: string | null
  author_name: string
  brand_name: string | null
}

type CheckDomainPostResult =
  | ExternalNamingRow
  | { skipped: true; reason: string }

function isCheckDomainSkipped(r: CheckDomainPostResult): r is { skipped: true; reason: string } {
  return 'skipped' in r && r.skipped === true
}

const {
  data: externalNamings,
  loading: extLoading,
  total: extTotal,
  fetchData: fetchExternal,
} = useApiList<ExternalNamingRow>('/api/namings/external')

const {
  data: internalNamings,
  loading: intLoading,
  total: intTotal,
  fetchData: fetchInternal,
} = useApiList<InternalNaming & { author_name: string; brand_name: string | null }>(
  '/api/namings/internal'
)

const { data: concepts, fetchData: fetchConcepts } = useApiList<Concept>('/api/concepts')

const sortedConcepts = computed(() =>
  [...concepts.value].sort((a, b) => a.name.localeCompare(b.name))
)

const {
  sortedData: sortedExternal,
  sortField: extSortField,
  sortDirection: extSortDir,
  toggleSort: toggleExtSort,
} = useTableSort(externalNamings, 'created_at', 'desc')

const {
  sortedData: sortedInternal,
  sortField: intSortField,
  sortDirection: intSortDir,
  toggleSort: toggleIntSort,
} = useTableSort(internalNamings, 'created_at', 'desc')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const newName = ref('')
const newTagline = ref('')
const newDomain = ref('')
const newConceptId = ref<string | null>(null)
const newDomainMode = ref<DomainMode>('automatic')
const newPurchasePrice = ref('')
const creating = ref(false)

const createPreviewLoading = ref(false)
const createPreviewError = ref<string | null>(null)
const createPreviewData = ref<DomainPreview | null>(null)
const createPreviewAttempted = ref(false)
let createPreviewTimer: ReturnType<typeof setTimeout> | null = null

const editId = ref('')
const editName = ref('')
const editTagline = ref('')
const editDomain = ref('')
const editPreviewLoading = ref(false)
const editPreviewError = ref<string | null>(null)
const editPreviewData = ref<DomainPreview | null>(null)
const editPreviewAttempted = ref(false)
let editPreviewTimer: ReturnType<typeof setTimeout> | null = null
const editDomainMode = ref<DomainMode>('automatic')
const editPurchasePrice = ref('')
const editConceptId = ref<string | null>(null)
const editDomainCheckSource = ref<string | null>(null)
const saving = ref(false)

const checkingDomainId = ref<string | null>(null)

function clearCreatePreviewTimer() {
  if (createPreviewTimer) {
    clearTimeout(createPreviewTimer)
    createPreviewTimer = null
  }
}

function clearEditPreviewTimer() {
  if (editPreviewTimer) {
    clearTimeout(editPreviewTimer)
    editPreviewTimer = null
  }
}

function resetCreateDomainPreview() {
  clearCreatePreviewTimer()
  createPreviewLoading.value = false
  createPreviewError.value = null
  createPreviewData.value = null
  createPreviewAttempted.value = false
}

function resetEditDomainPreview() {
  clearEditPreviewTimer()
  editPreviewLoading.value = false
  editPreviewError.value = null
  editPreviewData.value = null
  editPreviewAttempted.value = false
}

async function loadCreateDomainPreview() {
  const raw = newDomain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetCreateDomainPreview()
    return
  }
  createPreviewLoading.value = true
  createPreviewError.value = null
  createPreviewData.value = null
  createPreviewAttempted.value = false
  try {
    const data = await apiPost<DomainPreview | null>('/api/namings/external/preview-domain', {
      domain: raw,
    })
    createPreviewData.value = data
  } catch (e) {
    createPreviewError.value = domainPreviewErrorText(e instanceof Error ? e.message : null)
  } finally {
    createPreviewLoading.value = false
    createPreviewAttempted.value = true
  }
}

function scheduleCreateDomainPreview() {
  clearCreatePreviewTimer()
  createPreviewTimer = setTimeout(() => {
    createPreviewTimer = null
    void loadCreateDomainPreview()
  }, 500)
}

async function loadEditDomainPreview() {
  const raw = editDomain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetEditDomainPreview()
    return
  }
  editPreviewLoading.value = true
  editPreviewError.value = null
  editPreviewData.value = null
  editPreviewAttempted.value = false
  try {
    const data = await apiPost<DomainPreview | null>('/api/namings/external/preview-domain', {
      domain: raw,
    })
    editPreviewData.value = data
  } catch (e) {
    editPreviewError.value = domainPreviewErrorText(e instanceof Error ? e.message : null)
  } finally {
    editPreviewLoading.value = false
    editPreviewAttempted.value = true
  }
}

function scheduleEditDomainPreview() {
  clearEditPreviewTimer()
  editPreviewTimer = setTimeout(() => {
    editPreviewTimer = null
    void loadEditDomainPreview()
  }, 500)
}

function refreshList(options?: { silent?: boolean }) {
  // No page switcher: ask for the server's maximum (500). The default 20 hid
  // every naming past the twentieth — 38 external ones in prod on 29.09 — and
  // 100 hid the older ones on the stage, 160 on 06.10.
  const params: Record<string, string> = { status: statusFilter.value, per_page: '500' }
  if (activeTab.value === 'external') {
    if (conceptFilter.value !== 'all') {
      params.filter = conceptFilter.value
    }
    fetchExternal({ queryParams: params, silent: options?.silent })
  } else {
    fetchInternal({ queryParams: params, silent: options?.silent })
  }
}

onMounted(() => {
  refreshList()
  fetchConcepts({ per_page: '100', status: 'all' })
})
watch([activeTab, conceptFilter, statusFilter], () => refreshList())

const pollingPaused = computed(() => showCreateModal.value || showEditModal.value)
useListPolling(() => refreshList({ silent: true }), { paused: pollingPaused })

watch([newDomain, showCreateModal, activeTab], () => {
  if (!showCreateModal.value) {
    resetCreateDomainPreview()
    return
  }
  if (activeTab.value !== 'external') {
    resetCreateDomainPreview()
    return
  }
  const raw = newDomain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetCreateDomainPreview()
    return
  }
  scheduleCreateDomainPreview()
})

watch([editDomain, showEditModal, activeTab], () => {
  if (!showEditModal.value) {
    resetEditDomainPreview()
    return
  }
  if (activeTab.value !== 'external') {
    resetEditDomainPreview()
    return
  }
  const raw = editDomain.value.trim()
  if (!raw || !raw.includes('.')) {
    resetEditDomainPreview()
    return
  }
  scheduleEditDomainPreview()
})

function formatPreviewPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2)
}

function openCreateModal() {
  newName.value = ''
  newTagline.value = ''
  newDomain.value = ''
  newConceptId.value = null
  newDomainMode.value = 'automatic'
  newPurchasePrice.value = ''
  resetCreateDomainPreview()
  fetchConcepts({ per_page: '100' })
  showCreateModal.value = true
}

const canCreate = computed(
  () =>
    newName.value.trim() !== '' &&
    (activeTab.value !== 'external' || canSaveDomainMode(newDomainMode.value, newPurchasePrice.value))
)

const editWasForSale = computed(() => editDomainCheckSource.value === 'admin_override')

const canSaveEdit = computed(
  () =>
    editName.value.trim() !== '' &&
    (activeTab.value !== 'external' || canSaveDomainMode(editDomainMode.value, editPurchasePrice.value))
)

async function handleCreate() {
  if (!canCreate.value) return
  creating.value = true
  try {
    if (activeTab.value === 'external') {
      await apiPost('/api/namings/external', {
        name: newName.value.trim(),
        tagline: newTagline.value.trim(),
        domain: newDomain.value.trim() || null,
        concept_id: newConceptId.value || null,
        ...buildDomainModeBody(newDomainMode.value, newPurchasePrice.value, false),
      })
    } else {
      await apiPost('/api/namings/internal', {
        name: newName.value.trim(),
        tagline: newTagline.value.trim(),
      })
    }
    showCreateModal.value = false
    resetCreateDomainPreview()
    refreshList({ silent: true })
  } finally {
    creating.value = false
  }
}

type InternalNamingRow = InternalNaming & { author_name: string }

function openEditModal(naming: ExternalNamingRow | InternalNamingRow) {
  resetEditDomainPreview()
  editId.value = naming.id
  editName.value = naming.name
  editTagline.value = naming.tagline || ''
  if ('concept_id' in naming) {
    const extNaming = naming as ExternalNamingRow
    editConceptId.value = extNaming.concept_id
    editDomain.value = extNaming.domain || ''
    editDomainCheckSource.value = extNaming.domain_check_source || null
    editDomainMode.value = initialDomainMode(extNaming.domain_check_source)
    editPurchasePrice.value =
      extNaming.purchase_price != null ? String(extNaming.purchase_price) : ''
  } else {
    editConceptId.value = null
    editDomain.value = ''
    editDomainCheckSource.value = null
    editDomainMode.value = 'automatic'
    editPurchasePrice.value = ''
  }
  fetchConcepts({ per_page: '100' })
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (!canSaveEdit.value) return
  saving.value = true
  try {
    const type = activeTab.value
    const body: Record<string, unknown> = {
      name: editName.value.trim(),
      tagline: editTagline.value.trim(),
    }
    if (type === 'external') {
      body.concept_id = editConceptId.value || null
      body.domain = editDomain.value.trim() || null
      Object.assign(
        body,
        buildDomainModeBody(editDomainMode.value, editPurchasePrice.value, editWasForSale.value)
      )
    }
    await apiPut(`/api/namings/${type}/${editId.value}`, body)
    showEditModal.value = false
    resetEditDomainPreview()
    refreshList({ silent: true })
  } finally {
    saving.value = false
  }
}

async function handleCheckDomain(namingId: string) {
  checkingDomainId.value = namingId
  try {
    const data = await apiPost<CheckDomainPostResult>(
      `/api/namings/external/${namingId}/check-domain`,
      {}
    )
    if (isCheckDomainSkipped(data)) {
      return
    }
    const idx = externalNamings.value.findIndex((n) => n.id === namingId)
    if (idx === -1) {
      await fetchExternal()
      return
    }
    const next = externalNamings.value.slice()
    next[idx] = data
    externalNamings.value = next
  } catch {
    // Silently handle — status will remain as-is
  } finally {
    checkingDomainId.value = null
  }
}

type SourceKind = 'auto' | 'manual' | 'override'

function getSourceKind(n: ExternalNamingRow): SourceKind {
  if (n.domain_check_source === 'admin_override') return 'override'
  if (n.domain_check_source === 'pananames') return 'auto'
  return 'manual'
}

function getSourceLetter(n: ExternalNamingRow): string {
  switch (getSourceKind(n)) {
    case 'override':
      return 'O'
    case 'auto':
      return 'A'
    default:
      return 'M'
  }
}

function getSourceTooltip(n: ExternalNamingRow): string {
  switch (getSourceKind(n)) {
    case 'override':
      return 'Вручну — встановила команда, нічна перевірка пропускає'
    case 'auto':
      return 'Автоматично — перевірка Pananames'
    default:
      return 'Вручну — автоматично не перевірялось'
  }
}

const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')
const deleteTargetName = ref('')

function handleDeleteNaming(id: string, name: string) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteConfirm.value = true
}

const deleteError = ref<string | null>(null)

const { transitionName, playDelete } = useDeleteAnimation()

async function confirmDeleteNaming() {
  deleteError.value = null
  try {
    const type = activeTab.value
    const id = deleteTargetId.value
    await apiDelete(`/api/namings/${type}/${id}`)
    showDeleteConfirm.value = false
    // In place + quiet refresh — see BrandsView `confirmDeleteBrand`.
    playDelete(() => {
      if (type === 'external') externalNamings.value = externalNamings.value.filter(n => n.id !== id)
      else internalNamings.value = internalNamings.value.filter(n => n.id !== id)
    }, () => refreshList({ silent: true }))
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Не вдалося видалити неймінг'
  }
}
</script>

<template>
  <div class="namings-view">
    <div class="namings-view__tabs">
      <button
        class="namings-view__tab"
        :class="{ 'namings-view__tab--active': activeTab === 'external' }"
        @click="activeTab = 'external'"
      >
        External Naming
      </button>
      <button
        class="namings-view__tab"
        :class="{ 'namings-view__tab--active': activeTab === 'internal' }"
        @click="activeTab = 'internal'"
      >
        Internal Naming
      </button>
    </div>

    <div class="namings-view__status-tabs">
      <button
        class="namings-view__status-tab"
        :class="{ 'namings-view__status-tab--active': statusFilter === 'all' }"
        @click="statusFilter = 'all'"
      >
        Усі
      </button>
      <button
        class="namings-view__status-tab"
        :class="{ 'namings-view__status-tab--active': statusFilter === 'active' }"
        @click="statusFilter = 'active'"
      >
        Не використані
      </button>
      <button
        class="namings-view__status-tab"
        :class="{ 'namings-view__status-tab--active': statusFilter === 'used' }"
        @click="statusFilter = 'used'"
      >
        Використані
      </button>
    </div>

    <div class="namings-view__toolbar">
      <div class="namings-view__filters">
        <select
          v-if="activeTab === 'external'"
          v-model="conceptFilter"
          class="namings-view__select"
        >
          <option value="all">Усі неймінги</option>
          <option value="linked">З концептом</option>
          <option value="standalone">Без концепту</option>
        </select>
        <span class="namings-view__count">
          {{ countUk(activeTab === 'external' ? extTotal : intTotal, 'неймінг', 'неймінги', 'неймінгів') }}
        </span>
      </div>
      <BaseButton v-if="canWrite" @click="openCreateModal"> + Новий неймінг </BaseButton>
    </div>

    <div v-if="activeTab === 'external' ? extLoading : intLoading" class="namings-view__loading">
      Завантаження…
    </div>

    <div v-else class="namings-view__table-wrap">
      <table class="namings-view__table">
        <thead>
          <template v-if="activeTab === 'external'">
            <tr>
              <th class="sortable-th" @click="toggleExtSort('name')">
                Назва
                <span v-if="extSortField === 'name'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('domain')">
                Домен
                <span v-if="extSortField === 'domain'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('price')">
                Ціна
                <span v-if="extSortField === 'price'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('availability_status')">
                Статус домену
                <span v-if="extSortField === 'availability_status'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th>Використання</th>
              <th class="sortable-th" @click="toggleExtSort('concept_name')">
                Концепт
                <span v-if="extSortField === 'concept_name'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('author_name')">
                Автор
                <span v-if="extSortField === 'author_name'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('created_at')">
                Створено
                <span v-if="extSortField === 'created_at'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th v-if="canWrite">Дії</th>
            </tr>
          </template>
          <template v-else>
            <tr>
              <th class="sortable-th" @click="toggleIntSort('name')">
                Назва
                <span v-if="intSortField === 'name'" class="sort-arrow">{{
                  intSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th>Використання</th>
              <th class="sortable-th" @click="toggleIntSort('author_name')">
                Автор
                <span v-if="intSortField === 'author_name'" class="sort-arrow">{{
                  intSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleIntSort('created_at')">
                Створено
                <span v-if="intSortField === 'created_at'" class="sort-arrow">{{
                  intSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th v-if="canWrite">Дії</th>
            </tr>
          </template>
        </thead>
        <TransitionGroup tag="tbody" :name="transitionName">
          <template v-if="activeTab === 'external'">
            <tr v-for="n in sortedExternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
                </div>
              </td>
              <td>{{ n.domain || '—' }}</td>
              <td>
                <span v-if="resolveNamingPrice(n)" class="namings-view__price-cell">
                  {{ resolveNamingPrice(n)?.amount }}
                </span>
                <span v-else>—</span>
              </td>
              <td>
                <div class="namings-view__availability-cell">
                  <div class="namings-view__availability-row">
                    <span
                      class="namings-view__status-badge"
                      :class="`namings-view__status-badge--${resolveNamingStatusBadge(n.availability_status).modifier}`"
                    >
                      {{ resolveNamingStatusBadge(n.availability_status).label }}
                    </span>
                    <span
                      class="namings-view__source-badge"
                      :class="`namings-view__source-badge--${getSourceKind(n)}`"
                      :title="getSourceTooltip(n)"
                      :aria-label="getSourceTooltip(n)"
                    >
                      {{ getSourceLetter(n) }}
                    </span>
                    <BaseButton
                      v-if="
                        canWrite &&
                        n.domain &&
                        !n.used_in_brand_id &&
                        n.domain_check_source !== 'admin_override'
                      "
                      variant="ghost"
                      size="sm"
                      :loading="checkingDomainId === n.id"
                      class="namings-view__recheck-btn"
                      title="Перевірити домен ще раз"
                      aria-label="Перевірити домен ще раз"
                      @click.stop="handleCheckDomain(n.id)"
                    >
                      <svg
                        class="namings-view__recheck-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                    </BaseButton>
                  </div>
                </div>
              </td>
              <td>
                <span
                  v-if="n.status === 'used'"
                  class="namings-view__usage-badge namings-view__usage-badge--used"
                >
                  У бренді {{ n.brand_name || '—' }}
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ n.concept_name || '—' }}</td>
              <td>{{ n.author_name }}</td>
              <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
              <td v-if="canWrite" class="namings-view__actions">
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="secondary"
                  size="sm"
                  class="namings-view__icon-btn"
                  title="Редагувати"
                  aria-label="Редагувати"
                  @click="openEditModal(n)"
                >
                  <PhosphorIcon :svg="pencilSimple" class="namings-view__icon" />
                </BaseButton>
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="danger"
                  size="sm"
                  class="namings-view__icon-btn"
                  title="Видалити"
                  aria-label="Видалити"
                  @click="handleDeleteNaming(n.id, n.name)"
                >
                  <PhosphorIcon :svg="trash" class="namings-view__icon" />
                </BaseButton>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="n in sortedInternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline">{{ n.tagline }}</span>
                </div>
              </td>
              <td>
                <span
                  v-if="n.status === 'used'"
                  class="namings-view__usage-badge namings-view__usage-badge--used"
                >
                  У бренді {{ n.brand_name || '—' }}
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ n.author_name }}</td>
              <td>{{ new Date(n.created_at).toLocaleDateString() }}</td>
              <td v-if="canWrite" class="namings-view__actions">
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="secondary"
                  size="sm"
                  class="namings-view__icon-btn"
                  title="Редагувати"
                  aria-label="Редагувати"
                  @click="openEditModal(n)"
                >
                  <PhosphorIcon :svg="pencilSimple" class="namings-view__icon" />
                </BaseButton>
                <BaseButton
                  v-if="!n.used_in_brand_id"
                  variant="danger"
                  size="sm"
                  class="namings-view__icon-btn"
                  title="Видалити"
                  aria-label="Видалити"
                  @click="handleDeleteNaming(n.id, n.name)"
                >
                  <PhosphorIcon :svg="trash" class="namings-view__icon" />
                </BaseButton>
              </td>
            </tr>
          </template>
        </TransitionGroup>
      </table>
    </div>

    <BaseModal
      v-if="showCreateModal"
      :title="`Новий ${activeTab === 'external' ? 'External' : 'Internal'} Naming`"
      @close="showCreateModal = false"
    >
      <form class="namings-view__form" @submit.prevent="handleCreate">
        <BaseInput v-model="newName" label="Назва" placeholder="Введіть назву…" required />
        <BaseInput v-model="newTagline" label="Опис" placeholder="Короткий опис…" />
        <template v-if="activeTab === 'external'">
          <BaseInput v-model="newDomain" label="Домен" placeholder="напр. example.com" />
          <div
            v-if="newDomain.trim() && newDomain.includes('.')"
            class="namings-view__domain-preview"
          >
            <p v-if="createPreviewLoading" class="namings-view__hint">
              Перевіряємо домен…
            </p>
            <p v-else-if="createPreviewError" class="namings-view__hint namings-view__hint--error">
              {{ createPreviewError }}
            </p>
            <template v-else-if="createPreviewData">
              <p class="namings-view__domain-preview-row">
                <span
                  class="namings-view__status-badge"
                  :class="
                    createPreviewData.available
                      ? 'namings-view__status-badge--available'
                      : 'namings-view__status-badge--sold'
                  "
                >
                  {{ createPreviewData.available ? 'Available' : 'Sold' }}
                </span>
                <span
                  v-if="createPreviewData.price != null"
                  class="namings-view__domain-preview-price"
                >
                  Реєстрація:
                  {{ createPreviewData.currency || 'USD' }}
                  {{ formatPreviewPrice(createPreviewData.price) }}
                </span>
              </p>
            </template>
            <p
              v-else-if="createPreviewAttempted && !createPreviewLoading"
              class="namings-view__hint"
            >
              Не вдалося перевірити домен. Статус і ціна з'являться після збереження.
            </p>
          </div>
          <NamingDomainModeField
            v-model:mode="newDomainMode"
            v-model:purchase-price="newPurchasePrice"
            name="create-domain-mode"
          />
          <div class="namings-view__field">
            <label class="namings-view__label">Концепт</label>
            <select v-model="newConceptId" class="namings-view__select namings-view__select--full">
              <option :value="null">— Без концепту —</option>
              <option v-for="c in sortedConcepts" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Скасувати</BaseButton>
        <BaseButton :loading="creating" :disabled="!canCreate" @click="handleCreate">
          Створити
        </BaseButton>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showDeleteConfirm"
      title="Видалити неймінг"
      width="420px"
      @close="showDeleteConfirm = false"
    >
      <p class="namings-view__confirm-text">
        Видалити <strong>«{{ deleteTargetName }}»</strong>? Цю дію не можна скасувати.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteConfirm = false">Скасувати</BaseButton>
        <BaseButton variant="danger" @click="confirmDeleteNaming">Видалити</BaseButton>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showEditModal"
      :title="`Редагувати ${activeTab === 'external' ? 'External' : 'Internal'} Naming`"
      @close="showEditModal = false"
    >
      <form class="namings-view__form" @submit.prevent="handleSaveEdit">
        <BaseInput v-model="editName" label="Назва" placeholder="Введіть назву…" required />
        <BaseInput v-model="editTagline" label="Опис" placeholder="Короткий опис…" />
        <template v-if="activeTab === 'external'">
          <BaseInput v-model="editDomain" label="Домен" placeholder="напр. example.com" />
          <div
            v-if="editDomain.trim() && editDomain.includes('.')"
            class="namings-view__domain-preview"
          >
            <p v-if="editPreviewLoading" class="namings-view__hint">
              Перевіряємо домен…
            </p>
            <p v-else-if="editPreviewError" class="namings-view__hint namings-view__hint--error">
              {{ editPreviewError }}
            </p>
            <template v-else-if="editPreviewData">
              <p class="namings-view__domain-preview-row">
                <span
                  class="namings-view__status-badge"
                  :class="
                    editPreviewData.available
                      ? 'namings-view__status-badge--available'
                      : 'namings-view__status-badge--sold'
                  "
                >
                  {{ editPreviewData.available ? 'Available' : 'Sold' }}
                </span>
                <span
                  v-if="editPreviewData.price != null"
                  class="namings-view__domain-preview-price"
                >
                  Реєстрація:
                  {{ editPreviewData.currency || 'USD' }}
                  {{ formatPreviewPrice(editPreviewData.price) }}
                </span>
              </p>
            </template>
            <p v-else-if="editPreviewAttempted && !editPreviewLoading" class="namings-view__hint">
              Не вдалося перевірити домен. Статус і ціна з'являться після збереження.
            </p>
          </div>
          <NamingDomainModeField
            v-model:mode="editDomainMode"
            v-model:purchase-price="editPurchasePrice"
            name="edit-domain-mode"
            :was-for-sale="editWasForSale"
          />
          <div class="namings-view__field">
            <label class="namings-view__label">Концепт</label>
            <select v-model="editConceptId" class="namings-view__select namings-view__select--full">
              <option :value="null">— Без концепту —</option>
              <option v-for="c in sortedConcepts" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Скасувати</BaseButton>
        <BaseButton :loading="saving" :disabled="!canSaveEdit" @click="handleSaveEdit">
          Зберегти
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.namings-view {
  // Only the rows scroll: everything above the table and the column titles
  // stay in view (owner, 29.09 — on a 16" MacBook the titles scrolled away).
  // The table box is the scroller because it already scrolls sideways, and a
  // sticky header can only stick inside its nearest scrolling box. Phones keep
  // the whole page scrolling: a pinned top would eat half the screen there.
  @include mq($bp-md) {
    display: flex;
    flex-direction: column;
    height: 100%;

    // Only the table gives up height; the tab rows scroll sideways, so they
    // would otherwise shrink to nothing.
    > :not(.namings-view__table-wrap) {
      flex-shrink: 0;
    }
  }

  &__tabs {
    display: flex;
    gap: $spacing-1;
    margin-bottom: $spacing-6;
    border-bottom: 1px solid $color-border;
  }

  &__tab {
    padding: $spacing-3 $spacing-4;
    border: none;
    background: none;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: $color-text;
    }

    &--active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-4;

    @include mobile {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-3;
    }
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: $spacing-3;

    @include mobile {
      flex-wrap: wrap;
    }
  }

  &__select {
    padding: $spacing-2 $spacing-3;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    background-color: $color-bg-white;
  }

  &__count {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__loading {
    text-align: center;
    padding: $spacing-12;
    color: $color-text-secondary;
  }

  &__table-wrap {
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    overflow: hidden;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    @include mq($bp-md) {
      flex: 0 1 auto;
      min-height: 240px;
      overflow: auto;
    }
  }

  &__table {
    width: 100%;
    border-spacing: 0;

    @include mobile {
      min-width: 560px;
    }
    border-collapse: separate;
    background-color: $color-bg-white;

    th,
    td {
      padding: $spacing-3 $spacing-3;
      text-align: left;
      border-bottom: 1px solid $color-border;
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    th {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background-color: $color-bg;

      @include mq($bp-md) {
        position: sticky;
        top: 0;
        z-index: 1;
      }

      &.sortable-th {
        cursor: pointer;
        user-select: none;
        transition: color $transition-fast;

        &:hover {
          color: $color-text;
        }
      }

      .sort-arrow {
        display: inline-block;
        margin-left: 2px;
        font-size: $font-size-xs;
        color: $color-primary;
      }
    }

    td {
      font-size: $font-size-sm;
      vertical-align: middle;
    }
  }

  &__name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-weight: $font-weight-medium;
    line-height: 1.4;
  }

  &__tagline {
    font-size: $font-size-xs;
    color: $color-text-secondary;
    line-height: 1.3;
  }

  // Pencil and bin instead of «Редагувати» / «Видалити», side by side: the
  // Ukrainian words pushed «Видалити» off a 1440 screen, and stacking them was
  // rejected by the owner (06.10). The word stays as the tooltip and label.
  &__actions {
    white-space: nowrap;

    :deep(button) {
      margin-right: $spacing-2;

      &:last-child {
        margin-right: 0;
      }
    }
  }

  :deep(.namings-view__icon-btn) {
    padding: $spacing-1 $spacing-2;
  }

  :deep(.namings-view__icon-btn .btn__content) {
    display: inline-flex;
    align-items: center;
  }

  &__icon {
    width: 16px;
    height: 16px;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text;
  }

  &__select--full {
    width: 100%;
  }

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

    &--for-sale {
      background-color: #fef3c7;
      color: #92400e;
    }

    &--unknown {
      background-color: $color-bg;
      color: $color-text-muted;
    }
  }

  // Amount only: the status badge next to it already says whether it is the
  // registration or the purchase price (owner, 06.10).
  &__price-cell {
    white-space: nowrap;
  }


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

  &__usage-badge {
    display: inline-flex;
    align-items: center;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-sm;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    white-space: nowrap;

    &--used {
      background-color: #e2e3e5;
      color: #383d41;
    }
  }

  &__confirm-text {
    font-size: $font-size-sm;
    color: $color-text;
    line-height: $line-height-normal;
  }

  &__availability-cell {
    min-width: 0;
  }

  &__availability-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: $spacing-1 $spacing-2;
  }

  &__source-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    padding: 4px 6px;
    border-radius: $radius-sm;
    font-size: 11px;
    font-weight: $font-weight-semibold;
    line-height: 1.2;
    cursor: default;
    user-select: none;

    &--auto {
      color: #334155;
      background-color: #e2e8f0;
    }

    &--manual {
      color: #475569;
      background-color: #f1f5f9;
    }

    &--override {
      color: #92400e;
      background-color: #fef3c7;
    }
  }

  :deep(.namings-view__recheck-btn) {
    flex-shrink: 0;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    padding: $spacing-1 $spacing-1;

    &:hover:not(:disabled) {
      background-color: $color-bg;
    }
  }

  :deep(.namings-view__recheck-btn .btn__content) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &__recheck-icon {
    width: 16px;
    height: 16px;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $color-text-muted;
    line-height: $line-height-normal;

    &--error {
      color: #b91c1c;
    }
  }

}
</style>
