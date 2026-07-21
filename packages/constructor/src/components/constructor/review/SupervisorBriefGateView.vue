<script setup lang="ts">
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'

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
  <!-- Full-viewport terminal screen — same shell as BrandSuccessView, not inside BriefShell dual pane. -->
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div class="w-full max-w-lg text-center">
      <div class="bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-12">
        <div
          class="size-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-orange-100"
        >
          <InfoCircleFilledIcon class="size-8 text-orange-600" />
        </div>

        <h1 class="text-2xl font-medium text-foreground mb-2">Бриф ще в роботі</h1>
        <p class="text-muted-foreground mb-8">
          CEO-ревʼю буде доступне після того, як Product Owner обере готовий концепт і відправить
          бриф на погодження.
        </p>

        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="w-full h-[50px] border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
            @click="goToAdminBrands"
          >
            Повернутися до списку
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
