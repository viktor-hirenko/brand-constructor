<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Concept, OrderDetail, OrderKind } from '@brand-constructor/shared'
import { ORDER_KINDS } from '@brand-constructor/shared'
import { apiGet, apiPost, getAssetUrl } from '@/composables/useApi'
import { useListPolling } from '@/composables/useListPolling'
import { useErrorDialog } from '@/composables/useErrorDialog'
import {
  availabilityLabel,
  formatOrderDate,
  formatAnswerValue,
  orderBadge,
  orderedSummary,
  orderSectionBadge,
  orderStatusNote,
} from '@/utils/orderDisplay'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PhosphorIcon from '@/components/ui/PhosphorIcon.vue'
import ConceptCreateModal from '@/components/library/ConceptCreateModal.vue'
import NamingCreateModal from '@/components/library/NamingCreateModal.vue'
import arrowLeft from '@phosphor-icons/core/regular/arrow-left.svg?raw'

/**
 * One order (brief-orders plan, phase 2a): what the author ordered — the same
 * answers bc-strategy got in Slack — what they picked so far, what the team
 * made for the brief, and «Відправити замовнику» (the mirror of the author's «Відправити в роботу»). Everything comes from `/api/orders/:id`;
 * the brief itself stays closed to the team until it is approved.
 */

const route = useRoute()
const router = useRouter()
const { showError } = useErrorDialog()

const brandId = computed(() => String(route.params.brandId))
const order = ref<OrderDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const showConceptModal = ref(false)
/** «Додати назву»: which kind, and which concept the name belongs to. */
const namingTarget = ref<{
  kind: 'external' | 'internal'
  conceptOptions: { id: string; name: string }[] | null
} | null>(null)
const showReadyConfirm = ref(false)
const markingReady = ref(false)

async function load(options?: { silent?: boolean }) {
  if (!options?.silent) {
    loading.value = true
    error.value = null
  }
  try {
    order.value = await apiGet<OrderDetail>(`/api/orders/${brandId.value}`)
  } catch (e) {
    if (!options?.silent) error.value = e instanceof Error ? e.message : 'Невідома помилка'
  } finally {
    if (!options?.silent) loading.value = false
  }
}

onMounted(() => load())
watch(brandId, () => load())
const pollingPaused = computed(
  () => showConceptModal.value || namingTarget.value !== null || showReadyConfirm.value
)
useListPolling(() => load({ silent: true }), { paused: pollingPaused })

const forBrand = computed(() =>
  order.value ? { id: order.value.brandId, name: order.value.brandName } : null
)

/** The author's own comment on the step the order replaces — Strategy gets it in Slack too. */
function commentFor(kind: OrderKind): string | null {
  const sel = order.value?.selection
  if (!sel) return null
  if (kind === ORDER_KINDS.CONCEPT) return sel.conceptComment
  if (kind === ORDER_KINDS.EXTERNAL_NAMING) return sel.externalNamingComment
  return sel.internalNamingComment
}

const createdConceptIds = computed(() => new Set(order.value?.created.concepts.map(c => c.id) ?? []))
const conceptNames = computed(
  () => order.value?.created.externalNamings.filter(n => n.conceptId && createdConceptIds.value.has(n.conceptId)) ?? []
)
/** Names for a naming order: they belong to the brief's own concept, not one made here. */
const looseNames = computed(
  () =>
    order.value?.created.externalNamings.filter(
      n => !n.conceptId || !createdConceptIds.value.has(n.conceptId)
    ) ?? []
)
const briefConcept = computed(() =>
  order.value?.selection.conceptId
    ? { id: order.value.selection.conceptId, name: order.value.selection.conceptName ?? '' }
    : null
)
const madeConcept = computed(() => order.value?.created.concepts[0] ?? null)
/** The author picks up to three External Namings, so an order gets up to three (`MAX_ORDER_NAMES`). */
const MAX_NAMES = 3

function addNameTo(concept: { id: string; name: string }) {
  namingTarget.value = { kind: 'external', conceptOptions: [concept] }
}

function onConceptCreated(concept: Concept) {
  showConceptModal.value = false
  // Pictures are added on the concept's own page; it links back here.
  router.push(`/concepts/${concept.id}`)
}

function onNamingCreated() {
  namingTarget.value = null
  load({ silent: true })
}

async function confirmReady() {
  markingReady.value = true
  try {
    order.value = await apiPost<OrderDetail>(`/api/orders/${brandId.value}/ready`, {})
    showReadyConfirm.value = false
  } catch (e) {
    showReadyConfirm.value = false
    showError(e, 'save')
    load({ silent: true })
  } finally {
    markingReady.value = false
  }
}

const stateNote = computed(() => (order.value ? orderStatusNote(order.value) : null))
const badge = computed(() => (order.value ? orderBadge(order.value.state, order.value.briefStatus) : null))
const orderedText = computed(() => (order.value ? orderedSummary(order.value.sections.map(s => s.kind)) : ''))
const deadline = computed(() => {
  const answers = order.value?.sections.flatMap(s => s.answers) ?? []
  const value = answers.find(a => a.label === 'Дедлайн')?.value
  return value ? formatAnswerValue(value) : null
})
</script>

<template>
  <div class="order-detail">
    <div class="order-detail__back">
      <BaseButton variant="ghost" size="sm" @click="router.push('/orders')">
        <PhosphorIcon :svg="arrowLeft" class="order-detail__back-icon" />
        До замовлень
      </BaseButton>
    </div>

    <div v-if="loading && !order" class="order-detail__loading">Завантаження…</div>
    <div v-else-if="error" class="order-detail__error">
      <p>Не вдалося завантажити замовлення: {{ error }}</p>
      <BaseButton variant="secondary" size="sm" @click="load()">Спробувати ще раз</BaseButton>
    </div>

    <template v-else-if="order">
      <!-- As on a concept's page: name and status on the left, the one action on the right. -->
      <div class="order-detail__header">
        <div>
          <div class="order-detail__title-row">
            <h2>{{ order.brandName }}</h2>
            <span v-if="badge" class="badge" :class="badge.cls">{{ badge.label }}</span>
          </div>
          <p class="order-detail__meta">
            Замовлено {{ orderedText }} · {{ order.authorName }} · {{ formatOrderDate(order.sentToWorkAt) }}
            <template v-if="deadline"> · дедлайн {{ deadline }}</template>
          </p>
        </div>
        <div v-if="order.state === 'open'" class="order-detail__actions">
          <BaseButton :disabled="!order.canMarkReady" @click="showReadyConfirm = true">
            Відправити замовнику
          </BaseButton>
          <p v-if="!order.canMarkReady" class="order-detail__action-hint">
            {{ order.readyBlockers.join(' ') }}
          </p>
        </div>
      </div>

      <p v-if="stateNote" class="order-detail__note" role="status">{{ stateNote }}</p>

      <div class="order-detail__section">
        <h3>Базова інформація</h3>
        <dl class="order-detail__fields">
          <dt>Географія</dt>
          <dd>{{ order.geo || '—' }}</dd>
          <dt>Дата запуску</dt>
          <dd>{{ order.launchDate ? formatAnswerValue(order.launchDate) : '—' }}</dd>
          <dt>Тема</dt>
          <dd>{{ order.mode === 'dark' ? 'Dark' : 'Light' }}</dd>
          <template v-if="order.basicsComment">
            <dt>Коментар замовника</dt>
            <dd>{{ order.basicsComment }}</dd>
          </template>
        </dl>
      </div>

      <!-- Each order: what the author asked, then the one result the team makes for it. -->
      <template v-for="s in order.sections" :key="s.kind">
        <!-- A closed order sent before its answers were kept has nothing to show: no block at all. -->
        <div v-if="s.answers.length > 0 || orderSectionBadge(s)" class="order-detail__section">
          <div class="order-detail__section-head">
            <h3>{{ s.title }}</h3>
            <span v-if="orderSectionBadge(s)" class="badge" :class="orderSectionBadge(s)!.cls">
              {{ orderSectionBadge(s)!.label }}
            </span>
          </div>
          <dl v-if="s.answers.length > 0" class="order-detail__fields">
            <template v-for="a in s.answers" :key="a.label">
              <dt>{{ a.label }}</dt>
              <dd>{{ formatAnswerValue(a.value) }}</dd>
            </template>
            <template v-if="commentFor(s.kind)">
              <dt>Коментар замовника</dt>
              <dd>{{ commentFor(s.kind) }}</dd>
            </template>
          </dl>

        </div>

        <!-- New concept: the concept, then its name. -->
        <template v-if="s.kind === ORDER_KINDS.CONCEPT">
          <div class="order-detail__section">
            <div class="order-detail__section-head">
              <h3>Новий концепт</h3>
              <BaseButton
                v-if="order.canAdd.concept && !madeConcept"
                variant="secondary"
                @click="showConceptModal = true"
              >
                Створити концепт
              </BaseButton>
            </div>
            <p v-if="!madeConcept" class="order-detail__empty">Ще не створено.</p>
            <div v-else class="order-detail__cards">
              <RouterLink
                v-for="c in order.created.concepts"
                :key="c.id"
                :to="`/concepts/${c.id}`"
                class="concept-card"
              >
                <div class="concept-card__image">
                  <img v-if="c.visualUrl" :src="getAssetUrl(c.visualUrl)" :alt="c.name" />
                  <div v-else class="concept-card__placeholder">No visual</div>
                </div>
                <div class="concept-card__body">
                  <div class="concept-card__header-row">
                    <p class="concept-card__name">{{ c.name }}</p>
                  </div>
                  <p class="concept-card__description">{{ c.description || 'No description' }}</p>
                  <div class="concept-card__footer">
                    <span class="concept-card__meta">
                      <span class="concept-card__author">Автор: {{ c.authorName || '—' }}</span>
                      <span class="concept-card__date">{{ new Date(c.createdAt).toLocaleDateString('uk-UA') }}</span>
                    </span>
                  </div>
                </div>
              </RouterLink>
            </div>
          </div>

          <div class="order-detail__section">
            <div class="order-detail__section-head">
              <div>
                <h3>Назви для нового концепту</h3>
                <p class="order-detail__hint">Від однієї до трьох — замовник може обрати до трьох назв.</p>
              </div>
              <BaseButton
                v-if="order.canAdd.externalNaming && madeConcept && conceptNames.length < MAX_NAMES"
                variant="secondary"
                @click="addNameTo(madeConcept)"
              >
                {{ conceptNames.length === 0 ? 'Створити назву' : 'Додати ще назву' }}
              </BaseButton>
            </div>
            <p v-if="!madeConcept && conceptNames.length === 0" class="order-detail__empty">
              Спершу створіть концепт.
            </p>
            <p v-else-if="conceptNames.length === 0" class="order-detail__empty">Ще не створено.</p>
            <div v-else class="order-detail__cards">
              <div v-for="n in conceptNames" :key="n.id" class="concept-card naming-card">
                <div class="concept-card__body">
                  <div class="concept-card__header-row">
                    <p class="concept-card__name">{{ n.name }}</p>
                  </div>
                  <p class="concept-card__description">{{ n.tagline || 'No tagline' }}</p>
                <p class="naming-card__domain">
                  <span>{{ n.domain || 'Без домену' }}</span>
                  <span v-if="n.domain" class="availability" :class="`availability--${n.availability || 'unknown'}`">
                    {{ availabilityLabel(n.availability) }}
                  </span>
                </p>
                  <div class="concept-card__footer">
                    <span class="concept-card__meta">
                      <span class="concept-card__author">Автор: {{ n.authorName || '—' }}</span>
                      <span class="concept-card__date">{{ new Date(n.createdAt).toLocaleDateString('uk-UA') }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- New External Naming for the brief's own concept. -->
        <div v-else-if="s.kind === ORDER_KINDS.EXTERNAL_NAMING" class="order-detail__section">
          <div class="order-detail__section-head">
            <div>
              <h3>Нові назви{{ briefConcept ? ` для концепту «${briefConcept.name}»` : '' }}</h3>
              <p class="order-detail__hint">Від однієї до трьох — замовник може обрати до трьох назв.</p>
            </div>
            <BaseButton
              v-if="order.canAdd.externalNaming && briefConcept && looseNames.length < MAX_NAMES"
              variant="secondary"
              @click="addNameTo(briefConcept)"
            >
              {{ looseNames.length === 0 ? 'Створити назву' : 'Додати ще назву' }}
            </BaseButton>
          </div>
          <p v-if="looseNames.length === 0" class="order-detail__empty">Ще не створено.</p>
          <div v-else class="order-detail__cards">
              <div v-for="n in looseNames" :key="n.id" class="concept-card naming-card">
                <div class="concept-card__body">
                  <div class="concept-card__header-row">
                    <p class="concept-card__name">{{ n.name }}</p>
                  </div>
                  <p class="concept-card__description">{{ n.tagline || 'No tagline' }}</p>
                <p class="naming-card__domain">
                  <span>{{ n.domain || 'Без домену' }}</span>
                  <span v-if="n.domain" class="availability" :class="`availability--${n.availability || 'unknown'}`">
                    {{ availabilityLabel(n.availability) }}
                  </span>
                </p>
                  <div class="concept-card__footer">
                    <span class="concept-card__meta">
                      <span class="concept-card__author">Автор: {{ n.authorName || '—' }}</span>
                      <span class="concept-card__date">{{ new Date(n.createdAt).toLocaleDateString('uk-UA') }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- New Internal Naming. -->
        <div v-else class="order-detail__section">
          <div class="order-detail__section-head">
            <h3>Нова внутрішня назва</h3>
            <BaseButton
              v-if="order.canAdd.internalNaming && order.created.internalNamings.length === 0"
              variant="secondary"
              @click="namingTarget = { kind: 'internal', conceptOptions: null }"
            >
              Створити назву
            </BaseButton>
          </div>
          <p v-if="order.created.internalNamings.length === 0" class="order-detail__empty">Ще не створено.</p>
          <div v-else class="order-detail__cards">
              <div v-for="n in order.created.internalNamings" :key="n.id" class="concept-card naming-card">
                <div class="concept-card__body">
                  <div class="concept-card__header-row">
                    <p class="concept-card__name">{{ n.name }}</p>
                  </div>
                  <p class="concept-card__description">{{ n.tagline || 'No tagline' }}</p>
                  <div class="concept-card__footer">
                    <span class="concept-card__meta">
                      <span class="concept-card__author">Автор: {{ n.authorName || '—' }}</span>
                      <span class="concept-card__date">{{ new Date(n.createdAt).toLocaleDateString('uk-UA') }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </template>
    </template>

    <ConceptCreateModal
      v-if="showConceptModal && forBrand"
      :for-brand="forBrand"
      @close="showConceptModal = false"
      @created="onConceptCreated"
    />

    <NamingCreateModal
      v-if="namingTarget && forBrand"
      :kind="namingTarget.kind"
      :for-brand="forBrand"
      :concept-options="namingTarget.conceptOptions"
      :default-concept-id="namingTarget.conceptOptions?.[0]?.id ?? null"
      @close="namingTarget = null"
      @created="onNamingCreated"
    />

    <BaseModal
      v-if="showReadyConfirm && order"
      title="Відправити замовнику?"
      width="440px"
      @close="showReadyConfirm = false"
    >
      <p class="order-detail__confirm-text">
        Створене стане доступним замовнику для вибору. Після відправки його не можна змінити чи
        видалити.
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showReadyConfirm = false">Скасувати</BaseButton>
        <BaseButton :loading="markingReady" @click="confirmReady">Відправити</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

// Laid out as `ConceptDetailView`: 900 wide, a white header with the action on
// the right, then white sections with an h3 and their fields in one column.
.order-detail {
  max-width: 900px;

  &__back {
    margin-bottom: $spacing-4;
  }

  &__back-icon {
    width: 16px;
    height: 16px;
  }

  &__loading,
  &__error {
    text-align: center;
    padding: $spacing-12 0;
    color: $color-text-secondary;
    font-size: $font-size-sm;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-6;
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
    flex-direction: column;
    align-items: flex-end;
    gap: $spacing-2;
    max-width: 260px;
    flex-shrink: 0;

    @include mobile {
      align-items: stretch;
      max-width: none;
    }
  }

  &__action-hint {
    margin: 0;
    font-size: $font-size-xs;
    color: $color-text-secondary;
    text-align: right;
  }

  &__note {
    margin: 0 0 $spacing-4;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius-md;
    background-color: $color-primary-light;
    color: $color-primary-hover;
    font-size: $font-size-sm;
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

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-3;
    margin-bottom: $spacing-4;

    h3 {
      margin-bottom: 0;
    }
  }

  // Label on the left, value on the right — one column, as everywhere on the page.
  &__fields {
    display: grid;
    grid-template-columns: minmax(160px, 220px) 1fr;
    gap: $spacing-2 $spacing-4;
    margin: 0;
    font-size: $font-size-sm;

    dt {
      color: $color-text-secondary;
    }

    dd {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: $spacing-2;
      margin: 0;
      color: $color-text;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    & + & {
      margin-top: $spacing-4;
      padding-top: $spacing-4;
      border-top: 1px solid $color-border;
    }

    @include mobile {
      grid-template-columns: 1fr;
      gap: 0;

      dd {
        margin-bottom: $spacing-2;
      }
    }
  }

  &__hint {
    margin: $spacing-1 0 0;
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  &__empty {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  // Cards in the library's grid (`ConceptsView` uses 280; this column is 900 wide).
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: $spacing-6;
  }

  &__confirm-text {
    font-size: $font-size-sm;
    color: $color-text;
    line-height: $line-height-normal;
  }
}

// The concept card of the Concepts library, copied from `ConceptsView.vue` so a
// made concept looks exactly the same here; a name gets the same card body.
.concept-card {
  display: block;
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
    border-color: $color-primary;
  }

  &__image {
    aspect-ratio: 1;
    background-color: $color-bg;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }

  &__body {
    padding: $spacing-4;
  }

  &__header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-2;
    margin-bottom: $spacing-2;
  }

  &__name {
    margin: 0;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
  }

  &__description {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-secondary;
    line-height: $line-height-normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: $spacing-3;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__author,
  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}

// A name has no picture and no page of its own: the card body only, not a link.
.naming-card {
  cursor: default;

  &:hover {
    box-shadow: none;
    border-color: $color-border;
  }

  &__domain {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-2;
    margin: $spacing-3 0 0;
    font-size: $font-size-sm;
    color: $color-text;
  }
}

// The availability badge of the Namings table (`NamingsView.vue`).
.availability {
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

  &--unknown {
    background-color: $color-bg;
    color: $color-text-muted;
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
  white-space: nowrap;

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

  &--red {
    background-color: #fee2e2;
    color: #b91c1c;
  }
}
</style>
