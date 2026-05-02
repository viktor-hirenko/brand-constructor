<script setup lang="ts">
import { computed } from 'vue'

interface ReviewHeaderProps {
  /** Brand internal name (when known) or fallback "New Brand". */
  title: string
  /** Brand status — drives the badge/info block. */
  status: 'submitted' | 'needs_revision' | 'approved' | 'rejected' | string
}

const props = defineProps<ReviewHeaderProps>()

interface BadgeMeta {
  text: string
  classes: string
}

const badge = computed<BadgeMeta | null>(() => {
  switch (props.status) {
    case 'submitted':
      return { text: 'На розгляді', classes: 'bg-blue-50 text-blue-700' }
    case 'needs_revision':
      return { text: 'Потрібно доопрацювати', classes: 'bg-amber-50 text-amber-700' }
    case 'approved':
      return { text: 'Затверджено', classes: 'bg-green-50 text-green-700' }
    case 'rejected':
      return { text: 'Відхилено', classes: 'bg-red-50 text-red-700' }
    default:
      return null
  }
})

interface InfoMeta {
  title: string
  description: string
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
</script>

<template>
  <header class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-medium tracking-[-0.6px] text-foreground">{{ title }}</h1>
      <span
        v-if="badge"
        :class="[
          'inline-flex items-center h-6 px-2 py-1 rounded-full text-xs font-medium tracking-[-0.15px]',
          badge.classes,
        ]"
      >
        {{ badge.text }}
      </span>
    </div>

    <div v-if="info" class="rounded-2xl bg-[#f3f3f5] px-6 py-6">
      <div class="flex items-start gap-3 mb-2">
        <svg
          class="size-6 shrink-0 text-foreground/80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="text-lg font-medium tracking-[-0.45px] text-foreground">{{ info.title }}</h3>
      </div>
      <p class="text-sm text-muted-foreground leading-5 pl-9">{{ info.description }}</p>
    </div>
  </header>
</template>
