<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { BrandListItem } from '@brand-constructor/shared/types'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import ChevronDownIcon from '@/components/icons/ChevronDownIcon.vue'
import LandingCtaButton from '@/components/landing/LandingCtaButton.vue'
import {
  DRAFT_CORNERS_RELEASE_MS,
  draftCtaMotionStyle,
} from '@/components/landing/draftCtaMotion'
import { brandDisplayName, clampWizardStep, formatDraftUpdatedAt } from '@/utils/brandHydration'

/** ~4 draft rows visible; 5th scrolls instead of showing a clipped stub. */
const DRAFT_MENU_MAX_HEIGHT_PX = 368

interface LandingDraftCtaProps {
  drafts: BrandListItem[]
  loading?: boolean
  creating?: boolean
}

const props = withDefaults(defineProps<LandingDraftCtaProps>(), {
  loading: false,
  creating: false,
})

const emit = defineEmits<{
  continue: [draft: BrandListItem]
  'create-new': []
}>()

/** Panel mount + leave transition. */
const isPanelVisible = ref(false)
/** Square button bottoms + header mode while menu is open / closing. */
const isAttachedUi = ref(false)

let cornersReleaseTimer: ReturnType<typeof setTimeout> | null = null

function clearCornersReleaseTimer() {
  if (cornersReleaseTimer === null) return
  clearTimeout(cornersReleaseTimer)
  cornersReleaseTimer = null
}

function releaseAttachedUi() {
  isAttachedUi.value = false
}

function scheduleCornersRelease() {
  clearCornersReleaseTimer()

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    releaseAttachedUi()
    return
  }

  cornersReleaseTimer = setTimeout(() => {
    cornersReleaseTimer = null
    releaseAttachedUi()
  }, DRAFT_CORNERS_RELEASE_MS)
}
/** Vertical label carousel: false = Order New Brand, true = Продовжити. */
const showContinueLabel = ref(false)
const isToggleHovered = ref(false)

const rootRef = ref<HTMLElement | null>(null)

const hasDrafts = computed(() => props.drafts.length > 0)

const draftMenuMaxHeight = `${DRAFT_MENU_MAX_HEIGHT_PX}px`

function draftPickerMeta(draft: BrandListItem): string {
  const step = clampWizardStep(draft.currentStep ?? 1)
  const updated = formatDraftUpdatedAt(draft.updatedAt)
  return updated ? `Крок ${step} · оновлено ${updated}` : `Крок ${step}`
}

function openMenu() {
  clearCornersReleaseTimer()
  isAttachedUi.value = true
  showContinueLabel.value = true
  isPanelVisible.value = true
}

function closeMenu() {
  if (!isPanelVisible.value) return
  isPanelVisible.value = false
  showContinueLabel.value = false
  scheduleCornersRelease()
}

function onPanelAfterLeave() {
  clearCornersReleaseTimer()
  releaseAttachedUi()
}

function toggleMenu() {
  if (isPanelVisible.value) {
    closeMenu()
    return
  }
  if (isAttachedUi.value) return
  openMenu()
}

function handleContinue(draft: BrandListItem) {
  closeMenu()
  emit('continue', draft)
}

function handleCreateNew() {
  if (isAttachedUi.value) return
  closeMenu()
  emit('create-new')
}

function onDocumentClick(event: MouseEvent) {
  if (!isPanelVisible.value) return
  if (!rootRef.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isPanelVisible.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  clearCornersReleaseTimer()
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div v-if="loading" class="text-sm text-muted-foreground">Завантаження…</div>

  <div
    v-else
    ref="rootRef"
    class="landing-draft-cta relative inline-flex flex-col items-stretch"
    :style="draftCtaMotionStyle"
  >
    <LandingCtaButton v-if="!hasDrafts" :disabled="creating" @click="handleCreateNew">
      Order New Brand
      <SparklesIcon class="size-5 shrink-0 text-primary-foreground" />
    </LandingCtaButton>

    <template v-else>
      <div class="inline-flex">
        <LandingCtaButton
          variant="split-main"
          :menu-open="isAttachedUi"
          :passive="isAttachedUi"
          :disabled="creating"
          :aria-label="showContinueLabel ? 'Продовжити' : 'Order New Brand'"
          @click="handleCreateNew"
        >
          <div class="cta-main-label" aria-hidden="true">
            <div
              class="cta-main-label__track"
              :class="{ 'cta-main-label__track--continue': showContinueLabel }"
            >
              <span class="cta-main-label__row">
                Order New Brand
                <SparklesIcon class="size-5 shrink-0 text-primary-foreground" />
              </span>
              <span class="cta-main-label__row">Продовжити</span>
            </div>
          </div>
        </LandingCtaButton>
        <LandingCtaButton
          variant="split-toggle"
          :menu-open="isAttachedUi"
          :disabled="creating"
          aria-label="Список чернеток"
          :aria-expanded="isPanelVisible"
          aria-haspopup="menu"
          @click.stop="toggleMenu"
          @mouseenter="isToggleHovered = true"
          @mouseleave="isToggleHovered = false"
        >
          <ChevronDownIcon
            class="draft-menu-chevron size-5 shrink-0 text-primary-foreground"
            :class="{
              'draft-menu-chevron--open': isPanelVisible,
              'draft-menu-chevron--hover-closed': isToggleHovered && !isPanelVisible,
              'draft-menu-chevron--hover-open': isToggleHovered && isPanelVisible,
            }"
          />
        </LandingCtaButton>
      </div>

      <Transition name="draft-menu" @after-leave="onPanelAfterLeave">
        <div
          v-if="isPanelVisible"
          class="draft-menu-panel absolute left-0 top-full z-30 flex w-full min-w-full flex-col overflow-hidden rounded-b-[14px] rounded-t-none border-2 border-black bg-card px-3 pb-4 pt-5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          role="menu"
          aria-label="Продовжити чернетку"
        >
          <div
            class="flex flex-col gap-0.5 overflow-y-auto overscroll-contain"
            :style="{ maxHeight: draftMenuMaxHeight }"
          >
            <button
              v-for="draft in drafts"
              :key="draft.id"
              type="button"
              class="flex w-full flex-col items-start gap-0.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              role="menuitem"
              :disabled="creating"
              @click="handleContinue(draft)"
            >
              <span class="text-[0.9375rem] font-medium leading-snug text-foreground">
                {{ brandDisplayName(draft) }}
              </span>
              <span class="text-[0.8125rem] leading-snug text-muted-foreground">
                {{ draftPickerMeta(draft) }}
              </span>
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* Motion tokens: draftCtaMotion.ts → :style on .landing-draft-cta */

.cta-main-label {
  height: 1.75rem;
  overflow: hidden;
}

.cta-main-label__track {
  display: flex;
  flex-direction: column;
  transform: translateY(0);
  transition: transform var(--draft-motion-duration-close) var(--draft-motion-ease-close);
  will-change: transform;
}

.cta-main-label__track--continue {
  transform: translateY(-50%);
  transition: transform var(--draft-motion-duration-open) var(--draft-motion-ease-open);
}

.cta-main-label__row {
  display: flex;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .cta-main-label__track,
  .cta-main-label__track--continue {
    transition: none;
  }
}

/* Chevron: single transform (rotate + translate); open state = isPanelVisible */
.draft-menu-chevron {
  transform: rotate(0deg) translateY(0);
  transition: transform var(--draft-motion-duration-close) var(--draft-motion-ease-close);
}

.draft-menu-chevron--open {
  transform: rotate(180deg) translateY(0);
  transition: transform var(--draft-motion-duration-open) var(--draft-motion-ease-open);
}

.draft-menu-chevron--hover-closed {
  transform: rotate(0deg) translateY(2px);
}

.draft-menu-chevron--hover-open {
  transform: rotate(180deg) translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .draft-menu-chevron,
  .draft-menu-chevron--open {
    transition: none;
  }
}

.draft-menu-panel {
  transform-origin: top center;
}

.draft-menu-enter-active {
  transition:
    opacity var(--draft-motion-duration-open) var(--draft-motion-ease-open),
    transform var(--draft-motion-duration-open) var(--draft-motion-ease-open);
}

.draft-menu-leave-active {
  transition:
    opacity var(--draft-motion-duration-close) var(--draft-motion-ease-close),
    transform var(--draft-motion-duration-close) var(--draft-motion-ease-close);
}

.draft-menu-enter-from,
.draft-menu-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem) scaleY(0.98);
}

.draft-menu-enter-to,
.draft-menu-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
}

@media (prefers-reduced-motion: reduce) {
  .draft-menu-enter-active,
  .draft-menu-leave-active {
    transition: none;
  }
}
</style>
