<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LayoutMode } from './dualPaneLayoutClasses'
import {
  shellBaseClass,
  leftContentPaddingClass,
  leftPanelBgClass,
  leftPanelWidthClass,
  LEFT_PANE_SCROLL_INNER_CLASS,
  rightPaneClass,
} from './dualPaneLayoutClasses'
import { useNarrowEmbed } from '@/composables/useNarrowEmbed'
import CloseIcon from '@/components/icons/CloseIcon.vue'

interface ConstructorDualPaneShellProps {
  layoutMode: LayoutMode
  fullWidth?: boolean
  showRight?: boolean
  scale?: number
  reviewShell?: boolean
  wizardStep?: number
  /** Embedded (Admin iframe): fill the panel + fluid root font instead of CSS scale. */
  embed?: boolean
}

const props = withDefaults(defineProps<ConstructorDualPaneShellProps>(), {
  fullWidth: false,
  showRight: true,
  scale: 1,
  reviewShell: false,
  wizardStep: 1,
  embed: false,
})

const shellBase = computed(() => shellBaseClass(props.embed))

// Embedded mode fills the panel and scales via root font-size — no transform.
const shellStyle = computed(() =>
  props.embed
    ? {}
    : {
        transform: `scale(${props.scale})`,
        transformOrigin: 'center center',
      }
)

// Narrow embedded panels (portrait tablets and below) can't fit the 42/58 split.
// There the right preview column collapses into an off-canvas drawer opened via a
// floating button. Scoped to embed only — standalone (transform: scale) is untouched.
const { isNarrowEmbed } = useNarrowEmbed()
const isPreviewOpen = ref(false)

const showRightColumn = computed(() => props.showRight && !props.fullWidth)
const isDrawerMode = computed(() => isNarrowEmbed.value && showRightColumn.value)

function openPreview(): void {
  isPreviewOpen.value = true
}

function closePreview(): void {
  isPreviewOpen.value = false
}

// Leaving drawer mode (panel widened) must not leave the drawer stuck open.
watch(isDrawerMode, mode => {
  if (!mode) isPreviewOpen.value = false
})

const leftColumnClass = computed(() => [
  'constructor-dual-pane-shell__left flex flex-col min-h-0',
  isDrawerMode.value ? 'w-full' : leftPanelWidthClass(props.fullWidth),
  leftPanelBgClass(props.reviewShell),
])

const leftContentClass = computed(() =>
  leftContentPaddingClass(props.layoutMode, {
    reviewShell: props.reviewShell,
    wizardStep: props.wizardStep,
  })
)

const leftRouterClass = computed(() => {
  const isFixedHeightRouter =
    props.reviewShell ||
    props.layoutMode === 'edit' ||
    (props.layoutMode === 'wizard' && props.wizardStep === 8)

  if (isFixedHeightRouter) {
    return 'flex-1 min-h-0 flex flex-col overflow-hidden'
  }

  // Compensate reduced scroll-container pr-3 so content keeps 48px inset from column edge.
  if (props.layoutMode === 'wizard') {
    return `constructor-dual-pane-shell__scroll-inner ${LEFT_PANE_SCROLL_INNER_CLASS}`
  }

  return ''
})

const rightColumnClass = computed(() =>
  rightPaneClass(props.layoutMode, { wizardStep: props.wizardStep })
)
</script>

<template>
  <div class="constructor-dual-pane-shell" :class="shellBase" :style="shellStyle">
    <div :class="leftColumnClass">
      <div :class="leftContentClass">
        <slot name="left-header" />
        <div class="constructor-dual-pane-shell__router-view" :class="leftRouterClass">
          <slot />
        </div>
      </div>
      <slot name="left-footer" />
    </div>

    <template v-if="showRightColumn">
      <Transition name="cdps-drawer-backdrop">
        <div
          v-if="isDrawerMode && isPreviewOpen"
          class="constructor-dual-pane-shell__drawer-backdrop"
          @click="closePreview"
        />
      </Transition>

      <div
        :class="[
          rightColumnClass,
          {
            'constructor-dual-pane-shell__drawer': isDrawerMode,
            'constructor-dual-pane-shell__drawer--open': isDrawerMode && isPreviewOpen,
          },
        ]"
      >
        <button
          v-if="isDrawerMode"
          type="button"
          class="constructor-dual-pane-shell__drawer-close"
          aria-label="Закрити прев'ю"
          @click="closePreview"
        >
          <CloseIcon class="size-6 shrink-0" :stroke-width="1.5" />
        </button>
        <slot name="right" />
      </div>

      <button
        v-if="isDrawerMode && !isPreviewOpen"
        type="button"
        class="constructor-dual-pane-shell__preview-fab"
        @click="openPreview"
      >
        Прев'ю
      </button>
    </template>

    <slot name="overlays" />
  </div>
</template>

<style scoped>
.constructor-dual-pane-shell__drawer {
  position: absolute;
  inset: 0;
  width: 100% !important;
  z-index: 40;
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
  /* Safety net: some screens set `overflow-hidden` on this pane (e.g. review)
     because standalone/wide-embed never needs it to scroll — the drawer is
     the one place content can outgrow the viewport height, so it must scroll
     even if the slotted content's own overflow rule says otherwise. */
  overflow-y: auto !important;
}

.constructor-dual-pane-shell__drawer--open {
  transform: translateX(0);
}

.constructor-dual-pane-shell__drawer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 39;
  background-color: rgba(0, 0, 0, 0.45);
}

.cdps-drawer-backdrop-enter-active,
.cdps-drawer-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.cdps-drawer-backdrop-enter-from,
.cdps-drawer-backdrop-leave-to {
  opacity: 0;
}

.constructor-dual-pane-shell__drawer-close {
  position: absolute;
  /* Align with the first content header row (pane pt-6/pt-12 + title line). */
  top: 1.375rem;
  right: 1.5rem;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 9999px;
  background-color: #f9f9fb;
  color: #141b34;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.constructor-dual-pane-shell__drawer-close:hover {
  background-color: #ececf0;
}
.constructor-dual-pane-shell__drawer-close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #c8c7cc;
}

.constructor-dual-pane-shell__preview-fab {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 38;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 9999px;
  background-color: #030213;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.constructor-dual-pane-shell__preview-fab:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
