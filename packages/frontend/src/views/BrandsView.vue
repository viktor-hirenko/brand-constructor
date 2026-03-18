<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Brand } from '@brand-constructor/shared'
import { useApiList } from '@/composables/useApi'
import { useTableSort } from '@/composables/useTableSort'

type BrandWithAuthor = Brand & { author_name?: string }

const {
  data: brands,
  loading,
  total,
  page,
  perPage,
  fetchData: fetchBrands,
} = useApiList<BrandWithAuthor>('/api/brands')

const {
  sortedData,
  sortField,
  sortDirection,
  toggleSort,
} = useTableSort(brands, 'updatedAt', 'desc')

const activeTab = ref<string>('all')

const STATUS_TABS = [
  { key: 'all', label: 'Усі' },
  { key: 'draft', label: 'Чернетки' },
  { key: 'submitted', label: 'На розгляді' },
  { key: 'approved', label: 'Затверджені' },
  { key: 'needs_revision', label: 'Доопрацювання' },
  { key: 'rejected', label: 'Відхилені' },
]

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Чернетка', cls: 'badge--gray' },
  submitted: { label: 'На розгляді', cls: 'badge--blue' },
  approved: { label: 'Затверджено', cls: 'badge--green' },
  needs_revision: { label: 'Доопрацювання', cls: 'badge--amber' },
  rejected: { label: 'Відхилено', cls: 'badge--red' },
}

function loadBrands() {
  const params: Record<string, string> = {}
  if (activeTab.value !== 'all') {
    params.status = activeTab.value
  }
  fetchBrands(params)
}

onMounted(() => {
  perPage.value = 50
  loadBrands()
})

watch(activeTab, () => {
  page.value = 1
  loadBrands()
})

const constructorBaseUrl = computed(() => {
  const url = import.meta.env.VITE_CONSTRUCTOR_URL
  return url || ''
})

function openBrand(brand: BrandWithAuthor) {
  const base = constructorBaseUrl.value
  if (base) {
    window.open(`${base}/constructor/brand/${brand.id}`, '_blank')
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatGeo(geo: string | null): string {
  if (!geo) return '—'
  return geo
}
</script>

<template>
  <div class="brands-view">
    <div class="brands-view__header">
      <h1 class="brands-view__title">Brands</h1>
      <span class="brands-view__count">{{ total }} бренд{{ total === 1 ? '' : 'ів' }}</span>
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

    <div v-if="loading" class="brands-view__loading">Завантаження...</div>

    <div v-else-if="brands.length === 0" class="brands-view__empty">
      Немає брендів{{ activeTab !== 'all' ? ' з цим статусом' : '' }}
    </div>

    <div v-else class="brands-view__table-wrap">
      <table class="brands-view__table">
        <thead>
          <tr>
            <th class="sortable-th" @click="toggleSort('internalName')">
              Назва
              <span v-if="sortField === 'internalName'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="sortable-th" @click="toggleSort('status')">
              Статус
              <span v-if="sortField === 'status'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="sortable-th" @click="toggleSort('geo')">
              GEO
              <span v-if="sortField === 'geo'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="sortable-th" @click="toggleSort('launchDate')">
              Дата запуску
              <span v-if="sortField === 'launchDate'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="sortable-th" @click="toggleSort('updatedAt')">
              Оновлено
              <span v-if="sortField === 'updatedAt'" class="sort-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            </th>
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
              <span
                class="badge"
                :class="STATUS_BADGES[brand.status]?.cls ?? 'badge--gray'"
              >
                {{ STATUS_BADGES[brand.status]?.label ?? brand.status }}
              </span>
            </td>
            <td>{{ formatGeo(brand.geo) }}</td>
            <td>{{ formatDate(brand.launchDate) }}</td>
            <td>{{ formatDate(brand.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
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

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
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
      min-width: 640px;
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

  &--red {
    background-color: #fee2e2;
    color: #b91c1c;
  }
}
</style>
