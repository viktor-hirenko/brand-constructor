<script setup lang="ts">
import { useSlots } from 'vue'
import { resolveUiStepHeaderClasses } from '@/components/ui/uiStepHeader'

/**
 * Kit step header — Figma `4463:9758` → `3984:8226`.
 *
 * Title + optional badge, description, optional alert. One component for all
 * three shells: the wizard (`BriefShellView`), the edit / reselect flows
 * (`EditFlowStepShell`) and the review shell (`ReviewHeader`), which each wrote
 * their own version of the same block before DP-15258 phase 3.
 *
 * **No progress row.** The kit's symbol has no such node — not even a hidden
 * one — and none of the drawn screens shows one here. In the kit the progress
 * is the 1px rule at the bottom of `Wizard header` `5382:30951`, and that is
 * where `UiWizardHeader` now draws it. Divergences rows 4 and 79.
 *
 * The `alert` slot is the kit's Alert instance: on the drawn step-8 screens it
 * is an `Alert` at 16 below the text block, and since the review work the review
 * shell fills it with `UiAlert` rather than a block of its own.
 */
interface UiStepHeaderProps {
  title: string
  description?: string
}

withDefaults(defineProps<UiStepHeaderProps>(), {
  description: '',
})

const slots = useSlots()
const classes = resolveUiStepHeaderClasses()
</script>

<template>
  <div :class="classes.root">
    <div :class="classes.text">
      <div :class="classes.titleRow">
        <h1 :class="classes.title">{{ title }}</h1>
        <slot name="badge" />
      </div>
      <p v-if="description" :class="classes.description">{{ description }}</p>
    </div>

    <div v-if="slots.alert" class="ui-step-header__alert">
      <slot name="alert" />
    </div>
  </div>
</template>
