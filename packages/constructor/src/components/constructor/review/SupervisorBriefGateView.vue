<script setup lang="ts">
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import { BRIEF_BTN_SECONDARY } from '@/constants/brandBriefShellTokens'

function goToAdminBrands() {
  const adminBase = import.meta.env.VITE_ADMIN_URL?.replace(/\/$/, '')
  if (adminBase) {
    window.location.href = `${adminBase}/brands`
    return
  }
  window.location.href = '/brands'
}
</script>

<template>
  <div class="supervisor-brief-gate min-h-[100dvh] bg-background flex items-center justify-center p-6">
    <div class="supervisor-brief-gate__card w-full max-w-lg text-center">
      <div
        class="supervisor-brief-gate__panel bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-12"
      >
        <div
          class="supervisor-brief-gate__icon size-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-orange-100"
        >
          <InfoCircleFilledIcon class="size-8 text-orange-600" />
        </div>

        <h1 class="supervisor-brief-gate__title text-2xl font-medium text-foreground mb-2">
          Бриф ще в роботі
        </h1>
        <p class="supervisor-brief-gate__description text-muted-foreground mb-8">
          CEO-ревʼю буде доступне після того, як Product Owner обере готовий концепт і відправить
          бриф на погодження.
        </p>

        <button
          type="button"
          :class="BRIEF_BTN_SECONDARY"
          class="supervisor-brief-gate__back w-full h-[50px] text-base font-medium"
          @click="goToAdminBrands"
        >
          Повернутися до списку
        </button>
      </div>
    </div>
  </div>
</template>
