<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { BrandListItem } from '@brand-constructor/shared'
import { useApiList, apiDelete } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import { useTableSort } from '@/composables/useTableSort'
import {
  formatAuthorRole,
  getBrandReviewDisplay,
} from '@/composables/useBrandReviewDisplay'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BrandWorkflowHistoryModal from '@/components/brands/BrandWorkflowHistoryModal.vue'

const authStore = useAuthStore()
const canDeleteBrand = computed(() => authStore.user?.role === 'admin')

const {
  data: brands,
  loading,
  total,
  page,
  perPage,
  fetchData: fetchBrands,
} = useApiList<BrandListItem>('/api/brands')

function brandsSortValue(brand: BrandListItem, field: string): unknown {
  if (field === 'waitingSince') {
    return getBrandReviewDisplay(brand).waitingSince ?? ''
  }
  if (field === 'internalName') return brand.internalName ?? ''
  if (field === 'authorName') return brand.authorName
  if (field === 'status') return brand.status
  if (field === 'createdAt') return brand.createdAt
  if (field === 'geo') return brand.geo ?? ''
  if (field === 'launchDate') return brand.launchDate ?? ''
  return undefined
}

const { sortedData, sortField, sortDirection, toggleSort, setSort } = useTableSort(
  brands,
  'createdAt',
  'desc',
  brandsSortValue
)

function applyDefaultSortForTab(tab: string) {
  if (tab === 'submitted' || tab === 'all') {
    setSort('waitingSince', 'desc')
  } else {
    setSort('createdAt', 'desc')
  }
}

function handleSort(field: string) {
  if (field === 'waitingSince' && sortField.value !== 'waitingSince') {
    setSort('waitingSince', 'desc')
    return
  }
  toggleSort(field)
}

const activeTab = ref<string>('all')

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'needs_revision', label: 'Needs Revision' },
]

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'badge--gray' },
  submitted: { label: 'Submitted', cls: 'badge--blue' },
  approved: { label: 'Approved', cls: 'badge--green' },
  needs_revision: { label: 'Needs Revision', cls: 'badge--amber' },
}

function brandListParams(): Record<string, string> {
  const params: Record<string, string> = {}
  if (activeTab.value !== 'all') {
    params.status = activeTab.value
  }
  return params
}

function loadBrands(options?: { silent?: boolean }) {
  fetchBrands({ queryParams: brandListParams(), silent: options?.silent })
}

onMounted(() => {
  perPage.value = 50
  applyDefaultSortForTab(activeTab.value)
  loadBrands()
})

watch(activeTab, (tab) => {
  page.value = 1
  applyDefaultSortForTab(tab)
  loadBrands()
})

const constructorBaseUrl = computed(() => {
  const url = import.meta.env.VITE_CONSTRUCTOR_URL
  return url || ''
})

function openBrand(brand: BrandListItem) {
  const base = constructorBaseUrl.value
  if (base) {
    window.open(`${base}/constructor/brand/${brand.id}`, '_blank')
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function reviewDisplay(brand: BrandListItem) {
  return getBrandReviewDisplay(brand)
}

function authorTitle(brand: BrandListItem): string {
  return `${brand.authorName} · ${formatAuthorRole(brand.authorRole)}`
}

function formatGeo(geo: string | null): string {
  if (!geo) return '—'
  return geo
}

const showDeleteConfirm = ref(false)
const deleteTarget = ref<BrandListItem | null>(null)

const historyBrand = ref<BrandListItem | null>(null)

const pollingPaused = computed(
  () => historyBrand.value !== null || showDeleteConfirm.value
)
useListPolling(() => loadBrands({ silent: true }), { paused: pollingPaused })

function closeHistory() {
  historyBrand.value = null
  loadBrands({ silent: true })
}

function openHistory(brand: BrandListItem) {
  historyBrand.value = brand
}

function handleDeleteBrand(brand: BrandListItem) {
  deleteTarget.value = brand
  showDeleteConfirm.value = true
}

async function confirmDeleteBrand() {
  if (!deleteTarget.value) return
  try {
    await apiDelete(`/api/brands/${deleteTarget.value.id}`)
    showDeleteConfirm.value = false
    deleteTarget.value = null
    loadBrands()
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Delete failed')
  }
}
</script>

<template>
  <div class="brands-view">
    <div class="brands-view__header">
      <span class="brands-view__count">{{ total }} brand{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div class="brands-view__tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.key"
        class="brands-view__tab"
        :class="{ 'brands-view__tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="brands-view__loading">Loading...</div>

    <div v-else-if="brands.length === 0" class="brands-view__empty">
      No brands{{ activeTab !== 'all' ? ' with this status' : '' }} found.
    </div>

    <div v-else class="brands-view__table-wrap">
      <table class="brands-view__table">
        <thead>
          <tr>
            <th class="sortable-th" @click="handleSort('internalName')">
              Name
              <span v-if="sortField === 'internalName'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="sortable-th" @click="handleSort('status')">
              Status
              <span v-if="sortField === 'status'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="sortable-th" @click="handleSort('authorName')">
              Author
              <span v-if="sortField === 'authorName'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="sortable-th" @click="handleSort('createdAt')">
              Created
              <span v-if="sortField === 'createdAt'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="brands-view__review-col">Review</th>
            <th class="sortable-th brands-view__waiting-col" @click="handleSort('waitingSince')">
              Waiting
              <span v-if="sortField === 'waitingSince'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="sortable-th" @click="handleSort('geo')">
              GEO
              <span v-if="sortField === 'geo'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th class="sortable-th" @click="handleSort('launchDate')">
              Launch Date
              <span v-if="sortField === 'launchDate'" class="sort-arrow">{{
                sortDirection === 'asc' ? '↑' : '↓'
              }}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="brand in sortedData"
            :key="brand.id"
            class="brands-view__row"
            @click="openBrand(brand)"
          >
            <td class="brands-view__name-cell">
              {{ brand.internalName || brand.id.substring(0, 12) + '...' }}
            </td>
            <td>
              <span class="badge" :class="STATUS_BADGES[brand.status]?.cls ?? 'badge--gray'">
                {{ STATUS_BADGES[brand.status]?.label ?? brand.status }}
              </span>
            </td>
            <td class="brands-view__author-cell" :title="authorTitle(brand)">
              <span class="brands-view__author-name">{{ brand.authorName }}</span><span
                class="brands-view__author-role"
                >{{ formatAuthorRole(brand.authorRole) }}</span
              >
            </td>
            <td>{{ formatDate(brand.createdAt) }}</td>
            <td class="brands-view__review-cell">
              <span
                class="brands-view__cell-line"
                :class="{
                  'brands-view__cell-line--muted': reviewDisplay(brand).reviewLine === '—',
                }"
                :title="reviewDisplay(brand).reviewTitle ?? reviewDisplay(brand).reviewLine"
              >
                {{ reviewDisplay(brand).reviewLine }}
              </span>
            </td>
            <td
              class="brands-view__waiting-cell"
              :class="`brands-view__waiting-cell--${reviewDisplay(brand).waitingTone}`"
            >
              <span
                class="brands-view__cell-line"
                :title="
                  reviewDisplay(brand).waitingTitle ?? reviewDisplay(brand).waitingLine
                "
              >
                {{ reviewDisplay(brand).waitingLine }}
              </span>
            </td>
            <td>{{ formatGeo(brand.geo) }}</td>
            <td>{{ formatDate(brand.launchDate) }}</td>
            <td class="brands-view__actions" @click.stop>
              <button
                class="brands-view__history-btn"
                type="button"
                title="Workflow history"
                @click="openHistory(brand)"
              >
                History
              </button>
              <button
                v-if="canDeleteBrand"
                class="brands-view__delete-btn"
                title="Delete"
                @click="handleDeleteBrand(brand)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BrandWorkflowHistoryModal
      v-if="historyBrand"
      :brand-id="historyBrand.id"
      :brand-name="historyBrand.internalName || 'Brand'"
      @close="closeHistory"
    />

    <BaseModal
      v-if="showDeleteConfirm"
      title="Delete Brand"
      width="420px"
      @close="showDeleteConfirm = false"
    >
      <p class="brands-view__confirm-text">
        Are you sure you want to delete
        <strong>"{{ deleteTarget?.internalName || 'this brand' }}"</strong>? This action cannot be
        undone.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteConfirm = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="confirmDeleteBrand">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.brands-view {
  &__header {
    display: flex;
    align-items: baseline;
    gap: $spacing-3;
    margin-bottom: $spacing-6;
  }

  &__count {
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  &__tabs {
    display: flex;
    gap: $spacing-1;
    margin-bottom: $spacing-6;
    border-bottom: 1px solid $color-border;
    padding-bottom: $spacing-1;
    overflow-x: auto;
  }

  &__tab {
    padding: $spacing-2 $spacing-4;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: all $transition-fast;

    &:hover {
      color: $color-text;
    }

    &--active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }
  }

  &__loading,
  &__empty {
    text-align: center;
    padding: $spacing-12 0;
    color: $color-text-secondary;
    font-size: $font-size-sm;
  }

  &__table-wrap {
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    overflow: hidden;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background-color: $color-bg-white;

    @include mobile {
      min-width: 1020px;
    }

    th,
    td {
      padding: $spacing-3 $spacing-4;
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
      color: $color-text;
    }
  }

  &__row {
    cursor: pointer;
    transition: background-color $transition-fast;

    &:hover {
      background-color: $color-bg;
    }
  }

  &__name-cell {
    font-weight: $font-weight-medium;
  }

  &__author-cell {
    min-width: 120px;
    white-space: nowrap;
  }

  &__author-name {
    font-weight: $font-weight-medium;
  }

  &__author-role {
    font-size: $font-size-xs;
    color: $color-text-secondary;

    &::before {
      content: ' · ';
    }
  }

  &__review-col {
    min-width: 120px;
  }

  &__waiting-col {
    min-width: 110px;
  }

  &__review-cell {
    min-width: 120px;
    max-width: 180px;
  }

  &__waiting-cell {
    min-width: 110px;
    max-width: 150px;

    &--warn .brands-view__cell-line {
      color: #b45309;
      font-weight: $font-weight-medium;
    }

    &--late .brands-view__cell-line {
      color: #b91c1c;
      font-weight: $font-weight-semibold;
    }
  }

  &__cell-line {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
    cursor: default;

    &--muted {
      color: $color-text-secondary;
    }
  }

  &__actions {
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__history-btn {
    padding: $spacing-1 $spacing-2;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-primary;
    background: none;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background-color: $color-bg;
      border-color: $color-primary;
    }
  }

  &__confirm-text {
    font-size: $font-size-sm;
    color: $color-text;
    line-height: $line-height-normal;
  }

  &__delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-1;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: #b91c1c;
      background-color: #fee2e2;
    }
  }
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;

  &--gray {
    background-color: #f3f4f6;
    color: #374151;
  }

  &--blue {
    background-color: #dbeafe;
    color: #1d4ed8;
  }

  &--green {
    background-color: #dcfce7;
    color: #15803d;
  }

  &--amber {
    background-color: #fef3c7;
    color: #b45309;
  }
}
</style>
