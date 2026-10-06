<script setup lang="ts">
import { useRouter } from 'vue-router'
import SupervisorBriefGateView from '@/components/constructor/review/SupervisorBriefGateView.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { postClose } from '@/composables/useEmbedBridge'
import { isEmbedded } from '@/composables/useEmbedMode'

/**
 * A direct link to a brief the person may not open — another author's brief,
 * or one their role cannot see yet (H-41, T-083; H-52, U-13). The router sends
 * them here when the server answers «not found»: `router/briefLoadFailure.ts`.
 *
 * The look is the CEO's «Бриф ще в роботі» stub, the one such screen the
 * wizard already had.
 */

const router = useRouter()

/**
 * The same exit as the header cross (`BriefShellView` `leaveWizard`) and the
 * success screen's «До списку брендів»: inside the Admin the frame closes back
 * to Brands; standalone there is no list, so it goes to the landing.
 */
function handleBackToBrands() {
  if (isEmbedded()) {
    postClose()
    return
  }
  router.push('/')
}
</script>

<template>
  <SupervisorBriefGateView
    title="Немає доступу до цього брифу"
    description="Цей бриф належить іншому автору або зараз недоступний для вашої ролі."
  >
    <UiButton variant="primary" size="L" class="w-full" @click="handleBackToBrands">
      До списку брендів
    </UiButton>
  </SupervisorBriefGateView>
</template>
