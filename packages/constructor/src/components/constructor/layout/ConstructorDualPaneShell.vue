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
import { useWizardPaneMetrics } from '@/composables/useWizardPaneMetrics'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

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

/**
 * The kit sizes the RIGHT column from the available height — `right = height −
 * 56`, so the square preview inside it keeps its 32 padding on all four sides
 * (`constants/wizardResponsive.ts`). CSS cannot express that: an
 * `aspect-ratio` child of a column flexbox would have to resolve its own
 * height before the parent can take a width from it. So the row is measured.
 *
 * In drawer mode the right column is a full-width overlay, so the measured
 * width must not apply.
 */
const bodyRef = ref<HTMLElement | null>(null)
const { rightPaneStyle, rightPaneVarStyle } = useWizardPaneMetrics(bodyRef)

// Embedded mode fills the panel and scales via root font-size — no transform.
const shellStyle = computed(() => ({
  ...(props.embed
    ? {}
    : {
        transform: `scale(${props.scale})`,
        transformOrigin: 'center center',
      }),
  // Published for the overlays slot, which is outside the measured row but has
  // to line up with the right column all the same.
  ...rightPaneVarStyle.value,
}))

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

/** Drawer mode makes the right column a full-width overlay — no measured width. */
const rightColumnStyle = computed(() => (isDrawerMode.value ? {} : rightPaneStyle.value))

</script>

<template>
  <div class="constructor-dual-pane-shell" :class="shellBase" :style="shellStyle">
    <!-- Kit `Wizard` = `Wizard header` 1230×73 + `Wizard content` (`5382:30951`,
         drawn on all 29 refactor frames and all four breakpoints). The shell is
         therefore a column, and the two panes are the row inside it. The row —
         not the shell — is the positioning context for the narrow-panel drawer,
         so the drawer slides under the header instead of over it. -->
    <slot name="header" />

    <!-- `__content` / `__frame` are the ">1920 px" regime of the designer's
         sticker `5395:118367`: above that width the wizard stops filling the
         panel and sits in its own 1700-wide frame, 48 from the top and bottom,
         radius 24 with a 1px rule. The rules are in `app.css`, scoped to the
         embed — standalone is still the fixed card and must not grow a second
         frame inside itself. Below the threshold both elements are inert. -->
    <div class="constructor-dual-pane-shell__content flex min-h-0 w-full flex-1">
    <div
      ref="bodyRef"
      class="constructor-dual-pane-shell__frame constructor-dual-pane-shell__body relative flex min-h-0 w-full flex-1"
    >
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
        :style="rightColumnStyle"
      >
        <!-- Kit icon button `3333:5541`, Solid L-48. Until now this was a
             hand-rolled CSS twin of the `ConceptPreviewPopup` cross, value for
             value; both now render the same component. Position stays here in
             `rem`: top aligns with the first content header row (pane pt-6/pt-12
             plus the title line). -->
        <UiIconButton
          v-if="isDrawerMode"
          class="absolute top-[1.375rem] right-6 z-50"
          aria-label="Закрити прев'ю"
          @click="closePreview"
        >
          <template #default="{ iconClass }">
            <CloseIcon :class="iconClass" />
          </template>
        </UiIconButton>
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
    </div>
    </div>

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
