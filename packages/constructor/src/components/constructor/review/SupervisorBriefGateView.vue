<script setup lang="ts">
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'

/**
 * A brief the person cannot work with here. Its defaults are the CEO's
 * «Бриф ще в роботі»; `BriefNoAccessView` passes its own words and a way out
 * through the default slot, so both stubs look the same (H-52, U-13).
 */
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Бриф ще в роботі',
    description:
      'CEO-ревʼю буде доступне після того, як Product Owner обере готовий концепт і відправить бриф на погодження.',
  }
)
</script>

<template>
  <!-- Full-viewport terminal screen — same shell as BrandSuccessView, not inside BriefShell dual pane. -->
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div class="w-full max-w-lg text-center">
      <div class="bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-12">
        <div
          class="size-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-orange-100"
        >
          <InfoCircleFilledIcon class="size-8 text-orange-600" />
        </div>

        <h1 class="text-2xl font-medium text-foreground mb-2">{{ title }}</h1>
        <p class="text-muted-foreground">{{ description }}</p>

        <!-- 32 from the text to the buttons, as on BrandSuccessView. -->
        <div v-if="$slots.default" class="mt-8 flex flex-col gap-3">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
