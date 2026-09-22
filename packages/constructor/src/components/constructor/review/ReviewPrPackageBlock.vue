<script setup lang="ts">
import EyeIcon from '@/components/icons/EyeIcon.vue'
import MegaphoneIcon from '@/components/icons/MegaphoneIcon.vue'
import UiLink from '@/components/ui/UiLink.vue'
import UiProperty from '@/components/ui/UiProperty.vue'

interface ReviewPrPackageBlockProps {
  /** Package title (e.g. "Media Reputation"). */
  title: string
}

defineProps<ReviewPrPackageBlockProps>()

const emit = defineEmits<{
  view: []
}>()
</script>

<template>
  <!--
    Kit Property, Type = Icon + Value (`3761:2282`) — the one type that draws a
    trailing Link slot, 48×16, centred against the 24 value line. That is
    exactly this row: an icon, the package name, and «Переглянути».
  -->
  <UiProperty class="review-pr-package-block" type="icon-value" :value="title">
    <template #icon="{ iconClass }">
      <MegaphoneIcon :class="iconClass" />
    </template>
    <template #trailing>
      <UiLink class="review-pr-package-block__view-button" @click="emit('view')">
        <template #icon="{ iconClass }"><EyeIcon :class="iconClass" /></template>
        Переглянути
      </UiLink>
    </template>
  </UiProperty>
</template>
