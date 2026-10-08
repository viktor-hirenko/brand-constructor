<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type {
  ExternalNaming,
  InternalNaming,
  Concept,
  NamingPriceHealth,
  NamingPriceSourceReading,
} from '@brand-constructor/shared'
import { useApiList, apiGet, apiPost, apiPut, apiDelete } from '@/composables/useApi'
import NamingPriceHealthNotice from '@/components/namings/NamingPriceHealthNotice.vue'
import { useListPolling } from '@/composables/useListPolling'
import { useTableSort } from '@/composables/useTableSort'
import { useAuthStore } from '@/stores/auth'
import { useDeleteAnimation } from '@/composables/useDeleteAnimation'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import RowAction from '@/components/ui/RowAction.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SearchSelect from '@/components/ui/SearchSelect.vue'
import NamingDomainModeField from '@/components/namings/NamingDomainModeField.vue'
import NamingPriceCheckModal from '@/components/namings/NamingPriceCheckModal.vue'
import NamingHelpModal from '@/components/namings/NamingHelpModal.vue'
import {
  DOMAIN_CARD_HINT,
  FILTER_HINTS,
  PRICE_COLUMN_HINT,
  STATUS_COLUMN_HINT,
  priceHint,
  statusHint,
} from '@/utils/namingHelp'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import arrowUp from '@phosphor-icons/core/regular/arrow-up.svg?raw'
import arrowDown from '@phosphor-icons/core/regular/arrow-down.svg?raw'
import warningCircle from '@phosphor-icons/core/fill/warning-circle-fill.svg?raw'
import { countUk } from '@/utils/pluralUk'
import {
  DOMAIN_FILTERS,
  OPTIONAL_FILTERS,
  countDomainFilters,
  decisionTitle,
  displayedPrice,
  filterNamings,
  isForBrief,
  matchesQuery,
  type DomainFilter,
} from '@/utils/namingFilters'
import {
  buildDomainModeBody,
  domainPreviewProblem,
  type DomainPreviewProblem,
  canSaveDomainMode,
  resolveNamingPrice,
  resolveNamingStatusBadge,
  type DomainMode,
} from '@/utils/namingDomainStatus'
import {
  describeDomainCard,
  initialPriceMode,
  needsDecision,
  priceCellExtras,
  priceDecisionErrorText,
  keptOffer,
  priceOffer,
  recheckKind,
  type DomainCard,
} from '@/utils/namingPriceCheck'

interface DomainPreview {
  available: boolean
  price: number | null
  currency: string | null
  checkedAt: string
}

const authStore = useAuthStore()
const canWrite = computed(() => authStore.canWriteLibrary('external_namings'))

const activeTab = ref<'external' | 'internal'>('external')
// 'all' | 'linked' | 'standalone' | a concept's id
const conceptFilter = ref<string>('all')
// Search and the quick filters work on the rows already loaded.
const searchQuery = ref('')
const domainFilter = ref<DomainFilter | null>(null)
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

// Concepts are picked by typing (SearchSelect): the list grows with the library.
const conceptOptions = computed(() => sortedConcepts.value.map(c => ({ value: c.id, label: c.name })))
/** The «Концепт» field of the create and edit windows. */
const conceptChoiceOptions = computed(() => [{ value: null, label: '— Без концепту —' }, ...conceptOptions.value])
/** The filter above the table. */
const conceptFilterOptions = computed(() => [
  { value: 'all', label: 'Усі концепти' },
  { value: 'linked', label: 'З концептом' },
  { value: 'standalone', label: 'Без концепту' },
  ...conceptOptions.value,
])

const searchedExternal = computed(() =>
  filterNamings(externalNamings.value, { query: searchQuery.value, domain: null })
)
const filteredExternal = computed(() =>
  filterNamings(externalNamings.value, { query: searchQuery.value, domain: domainFilter.value })
)
// An internal naming has no domain: of the quick filters only «Для брифу» is its own.
const searchedInternal = computed(() => internalNamings.value.filter(n => matchesQuery(n, searchQuery.value)))
const filteredInternal = computed(() =>
  domainFilter.value === 'for_brief' ? searchedInternal.value.filter(isForBrief) : searchedInternal.value
)
/** The number on each quick filter: what it would leave of the rows found. */
const domainFilterCounts = computed(() =>
  activeTab.value === 'external'
    ? countDomainFilters(searchedExternal.value)
    : { ...countDomainFilters([]), for_brief: searchedInternal.value.filter(isForBrief).length }
)
const visibleDomainFilters = computed(() =>
  // «Потрібне рішення» and «Для брифу» are there only while they would leave something.
  DOMAIN_FILTERS.filter(f => {
    if (activeTab.value === 'internal' && f.id !== 'for_brief') return false
    return !OPTIONAL_FILTERS.includes(f.id) || domainFilterCounts.value[f.id] > 0 || domainFilter.value === f.id
  })
)

const {
  sortedData: sortedExternal,
  sortField: extSortField,
  sortDirection: extSortDir,
  toggleSort: toggleExtSort,
} = useTableSort(filteredExternal, 'created_at', 'desc', (n, field) =>
  // «Ціна» sorts by the price the row shows, not by the registration column.
  field === 'price' ? displayedPrice(n) : (n as unknown as Record<string, unknown>)[field]
)

const {
  sortedData: sortedInternal,
  sortField: intSortField,
  sortDirection: intSortDir,
  toggleSort: toggleIntSort,
} = useTableSort(filteredInternal, 'created_at', 'desc')

const shownCount = computed(() =>
  activeTab.value === 'external' ? filteredExternal.value.length : filteredInternal.value.length
)
const loadedCount = computed(() =>
  activeTab.value === 'external' ? externalNamings.value.length : internalNamings.value.length
)

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
const createPreviewError = ref<DomainPreviewProblem | null>(null)
const createPreviewData = ref<DomainPreview | null>(null)
const createPreviewAttempted = ref(false)
let createPreviewTimer: ReturnType<typeof setTimeout> | null = null

const editId = ref('')
const editName = ref('')
const editTagline = ref('')
const editDomain = ref('')
const editPreviewLoading = ref(false)
const editPreviewError = ref<DomainPreviewProblem | null>(null)
const editPreviewData = ref<DomainPreview | null>(null)
const editPreviewAttempted = ref(false)
let editPreviewTimer: ReturnType<typeof setTimeout> | null = null
const editDomainMode = ref<DomainMode>('automatic')
const editPurchasePrice = ref('')
const editConceptId = ref<string | null>(null)
const editDomainCheckSource = ref<string | null>(null)
const editPriceAuto = ref(false)
/** What the system found for the domain being edited, shown above the choice. */
const editFound = ref<DomainCard | null>(null)
/** The domain as saved and what the last check read about it — for the prices in the edit window. */
const editSavedDomain = ref<string | null>(null)
const editSavedSources = ref<NamingPriceSourceReading[] | null>(null)
const editSavedFree = ref(false)
const editFree = computed(
  () =>
    editPreviewData.value?.available === true ||
    (editSavedFree.value && editDomain.value.trim().toLowerCase() === (editSavedDomain.value ?? '').trim().toLowerCase())
)
const saving = ref(false)

const checkingDomainId = ref<string | null>(null)

// The card behind a price or a status: what the system knows of the domain.
const priceWindowId = ref<string | null>(null)
// «Як це працює»: the whole picture on one screen, for a person new to the table.
const showHelp = ref(false)
const priceWindowNaming = computed(
  () => externalNamings.value.find(n => n.id === priceWindowId.value) ?? null
)
const priceDeciding = ref<'accept' | 'keep' | 'reopen' | null>(null)
const priceDecisionError = ref<string | null>(null)

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
    createPreviewError.value = domainPreviewProblem(e instanceof Error ? e.message : null)
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
    editPreviewError.value = domainPreviewProblem(e instanceof Error ? e.message : null)
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
    if (conceptFilter.value === 'linked' || conceptFilter.value === 'standalone') {
      params.filter = conceptFilter.value
    } else if (conceptFilter.value !== 'all') {
      params.concept_id = conceptFilter.value
    }
    fetchExternal({ queryParams: params, silent: options?.silent })
  } else {
    fetchInternal({ queryParams: params, silent: options?.silent })
  }
}

// Last night's price check: did it reach the marketplaces. The table waits for
// the answer, so the line above it comes with the rows and pushes nothing down.
const priceHealth = ref<NamingPriceHealth | null>(null)
const priceHealthPending = ref(true)

async function loadPriceHealth() {
  try {
    priceHealth.value = await apiGet<NamingPriceHealth | null>('/api/namings/external/price-health')
  } catch {
    priceHealth.value = null
  } finally {
    priceHealthPending.value = false
  }
}

onMounted(() => {
  refreshList()
  loadPriceHealth()
  fetchConcepts({ per_page: '100', status: 'all' })
})
watch([activeTab, conceptFilter, statusFilter], () => refreshList())
// A quick filter of one tab means nothing on the other.
watch(activeTab, () => {
  domainFilter.value = null
})

const pollingPaused = computed(
  () => showCreateModal.value || showEditModal.value || priceWindowId.value !== null || showHelp.value
)
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

// A price a person typed (or an old manual status): «Автоматично» hands the
// row back to the system. A marketplace's price is automatic already.
const editWasForSale = computed(
  () => editDomainCheckSource.value === 'admin_override' && !editPriceAuto.value
)

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
    editPriceAuto.value = extNaming.price_auto === true
    editFound.value = extNaming.domain ? describeDomainCard(extNaming) : null
    editSavedDomain.value = extNaming.domain
    editSavedSources.value = extNaming.price_check?.sources ?? null
    editSavedFree.value = extNaming.availability_status === 'available'
    editDomainMode.value = initialPriceMode(extNaming)
    editPurchasePrice.value =
      extNaming.purchase_price != null ? String(extNaming.purchase_price) : ''
  } else {
    editConceptId.value = null
    editDomain.value = ''
    editDomainCheckSource.value = null
    editPriceAuto.value = false
    editFound.value = null
    editSavedDomain.value = null
    editSavedSources.value = null
    editSavedFree.value = false
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

function replaceExternalRow(row: ExternalNamingRow) {
  const idx = externalNamings.value.findIndex((n) => n.id === row.id)
  if (idx === -1) return false
  const next = externalNamings.value.slice()
  next[idx] = row
  externalNamings.value = next
  return true
}

/** «Перевірити зараз» in the card: the registrar and the marketplaces, as the row needs. */
async function handleCheckDomain(namingId: string, kind: 'domain' | 'price' = 'domain') {
  checkingDomainId.value = namingId
  try {
    const data = await apiPost<CheckDomainPostResult>(
      `/api/namings/external/${namingId}/${kind === 'price' ? 'check-price' : 'check-domain'}`,
      {}
    )
    if (isCheckDomainSkipped(data)) {
      return
    }
    if (!replaceExternalRow(data)) {
      await fetchExternal()
      return
    }
  } catch {
    // Silently handle — status will remain as-is
  } finally {
    checkingDomainId.value = null
  }
}

function openPriceWindow(namingId: string) {
  priceDecisionError.value = null
  priceWindowId.value = namingId
}

async function handlePriceDecision(action: 'accept' | 'keep' | 'reopen') {
  const naming = priceWindowNaming.value
  if (!naming) return
  const offer = action === 'reopen' ? keptOffer(naming) : priceOffer(naming.price_check)
  if (!offer) return
  priceDeciding.value = action
  priceDecisionError.value = null
  try {
    const row = await apiPost<ExternalNamingRow>(
      `/api/namings/external/${naming.id}/price-decision`,
      { action, ...offer }
    )
    replaceExternalRow(row)
    // «Змінити рішення» leaves the card open: the two buttons are back in it.
    if (action !== 'reopen') priceWindowId.value = null
  } catch (e) {
    priceDecisionError.value = priceDecisionErrorText(e instanceof Error ? e.message : null)
    refreshList({ silent: true })
  } finally {
    priceDeciding.value = null
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
        <SearchInput
          id="namings-search"
          v-model="searchQuery"
          :placeholder="activeTab === 'external' ? 'Пошук за назвою або доменом' : 'Пошук за назвою'"
        />
        <SearchSelect
          v-if="activeTab === 'external'"
          id="namings-concept-filter"
          v-model="conceptFilter"
          class="namings-view__concept-filter"
          :options="conceptFilterOptions"
          aria-label="Концепт"
        />
        <span class="namings-view__count">
          <template v-if="shownCount !== loadedCount">{{ shownCount }} із </template>
          {{ countUk(activeTab === 'external' ? extTotal : intTotal, 'неймінг', 'неймінги', 'неймінгів') }}
        </span>
      </div>
      <BaseButton v-if="canWrite" @click="openCreateModal"> + Новий неймінг </BaseButton>
    </div>

    <div v-if="visibleDomainFilters.length > 0" class="namings-view__domain-filters">
      <button
        v-for="f in visibleDomainFilters"
        :key="f.id"
        type="button"
        class="namings-view__status-tab"
        :class="{
          'namings-view__status-tab--active': domainFilter === f.id,
          'namings-view__status-tab--alert': f.id === 'decision',
        }"
        :aria-pressed="domainFilter === f.id"
        :title="FILTER_HINTS[f.id]"
        @click="domainFilter = domainFilter === f.id ? null : f.id"
      >
        {{ f.label }}
        <span class="namings-view__filter-count">{{ domainFilterCounts[f.id] }}</span>
      </button>
      <button v-if="activeTab === 'external'" type="button" class="namings-view__help-link" @click="showHelp = true">
        Як це працює?
      </button>
    </div>

    <NamingPriceHealthNotice v-if="activeTab === 'external' && !priceHealthPending" :health="priceHealth" />

    <div v-if="activeTab === 'external' ? extLoading || priceHealthPending : intLoading" class="namings-view__loading">
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
                <!-- A word on hover and no mark: the «i» beside it read as a thing of its own (the owner, 08.10). -->
                <span :title="PRICE_COLUMN_HINT">Ціна</span>
                <span v-if="extSortField === 'price'" class="sort-arrow">{{
                  extSortDir === 'asc' ? '\u2191' : '\u2193'
                }}</span>
              </th>
              <th class="sortable-th" @click="toggleExtSort('availability_status')">
                <!-- No mark here: this header is the widest thing in its column, and a mark would widen the table. -->
                <span :title="STATUS_COLUMN_HINT">Статус домену</span>
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
              <th v-if="canWrite" class="namings-view__actions-head">Дії</th>
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
              <th v-if="canWrite" class="namings-view__actions-head">Дії</th>
            </tr>
          </template>
        </thead>
        <TransitionGroup tag="tbody" :name="transitionName">
          <template v-if="activeTab === 'external'">
            <tr v-if="sortedExternal.length === 0" key="empty">
              <td :colspan="canWrite ? 9 : 8" class="namings-view__empty">Нічого не знайдено</td>
            </tr>
            <tr v-for="n in sortedExternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline" :title="n.tagline">{{ n.tagline }}</span>
                </div>
              </td>
              <td>
                <!-- The one way into the domain's card: the card is about the domain, its price and status are in it. -->
                <button
                  v-if="n.domain"
                  type="button"
                  class="namings-view__cell-button namings-view__domain-link"
                  :title="DOMAIN_CARD_HINT"
                  @click.stop="openPriceWindow(n.id)"
                >
                  {{ n.domain }}
                </button>
                <template v-else>—</template>
              </td>
              <td>
                <span v-if="resolveNamingPrice(n)" class="namings-view__price-cell" :title="priceHint(n.availability_status)">
                  {{ resolveNamingPrice(n)?.amount }}
                </span>
                <span v-else>—</span>
                <template v-if="priceCellExtras(n).trend">
                  <span
                    class="namings-view__price-trend"
                    :class="`namings-view__price-trend--${priceCellExtras(n).trend}`"
                    :title="priceCellExtras(n).trendTitle ?? undefined"
                    :aria-label="priceCellExtras(n).trendTitle ?? undefined"
                    role="img"
                  >
                    <PhosphorIcon
                      :svg="priceCellExtras(n).trend === 'up' ? arrowUp : arrowDown"
                      class="namings-view__price-trend-icon"
                    />
                  </span>
                  <span class="namings-view__price-was">{{ priceCellExtras(n).previous }}</span>
                </template>
                <span
                  v-else-if="priceCellExtras(n).manual"
                  class="namings-view__price-manual"
                  :class="{ 'namings-view__price-manual--stale': priceCellExtras(n).manualSince }"
                  :title="priceCellExtras(n).manualTitle ?? undefined"
                >
                  вручну<template v-if="priceCellExtras(n).manualSince"> · {{ priceCellExtras(n).manualSince }}</template>
                </span>
              </td>
              <td>
                <div class="namings-view__availability-cell">
                  <div class="namings-view__availability-row">
                    <span
                      class="namings-view__status-badge"
                      :class="`namings-view__status-badge--${resolveNamingStatusBadge(n.availability_status).modifier}`"
                      :title="statusHint(n.availability_status)"
                    >
                      {{ resolveNamingStatusBadge(n.availability_status).label }}
                    </span>
                    <button
                      v-if="needsDecision(n)"
                      type="button"
                      class="namings-view__decision"
                      :title="decisionTitle(n)"
                      :aria-label="decisionTitle(n)"
                      @click.stop="openPriceWindow(n.id)"
                    >
                      <PhosphorIcon :svg="warningCircle" class="namings-view__decision-icon" />
                    </button>
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
                <RowAction v-if="!n.used_in_brand_id" kind="edit" label="Редагувати" @click="openEditModal(n)" />
                <RowAction
                  v-if="!n.used_in_brand_id"
                  kind="delete"
                  label="Видалити"
                  @click="handleDeleteNaming(n.id, n.name)"
                />
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-if="sortedInternal.length === 0" key="empty">
              <td :colspan="canWrite ? 5 : 4" class="namings-view__empty">Нічого не знайдено</td>
            </tr>
            <tr v-for="n in sortedInternal" :key="n.id">
              <td>
                <div class="namings-view__name-cell">
                  <span class="namings-view__name">{{ n.name }}</span>
                  <span v-if="n.tagline" class="namings-view__tagline" :title="n.tagline">{{ n.tagline }}</span>
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
                <RowAction v-if="!n.used_in_brand_id" kind="edit" label="Редагувати" @click="openEditModal(n)" />
                <RowAction
                  v-if="!n.used_in_brand_id"
                  kind="delete"
                  label="Видалити"
                  @click="handleDeleteNaming(n.id, n.name)"
                />
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
          <!-- Always in the window, one row tall: what the registrar says comes into it and pushes nothing. -->
          <div class="namings-view__domain-preview">
            <p v-if="createPreviewLoading" class="namings-view__hint">
              Перевіряємо домен…
            </p>
            <p
              v-else-if="createPreviewError"
              class="namings-view__hint"
              :class="{ 'namings-view__hint--error': createPreviewError.error }"
            >
              {{ createPreviewError.text }}
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
              Не вдалося перевірити домен. Статус і ціну буде визначено після збереження.
            </p>
          </div>
          <NamingDomainModeField
            v-model:mode="newDomainMode"
            v-model:purchase-price="newPurchasePrice"
            name="create-domain-mode"
            :domain="newDomain"
            :free="createPreviewData?.available === true"
          />
          <div class="namings-view__field">
            <label class="namings-view__label" for="create-naming-concept">Концепт</label>
            <SearchSelect id="create-naming-concept" v-model="newConceptId" :options="conceptChoiceOptions" />
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

    <NamingHelpModal v-if="showHelp" @close="showHelp = false" />

    <NamingPriceCheckModal
      v-if="priceWindowNaming"
      :naming="priceWindowNaming"
      :can-write="canWrite"
      :saving="priceDeciding"
      :checking="checkingDomainId === priceWindowNaming.id"
      :error="priceDecisionError"
      @close="priceWindowId = null"
      @decide="handlePriceDecision"
      @recheck="handleCheckDomain(priceWindowNaming.id, recheckKind(priceWindowNaming) ?? 'domain')"
    />

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
          <!-- Always in the window, one row tall: what the registrar says comes into it and pushes nothing. -->
          <div class="namings-view__domain-preview">
            <p v-if="editPreviewLoading" class="namings-view__hint">
              Перевіряємо домен…
            </p>
            <p
              v-else-if="editPreviewError"
              class="namings-view__hint"
              :class="{ 'namings-view__hint--error': editPreviewError.error }"
            >
              {{ editPreviewError.text }}
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
              Не вдалося перевірити домен. Статус і ціну буде визначено після збереження.
            </p>
          </div>
          <NamingDomainModeField
            v-model:mode="editDomainMode"
            v-model:purchase-price="editPurchasePrice"
            name="edit-domain-mode"
            :found="editFound"
            :domain="editDomain"
            :saved-domain="editSavedDomain"
            :saved-sources="editSavedSources"
            :free="editFree"
          />
          <div class="namings-view__field">
            <label class="namings-view__label" for="edit-naming-concept">Концепт</label>
            <SearchSelect id="edit-naming-concept" v-model="editConceptId" :options="conceptChoiceOptions" />
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
    border-collapse: separate;
    background-color: $color-bg-white;

    @include scroll-table-cells;

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

  // One line like every cell; a long description is cut, whole in the tooltip.
  &__tagline {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: $font-size-xs;
    color: $color-text-secondary;
    line-height: 1.3;
  }

  // Pencil and bin, not words (owner, 06.10) — `RowAction`, one look in every
  // table. They stay in view while the table is scrolled sideways.
  &__actions {
    @include sticky-actions($color-bg-white);
  }

  // Over the other headers, which are sticky to the top themselves.
  &__table &__actions-head {
    @include sticky-actions($color-bg);
    z-index: 2;
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

  // One line high from the start: «checking…», the answer and the wait before
  // them take the same room, so the form below does not jump (owner, 07.10).
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

  &__help-link {
    margin-left: auto;
    padding: 0;
    border: 0;
    background: none;
    font-family: inherit;
    font-size: $font-size-sm;
    color: $color-primary;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid $color-border-focus;
      outline-offset: 2px;
    }
  }

  // The domain opens the card with everything the system knows of it, and
  // looks it: a link, like any other in the admin. A price and a status were
  // two more ways into the same card, each with a look of its own — «зачем и
  // цена, и статус открывают одну карточку» (the owner, 08.10).
  &__cell-button {
    border: 0;
    font-family: inherit;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid $color-border-focus;
      outline-offset: 2px;
    }
  }

  &__domain-link {
    padding: 0;
    background: none;
    font-size: inherit;
    color: $color-primary;
    text-align: left;
  }

  // Beside the price and nothing more: what it was before the marketplace
  // changed it, or that a person typed it. The rest is in the card.
  &__price-was,
  &__price-manual {
    margin-left: $spacing-1;
    font-size: $font-size-xs;
    color: $color-text-muted;
    white-space: nowrap;
  }

  &__price-was {
    text-decoration: line-through;
  }

  // A price a person typed a month ago or more: the eye should stop on it.
  &__price-manual--stale {
    color: #b45309;
  }

  // Which way the marketplace moved the price: up costs the buyer more.
  &__price-trend {
    display: inline-flex;
    margin-left: 2px;
    vertical-align: -2px;

    &--up {
      color: #b91c1c;
    }

    &--down {
      color: #15803d;
    }
  }

  &__price-trend-icon {
    width: 14px;
    height: 14px;
  }

  // The one thing in a row a person has to act on: a red mark beside the
  // status, loud on purpose — there are few of them. Its tooltip says what is
  // to be decided; the card behind it has the two buttons.
  &__decision {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: #dc2626;
    cursor: pointer;

    &:hover {
      color: #b91c1c;
    }

    &:focus-visible {
      outline: 2px solid $color-border-focus;
      outline-offset: 2px;
    }
  }

  &__decision-icon {
    width: 24px;
    height: 24px;
  }

  &__concept-filter {
    width: 220px;
    max-width: 100%;
  }

  // Quick filters by the domain: one click each, a second click takes it off.
  &__domain-filters {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-2;
    margin-bottom: $spacing-4;
  }

  &__filter-count {
    margin-left: $spacing-1;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  &__empty {
    padding: $spacing-8 $spacing-3;
    text-align: center;
    color: $color-text-secondary;
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

    // «Потрібне рішення»: the same red as the mark in the rows it finds.
    &--alert:not(&--active) {
      border-color: #fca5a5;
      color: #b91c1c;
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
    gap: $spacing-2;
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
