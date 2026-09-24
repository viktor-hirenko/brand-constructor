<script setup lang="ts">
import { computed } from 'vue'
import BrandBriefStatusBadge from '@/components/constructor/review/BrandBriefStatusBadge.vue'
import UiAlert from '@/components/ui/UiAlert.vue'
import UiStepHeader from '@/components/ui/UiStepHeader.vue'
import CheckBadgeIcon from '@/components/icons/CheckBadgeIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'

/**
 * Review step header — the kit's `Step header` `3984:8226` with its Alert slot
 * filled, drawn on both step-8 screens of the current canvas:
 * `5387:91772` (author) and `5387:78997` (CEO).
 *
 * The info block used to be a hand-built white box: radius 16 on `#EDEDED`,
 * padding 24, title 18/24 with -0.45px tracking, description 14/20 indented to
 * 36, and a `#DCA100` icon that exists nowhere in the kit. The kit draws an
 * `Alert` there (`3461:5237`): padding 16, icon 24, 12 to the text column, 8
 * between title and description, description 16/24 — every one of which
 * `UiAlert` already carries, so this file hands over the glyph and the tone and
 * writes no geometry of its own.
 *
 * Tone: the two drawn states are Type = Default (white on `alert/border/default`
 * `#eaeaeb`, icon `alert/icon/default` `#1f1f2e`) with Phosphor `CheckCircle`
 * Regular — the glyph is read off the render, not off the layer name. The
 * attention states (PO returned from CEO, brief in work, CEO frozen view) have
 * no drawn screen at all, so they take the kit's own Warning tone instead of
 * inventing a white box with an off-palette amber icon.
 */

interface InfoOverride {
  title: string
  description: string
  /**
   * Override the info-block icon. Default `'check'` (circled check used for
   * status-based info blocks like "Бриф готовий!" / "Бриф на розгляді").
   * Use `'warning'` for return / revision attention banners (filled circle icon).
   */
  iconVariant?: 'check' | 'warning'
}

interface ReviewHeaderProps {
  /** Brand internal name (when known) or fallback "New Brand". */
  title: string
  /** Brand status — drives the badge/info block. */
  status: 'submitted' | 'needs_revision' | 'approved' | string
  /** Optional line under the title (e.g. PO final step instruction). */
  subtitle?: string
  /** When set, replaces status-derived info block (PO “Бриф готовий!”). */
  infoOverride?: InfoOverride | null
}

const props = withDefaults(defineProps<ReviewHeaderProps>(), {
  subtitle: undefined,
  infoOverride: undefined,
})

const showStatusBadge = computed(
  () =>
    props.status === 'submitted' ||
    props.status === 'needs_revision' ||
    props.status === 'approved'
)

interface InfoMeta {
  title: string
  description: string
  iconVariant?: 'check' | 'warning'
}

const info = computed<InfoMeta | null>(() => {
  switch (props.status) {
    case 'submitted':
      return {
        title: 'Бриф на розгляді',
        description:
          'Перегляньте бриф та залиште коментарі. Затвердіть або поверніть на доопрацювання.',
      }
    case 'needs_revision':
      return {
        title: 'Бриф потребує доопрацювання',
        description:
          'Залиште коментарі у відповідних секціях, після чого замовник зможе внести зміни.',
        iconVariant: 'warning' as const,
      }
    case 'approved':
      return {
        title: 'Бриф затверджено',
        description: 'Ви затвердили цей бриф. Подальші дії — на стороні дизайн-команди.',
      }
    default:
      return null
  }
})

const displayInfo = computed<InfoMeta | null>(() => {
  // Explicit null means "hide the info block regardless of status"
  if (props.infoOverride === null) return null
  if (props.infoOverride) {
    return {
      title: props.infoOverride.title,
      description: props.infoOverride.description,
      iconVariant: props.infoOverride.iconVariant ?? 'check',
    }
  }
  return info.value
})
</script>

<template>
  <header class="review-header">
    <UiStepHeader
      :title="title"
      :description="subtitle"
    >
      <template v-if="showStatusBadge" #badge>
        <BrandBriefStatusBadge class="review-header__badge shrink-0" :status="status" />
      </template>

      <!-- The kit's Alert slot — `3461:5237`, geometry owned by `ui/uiAlert.ts`. -->
      <template v-if="displayInfo" #alert>
        <UiAlert
          class="review-header__info"
          :type="displayInfo.iconVariant === 'warning' ? 'warning' : 'default'"
          :title="displayInfo.title"
          :description="displayInfo.description"
        >
          <template #icon="{ iconClass }">
            <InfoCircleFilledIcon
              v-if="displayInfo.iconVariant === 'warning'"
              :class="[iconClass, 'review-header__info-icon review-header__info-icon--warning']"
            />
            <CheckBadgeIcon
              v-else
              :class="[iconClass, 'review-header__info-icon review-header__info-icon--check']"
            />
          </template>
        </UiAlert>
      </template>
    </UiStepHeader>
  </header>
</template>
