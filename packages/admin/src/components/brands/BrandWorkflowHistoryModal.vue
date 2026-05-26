<script setup lang="ts">
/**
 * Grouped timeline: CEO autosaves + PO comment resolves → collapsible groups.
 * Logic: composables/useWorkflowTimeline.ts. Rollback: *.LEGACY-FLAT.md
 */
import BaseModal from '@/components/ui/BaseModal.vue'
import { useWorkflowTimeline } from '@/composables/useWorkflowTimeline'

const props = defineProps<{
  brandId: string
  brandName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const {
  EVT,
  events,
  loading,
  error,
  expandedIds,
  timelineRows,
  formatDateTime,
  roleLabel,
  eventTitle,
  eventTone,
  eventSummaryLine,
  timelineRowKey,
  timelineRowDotTone,
  toggleExpanded,
  expandAll,
  collapseAll,
  buildSubmittedSectionBlocks,
  submittedHasDetails,
  submittedDetailsGroupTitle,
  submittedIsResubmit,
  submittedLegacySnapshot,
  buildSectionBlocks,
  hasDetails,
  isLongComment,
  selectionChanges,
  poResolvedItem,
  poResolvedChronological,
  poGroupTitle,
  poGroupSummary,
  poGroupSectionsPreview,
  ceoEditsChronological,
  isCompactEvent,
  ceoGroupTitle,
  ceoProgressStepLabel,
  ceoGroupRange,
  usesCollapsibleCeoSteps,
  isCeoStepBodyVisible,
  ceoStepId,
} = useWorkflowTimeline(() => props.brandId)
</script>

<template>
  <BaseModal :title="`History — ${brandName}`" width="min(100vw - 2rem, 780px)" @close="emit('close')">
    <div class="workflow-modal">
      <div v-if="loading" class="workflow-modal__state">Loading history…</div>
      <div v-else-if="error" class="workflow-modal__state workflow-modal__state--error">{{ error }}</div>
      <div v-else-if="events.length === 0" class="workflow-modal__state">
        No workflow history recorded yet. Events appear after the next submit, revision, or
        approval.
      </div>
      <template v-else>
        <div class="workflow-modal__toolbar">
          <button type="button" class="workflow-modal__toolbar-btn" @click="expandAll">
            Expand all
          </button>
          <button type="button" class="workflow-modal__toolbar-btn" @click="collapseAll">
            Collapse all
          </button>
        </div>

        <div class="workflow-modal__scroll">
          <ul class="workflow-modal__timeline">
            <li
              v-for="row in timelineRows"
              :key="timelineRowKey(row)"
              class="workflow-modal__item"
            >
              <div class="workflow-modal__rail" aria-hidden="true">
                <span class="workflow-modal__dot" :class="timelineRowDotTone(row)" />
              </div>

              <!-- Grouped CEO autosaves -->
              <article v-if="row.kind === 'ceo_group'" class="workflow-modal__card">
                <button
                  type="button"
                  class="workflow-modal__card-head"
                  @click="toggleExpanded(row.id)"
                >
                  <div class="workflow-modal__card-main">
                    <div class="workflow-modal__card-top">
                      <span class="workflow-modal__badge tone--indigo">
                        {{ ceoGroupTitle(row.events.length) }}
                      </span>
                      <span class="workflow-modal__summary">While reviewing (auto-saved)</span>
                    </div>
                    <p class="workflow-modal__meta">
                      <time>{{ ceoGroupRange(row.events) }}</time>
                      <span class="workflow-modal__meta-sep">·</span>
                      <span>{{ row.events[0].userName }}</span>
                      <span class="workflow-modal__role"
                        >({{ roleLabel(row.events[0].userRole) }})</span
                      >
                    </p>
                  </div>
                  <span
                    class="workflow-modal__chevron"
                    :class="{ 'workflow-modal__chevron--open': expandedIds.has(row.id) }"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>

                <div
                  class="workflow-modal__collapse"
                  :class="{ 'workflow-modal__collapse--open': expandedIds.has(row.id) }"
                >
                  <div class="workflow-modal__collapse-inner">
                    <ol class="workflow-modal__progress">
                      <li
                        v-for="(edit, stepIndex) in ceoEditsChronological(row.events)"
                        :key="edit.id"
                        class="workflow-modal__progress-step"
                        :class="{
                          'workflow-modal__progress-step--last':
                            stepIndex === ceoEditsChronological(row.events).length - 1,
                        }"
                      >
                        <div class="workflow-modal__progress-rail" aria-hidden="true">
                          <span class="workflow-modal__progress-dot" />
                        </div>
                        <div class="workflow-modal__progress-body">
                          <component
                            :is="
                              usesCollapsibleCeoSteps(row.events.length) ? 'button' : 'div'
                            "
                            :type="
                              usesCollapsibleCeoSteps(row.events.length) ? 'button' : undefined
                            "
                            class="workflow-modal__progress-head"
                            @click="
                              usesCollapsibleCeoSteps(row.events.length)
                                ? toggleExpanded(ceoStepId(edit.id))
                                : undefined
                            "
                          >
                            <p class="workflow-modal__progress-label">
                              {{
                                ceoProgressStepLabel(
                                  stepIndex + 1,
                                  row.events.length,
                                  edit
                                )
                              }}
                            </p>
                            <span
                              v-if="usesCollapsibleCeoSteps(row.events.length)"
                              class="workflow-modal__chevron workflow-modal__chevron--sm"
                              :class="{
                                'workflow-modal__chevron--open': isCeoStepBodyVisible(
                                  row.events,
                                  edit
                                ),
                              }"
                              aria-hidden="true"
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
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </span>
                          </component>
                          <ul
                            v-if="
                              selectionChanges(edit).length &&
                              isCeoStepBodyVisible(row.events, edit)
                            "
                            class="workflow-modal__progress-changes"
                          >
                            <li
                              v-for="ch in selectionChanges(edit)"
                              :key="ch.field"
                              class="workflow-modal__progress-change"
                            >
                              <span class="workflow-modal__progress-field">{{
                                ch.fieldLabel
                              }}</span>
                              <span class="workflow-modal__diff workflow-modal__diff--inline">
                                <template v-if="ch.fromName">
                                  <span class="workflow-modal__diff-from">{{ ch.fromName }}</span>
                                  <span class="workflow-modal__diff-arrow">→</span>
                                </template>
                                <span v-else-if="ch.toName" class="workflow-modal__diff-set"
                                  >Set to</span
                                >
                                <span class="workflow-modal__diff-to">{{ ch.toName ?? '—' }}</span>
                              </span>
                            </li>
                          </ul>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              </article>

              <!-- Grouped PO comment resolves -->
              <article v-else-if="row.kind === 'po_resolve_group'" class="workflow-modal__card">
                <button
                  type="button"
                  class="workflow-modal__card-head"
                  @click="toggleExpanded(row.id)"
                >
                  <div class="workflow-modal__card-main">
                    <div class="workflow-modal__card-top">
                      <span class="workflow-modal__badge tone--green">
                        {{ poGroupTitle(row.events.length) }}
                      </span>
                      <span class="workflow-modal__summary">{{ poGroupSummary(row.events) }}</span>
                    </div>
                    <p class="workflow-modal__meta">
                      <time>{{ ceoGroupRange(row.events) }}</time>
                      <span class="workflow-modal__meta-sep">·</span>
                      <span>{{ row.events[0].userName }}</span>
                      <span class="workflow-modal__role"
                        >({{ roleLabel(row.events[0].userRole) }})</span
                      >
                    </p>
                    <p
                      v-if="!expandedIds.has(row.id)"
                      class="workflow-modal__meta workflow-modal__meta--preview"
                    >
                      {{ poGroupSectionsPreview(row.events) }}
                    </p>
                  </div>
                  <span
                    class="workflow-modal__chevron"
                    :class="{ 'workflow-modal__chevron--open': expandedIds.has(row.id) }"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>

                <div
                  class="workflow-modal__collapse"
                  :class="{ 'workflow-modal__collapse--open': expandedIds.has(row.id) }"
                >
                  <div class="workflow-modal__collapse-inner">
                    <ul class="workflow-modal__resolved-list">
                      <li
                        v-for="item in poResolvedChronological(row.events)"
                        :key="item.id"
                        class="workflow-modal__resolved-item"
                      >
                        <p class="workflow-modal__resolved">
                          <span
                            class="workflow-modal__resolved-icon"
                            :class="
                              poResolvedItem(item).resolved
                                ? 'workflow-modal__resolved-icon--ok'
                                : 'workflow-modal__resolved-icon--reopen'
                            "
                            aria-hidden="true"
                          >
                            {{ poResolvedItem(item).resolved ? '✓' : '↩' }}
                          </span>
                          <strong>{{ poResolvedItem(item).sectionLabel }}</strong>
                          —
                          {{
                            poResolvedItem(item).resolved ? 'marked resolved' : 'reopened'
                          }}
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </article>

              <!-- Milestone / other events -->
              <article
                v-else
                class="workflow-modal__card"
                :class="{ 'workflow-modal__card--compact': isCompactEvent(row.event) }"
              >
                <component
                  :is="hasDetails(row.event) ? 'button' : 'div'"
                  class="workflow-modal__card-head"
                  :type="hasDetails(row.event) ? 'button' : undefined"
                  @click="hasDetails(row.event) ? toggleExpanded(row.event.id) : undefined"
                >
                  <div class="workflow-modal__card-main">
                    <div class="workflow-modal__card-top">
                      <span class="workflow-modal__badge" :class="eventTone(row.event)">
                        {{ eventTitle(row.event) }}
                      </span>
                      <span v-if="eventSummaryLine(row.event)" class="workflow-modal__summary">
                        {{ eventSummaryLine(row.event) }}
                      </span>
                    </div>
                    <p class="workflow-modal__meta">
                      <time :datetime="row.event.createdAt">{{
                        formatDateTime(row.event.createdAt)
                      }}</time>
                      <span class="workflow-modal__meta-sep">·</span>
                      <span>{{ row.event.userName }}</span>
                      <span class="workflow-modal__role"
                        >({{ roleLabel(row.event.userRole) }})</span
                      >
                    </p>
                  </div>
                  <span
                    v-if="hasDetails(row.event)"
                    class="workflow-modal__chevron"
                    :class="{ 'workflow-modal__chevron--open': expandedIds.has(row.event.id) }"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </component>

                <div
                  v-if="hasDetails(row.event)"
                  class="workflow-modal__collapse"
                  :class="{ 'workflow-modal__collapse--open': expandedIds.has(row.event.id) }"
                >
                  <div class="workflow-modal__collapse-inner">
                    <div class="workflow-modal__details">
                      <template
                        v-if="row.event.eventType === EVT.SUBMITTED && submittedHasDetails(row.event)"
                      >
                        <div class="workflow-modal__submitted">
                          <p
                            v-if="submittedIsResubmit(row.event)"
                            class="workflow-modal__resubmit-note"
                          >
                            Resubmitted after CEO revision
                          </p>

                          <template v-if="buildSubmittedSectionBlocks(row.event).length">
                            <p class="workflow-modal__group-heading">
                              {{ submittedDetailsGroupTitle(row.event) }}
                            </p>
                            <div
                              v-for="block in buildSubmittedSectionBlocks(row.event)"
                              :key="block.label"
                              class="workflow-modal__section workflow-modal__section--submitted"
                            >
                              <p class="workflow-modal__section-title">{{ block.label }}</p>

                              <p v-if="block.change" class="workflow-modal__diff">
                                <template v-if="block.change.fromName">
                                  <span class="workflow-modal__diff-from">{{
                                    block.change.fromName
                                  }}</span>
                                  <span class="workflow-modal__diff-arrow">→</span>
                                </template>
                                <span v-else-if="block.change.toName" class="workflow-modal__diff-set"
                                  >Set to</span
                                >
                                <span class="workflow-modal__diff-to">{{
                                  block.change.toName ?? '—'
                                }}</span>
                              </p>
                              <p v-else-if="block.finalName" class="workflow-modal__selection-value">
                                {{ block.finalName }}
                              </p>

                              <template v-if="block.poComment">
                                <p
                                  v-if="block.poComment.fromExcerpt"
                                  class="workflow-modal__diff workflow-modal__diff--compact"
                                >
                                  <span class="workflow-modal__comment-label">Comment</span>
                                  <span class="workflow-modal__diff-from">{{
                                    block.poComment.fromExcerpt
                                  }}</span>
                                  <span class="workflow-modal__diff-arrow">→</span>
                                  <span class="workflow-modal__diff-to">{{
                                    block.poComment.excerpt
                                  }}</span>
                                </p>
                                <blockquote
                                  v-else-if="isLongComment(block.poComment.excerpt)"
                                  class="workflow-modal__quote"
                                >
                                  <span class="workflow-modal__quote-label">Comment</span>
                                  {{ block.poComment.excerpt }}
                                </blockquote>
                                <p v-else class="workflow-modal__comment">
                                  <span class="workflow-modal__comment-label">Comment</span>
                                  {{ block.poComment.excerpt }}
                                </p>
                              </template>
                            </div>
                          </template>

                          <ul
                            v-else-if="
                              submittedLegacySnapshot(row.event)?.internalName ||
                              submittedLegacySnapshot(row.event)?.geo
                            "
                            class="workflow-modal__facts workflow-modal__facts--legacy"
                          >
                            <li v-if="submittedLegacySnapshot(row.event)?.internalName">
                              <span class="workflow-modal__fact-label">Brand</span>
                              {{ submittedLegacySnapshot(row.event)?.internalName }}
                            </li>
                            <li v-if="submittedLegacySnapshot(row.event)?.geo">
                              <span class="workflow-modal__fact-label">GEO</span>
                              {{ submittedLegacySnapshot(row.event)?.geo }}
                            </li>
                          </ul>
                        </div>
                      </template>

                      <template v-if="buildSectionBlocks(row.event).length">
                        <div
                          v-for="block in buildSectionBlocks(row.event)"
                          :key="block.label"
                          class="workflow-modal__section"
                        >
                          <p class="workflow-modal__section-title">{{ block.label }}</p>

                          <p v-if="block.finalName" class="workflow-modal__final">
                            Final: <strong>{{ block.finalName }}</strong>
                          </p>

                          <p v-if="block.change" class="workflow-modal__diff">
                            <template v-if="block.change.fromName">
                              <span class="workflow-modal__diff-from">{{ block.change.fromName }}</span>
                              <span class="workflow-modal__diff-arrow">→</span>
                            </template>
                            <span v-else-if="block.change.toName" class="workflow-modal__diff-set"
                              >Set to</span
                            >
                            <span class="workflow-modal__diff-to">{{ block.change.toName ?? '—' }}</span>
                          </p>

                          <blockquote
                            v-if="block.comment && isLongComment(block.comment)"
                            class="workflow-modal__quote"
                          >
                            <span class="workflow-modal__quote-label">Comment</span>
                            {{ block.comment }}
                          </blockquote>
                          <p
                            v-else-if="block.comment"
                            class="workflow-modal__comment"
                          >
                            <span class="workflow-modal__comment-label">Comment</span>
                            {{ block.comment }}
                          </p>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.workflow-modal {
  display: flex;
  flex-direction: column;
  min-height: 360px;

  &__state {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    padding: $spacing-2 0;

    &--error {
      color: #b91c1c;
    }
  }

  &__toolbar {
    display: flex;
    gap: $spacing-2;
    margin-bottom: $spacing-4;
    flex-shrink: 0;
  }

  &__toolbar-btn {
    padding: $spacing-1 $spacing-3;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    background: $color-bg;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    cursor: pointer;
    transition:
      color $transition-fast,
      border-color $transition-fast,
      background-color $transition-fast;

    &:hover {
      color: $color-text;
      border-color: $color-primary;
      background-color: $color-bg-white;
    }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__timeline {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    display: grid;
    grid-template-columns: 20px 1fr;
    gap: $spacing-3;
    padding-bottom: $spacing-4;

    &:last-child {
      padding-bottom: 0;

      .workflow-modal__rail::after {
        display: none;
      }
    }
  }

  &__rail {
    position: relative;
    display: flex;
    justify-content: center;
    padding-top: 6px;

    &::after {
      content: '';
      position: absolute;
      top: 22px;
      bottom: -$spacing-4;
      left: 50%;
      width: 2px;
      transform: translateX(-50%);
      background: $color-border;
    }
  }

  &__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid $color-bg-white;
    box-shadow: 0 0 0 1px $color-border;
    flex-shrink: 0;
    z-index: 1;

    &.tone--gray {
      background: #9ca3af;
    }

    &.tone--blue {
      background: #3b82f6;
    }

    &.tone--amber {
      background: #f59e0b;
    }

    &.tone--green {
      background: #22c55e;
    }

    &.tone--indigo {
      background: #6366f1;
    }
  }

  &__card {
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
    overflow: hidden;

    &--compact {
      .workflow-modal__card-head {
        cursor: default;

        &:hover {
          background: none;
        }
      }
    }
  }

  &__card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-3;
    width: 100%;
    padding: $spacing-3 $spacing-4;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: $color-bg;
    }
  }

  &__card-main {
    flex: 1;
    min-width: 0;
  }

  &__card-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-2;
    margin-bottom: $spacing-1;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: $font-weight-semibold;
    line-height: 1.4;

    &.tone--gray {
      background: #f3f4f6;
      color: #374151;
    }

    &.tone--blue {
      background: #dbeafe;
      color: #1d4ed8;
    }

    &.tone--amber {
      background: #fef3c7;
      color: #b45309;
    }

    &.tone--green {
      background: #dcfce7;
      color: #15803d;
    }

    &.tone--indigo {
      background: #e0e7ff;
      color: #4338ca;
    }
  }

  &__summary {
    font-size: $font-size-xs;
    color: $color-text-secondary;
  }

  &__meta {
    margin: 0;
    font-size: $font-size-xs;
    color: $color-text-secondary;
    line-height: 1.5;

    &--preview {
      margin-top: $spacing-1;
      color: $color-text-muted;
      line-height: 1.4;
    }
  }

  &__meta-sep {
    margin: 0 4px;
  }

  &__role {
    color: $color-text-secondary;
  }

  &__chevron {
    flex-shrink: 0;
    color: $color-text-secondary;
    transition: transform 240ms ease;

    &--open {
      transform: rotate(180deg);
    }

    &--sm {
      margin-top: 2px;
    }
  }

  &__collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 240ms ease;

    &--open {
      grid-template-rows: 1fr;
    }
  }

  &__collapse-inner {
    overflow: hidden;
  }

  &__details {
    padding: 0 $spacing-4 $spacing-4;
    border-top: 1px solid $color-border;
    background: $color-bg;
  }

  &__submitted {
    padding-top: $spacing-2;
  }

  &__group-heading {
    margin: 0 0 $spacing-3;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    line-height: 1.4;
    color: $color-text;
    letter-spacing: 0.01em;
  }

  &__resubmit-note {
    margin: 0 0 $spacing-2;
    padding: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    line-height: 1.45;
    color: #1d4ed8;
  }

  &__progress {
    list-style: none;
    margin: 0;
    padding: $spacing-2 $spacing-4 $spacing-3;
  }

  &__progress-step {
    display: grid;
    grid-template-columns: 14px 1fr;
    gap: $spacing-2;
    padding-bottom: $spacing-3;

    &--last {
      padding-bottom: 0;

      .workflow-modal__progress-rail::after {
        display: none;
      }
    }
  }

  &__progress-rail {
    position: relative;
    display: flex;
    justify-content: center;
    padding-top: 4px;

    &::after {
      content: '';
      position: absolute;
      top: 12px;
      bottom: -$spacing-3;
      left: 50%;
      width: 1px;
      transform: translateX(-50%);
      background: $color-border;
    }
  }

  &__progress-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #a5b4fc;
    border: 1px solid $color-bg-white;
    box-shadow: 0 0 0 1px #c7d2fe;
    z-index: 1;
  }

  &__progress-body {
    min-width: 0;
  }

  &__progress-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-2;
    width: 100%;
    margin: 0 0 $spacing-1;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: default;

    &:is(button) {
      cursor: pointer;
      border-radius: $radius-sm;

      &:hover {
        background: $color-bg;
      }
    }
  }

  &__progress-label {
    margin: 0 0 $spacing-1;
    font-size: 11px;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    line-height: 1.4;
  }

  &__progress-changes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__progress-change {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: $spacing-2;
    font-size: $font-size-sm;
    line-height: 1.45;
  }

  &__progress-field {
    flex: 0 0 auto;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
  }

  &__section {
    padding-top: $spacing-3;

    & + & {
      margin-top: $spacing-2;
      padding-top: $spacing-3;
      border-top: 1px dashed $color-border;
    }

    &--submitted {
      &:first-of-type {
        padding-top: 0;
      }

      & + & {
        margin-top: $spacing-3;
      }
    }
  }

  &__section-title {
    margin: 0 0 $spacing-2;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $color-text-secondary;
  }

  &__selection-value {
    margin: 0 0 $spacing-2;
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: $color-text;
    line-height: 1.45;
  }

  &__facts--legacy {
    margin: 0;
    padding: 0;
  }

  &__facts {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: $font-size-sm;
  }

  &__facts li {
    margin-bottom: $spacing-1;
  }

  &__fact-label {
    display: inline-block;
    min-width: 4.5rem;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
  }

  &__diff {
    margin: 0 0 $spacing-2;
    font-size: $font-size-sm;
    line-height: 1.5;

    &--inline {
      margin: 0;
    }

    &--compact {
      margin: 0;
      font-size: $font-size-xs;
    }
  }

  &__diff-from {
    color: $color-text-secondary;
    text-decoration: line-through;
  }

  &__diff-arrow {
    margin: 0 6px;
    color: $color-text-secondary;
  }

  &__diff-set {
    margin-right: 6px;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__diff-to {
    font-weight: $font-weight-semibold;
    color: $color-text;
  }

  &__final {
    margin: 0 0 $spacing-2;
    font-size: $font-size-sm;
  }

  &__comment-label,
  &__quote-label {
    display: inline-block;
    margin-right: $spacing-2;
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    color: $color-text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__comment {
    margin: 0 0 $spacing-2;
    font-size: $font-size-sm;
    line-height: 1.5;
  }

  &__quote {
    margin: 0;
    padding: $spacing-2 $spacing-3;
    border-left: 3px solid $color-primary;
    border-radius: 0 $radius-sm $radius-sm 0;
    background: $color-bg-white;
    font-size: $font-size-sm;
    font-style: normal;
    color: $color-text;
    line-height: 1.5;
  }

  &__resolved-list {
    list-style: none;
    margin: 0;
    padding: $spacing-2 $spacing-4 $spacing-3;
  }

  &__resolved-item {
    padding: $spacing-2 0;

    & + & {
      border-top: 1px dashed $color-border;
    }
  }

  &__resolved {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    margin: 0;
    font-size: $font-size-sm;
  }

  &__resolved-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: $font-weight-bold;

    &--ok {
      background: #dcfce7;
      color: #15803d;
    }

    &--reopen {
      background: #fef3c7;
      color: #b45309;
    }
  }
}
</style>
