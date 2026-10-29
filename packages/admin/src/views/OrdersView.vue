<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { OrderListItem, OrderListResponse, OrderTab } from '@brand-constructor/shared'
import { apiGet } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import {
  orderBadge,
  createdNamesGroups,
  deadlineMark,
  DEADLINE_MARK_TITLES,
  formatOrderDate,
  formatAnswerValue,
  orderKindLabel,
} from '@/utils/orderDisplay'
import lightbulb from '@phosphor-icons/core/regular/lightbulb.svg?raw'
import textAa from '@phosphor-icons/core/regular/text-aa.svg?raw'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import type { CreatedKind } from '@/utils/orderDisplay'

/** The same glyphs as the menu: «Концепти» and «Неймінги». */
const MADE_GLYPHS: Record<CreatedKind, string> = { concept: lightbulb, naming: textAa }

/**
 * Orders — briefs `in_work` as the Strategy team works them (brief-orders plan,
 * phase 2a). Open: waiting for the team; Ready: the team sent it to the author;
 * Archive: cancelled by the author, or the brief went on to the CEO (30 days).
 */

const router = useRouter()

// One «now» for the page: a row does not turn overdue while it is being read.
const now = new Date()
const mark = (item: OrderListItem) => deadlineMark(item, now)

const TABS: { key: OrderTab; label: string }[] = [
  { key: 'open', label: 'Відкриті' },
  { key: 'ready', label: 'Готові' },
  { key: 'archive', label: 'Архів' },
]

const activeTab = ref<OrderTab>('open')
const result = ref<OrderListResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const items = computed(() => result.value?.items ?? [])

async function load(options?: { silent?: boolean }) {
  if (!options?.silent) {
    loading.value = true
    error.value = null
  }
  try {
    result.value = await apiGet<OrderListResponse>(`/api/orders?tab=${activeTab.value}`)
  } catch (e) {
    if (!options?.silent) error.value = e instanceof Error ? e.message : 'Невідома помилка'
  } finally {
    if (!options?.silent) loading.value = false
  }
}

onMounted(() => load())
watch(activeTab, () => load())
useListPolling(() => load({ silent: true }))
</script>

<template>
  <div class="orders-view">
    <div class="orders-view__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="orders-view__tab"
        :class="{ 'orders-view__tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="result" class="orders-view__tab-count">{{ result.counts[tab.key] }}</span>
      </button>
    </div>

    <div v-if="loading && !result" class="orders-view__loading">Завантаження…</div>
    <div v-else-if="error" class="orders-view__empty">Не вдалося завантажити замовлення: {{ error }}</div>
    <div v-else-if="items.length === 0" class="orders-view__empty">
      <template v-if="activeTab === 'open'">Відкритих замовлень немає. Тут з'являються брифи, відправлені командам.</template>
      <template v-else-if="activeTab === 'ready'">Немає замовлень, що чекають на замовника.</template>
      <template v-else>За останні 30 днів в архіві нічого немає.</template>
    </div>

    <div v-else class="orders-view__table-wrap">
      <table class="orders-view__table">
        <thead>
          <tr>
            <th>Бриф</th>
            <th>Замовлено</th>
            <th>Замовник</th>
            <th>Дата замовлення</th>
            <th>Зробити до</th>
            <th>Готово</th>
            <th>Створено</th>
            <th>Стан</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.brandId"
            class="orders-view__row"
            @click="router.push(`/orders/${item.brandId}`)"
          >
            <td class="orders-view__name-cell">{{ item.brandName }}</td>
            <td>
              <span
                v-for="kind in item.kinds"
                :key="kind"
                class="orders-view__kind"
                :class="{ 'orders-view__kind--cancelled': item.cancelledKinds.includes(kind) }"
                :title="item.cancelledKinds.includes(kind) ? 'Скасовано: замовник обрав інше з бібліотеки' : undefined"
                >{{ orderKindLabel(kind) }}</span
              >
            </td>
            <td>{{ item.authorName }}</td>
            <td>{{ formatOrderDate(item.sentToWorkAt) }}</td>
            <td
              :class="{ 'orders-view__date--missed': mark(item) === 'overdue' }"
              :title="mark(item) === 'overdue' ? DEADLINE_MARK_TITLES.overdue : undefined"
            >
              {{ item.deadline ? formatAnswerValue(item.deadline) : '—' }}
            </td>
            <td
              :class="{ 'orders-view__date--missed': mark(item) === 'late' }"
              :title="mark(item) === 'late' ? DEADLINE_MARK_TITLES.late : undefined"
            >
              {{ formatOrderDate(item.readyAt) }}
            </td>
            <td class="orders-view__made" :title="createdNamesGroups(item.createdNames).full || undefined">
              <span
                v-for="group in createdNamesGroups(item.createdNames).groups"
                :key="group.kind"
                class="orders-view__made-group"
              >
                <PhosphorIcon :svg="MADE_GLYPHS[group.kind]" class="orders-view__made-icon" />{{ group.names.join(', ') }}
              </span>
              <span v-if="createdNamesGroups(item.createdNames).more" class="orders-view__made-more">
                ще {{ createdNamesGroups(item.createdNames).more }}
              </span>
              <template v-if="createdNamesGroups(item.createdNames).groups.length === 0">—</template>
            </td>
            <td>
              <span class="badge" :class="orderBadge(item.state, item.briefStatus).cls">
                {{ orderBadge(item.state, item.briefStatus).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.orders-view {
  &__tabs {
    display: flex;
    gap: $spacing-1;
    margin-bottom: $spacing-6;
    border-bottom: 1px solid $color-border;
    padding-bottom: $spacing-1;
    overflow-x: auto;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: $spacing-2;
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

  &__tab-count {
    min-width: 20px;
    padding: 0 $spacing-2;
    border-radius: $radius-full;
    background-color: $color-bg;
    font-size: $font-size-xs;
    line-height: 20px;
    text-align: center;
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
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    min-width: 900px;
    border-collapse: separate;
    border-spacing: 0;
    background-color: $color-bg-white;

    th,
    td {
      padding: $spacing-3 $spacing-4;
      text-align: left;
      border-bottom: 1px solid $color-border;
      vertical-align: middle;
      white-space: nowrap;
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

  // What was made, by name, on one line like every cell: the glyph of the
  // menu's «Концепти» before a concept, of «Неймінги» before names.
  &__made-group {
    display: inline-flex;
    align-items: center;
    gap: $spacing-1;

    & + &,
    & + .orders-view__made-more {
      margin-left: $spacing-3;
    }
  }

  &__made-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: $color-text-secondary;
  }

  &__made-more {
    color: $color-text-secondary;
  }

  // A missed deadline: the date in red, the reason in the tooltip. Under the
  // table, or the cell's own text colour wins.
  &__table &__date--missed {
    color: $color-danger-hover;
    font-weight: $font-weight-medium;
  }

  &__kind {
    & + & {
      &::before {
        content: ', ';
      }
    }

    &--cancelled {
      color: $color-text-muted;
      text-decoration: line-through;
    }
  }
}

// Same pills as Brands (`BrandsView.vue`).
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

  &--purple {
    background-color: #f2e2fc;
    color: #8145b5;
  }

  &--amber {
    background-color: #fef3c7;
    color: #b45309;
  }
}
</style>
