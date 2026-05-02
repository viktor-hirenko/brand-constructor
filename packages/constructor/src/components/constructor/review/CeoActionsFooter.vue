<script setup lang="ts">
interface CeoActionsFooterProps {
  loading?: boolean
  /** Validation message ("Додайте хоча б один коментар…"). When set the revise button is highlighted. */
  warning?: string | null
  /** Whether to show the approve button (hidden in needs_revision after CEO already returned the brief). */
  showApprove?: boolean
  /** Whether to show the revise button (hidden in approved). */
  showRevise?: boolean
}

withDefaults(defineProps<CeoActionsFooterProps>(), {
  loading: false,
  warning: null,
  showApprove: true,
  showRevise: true,
})

const emit = defineEmits<{
  approve: []
  revise: []
}>()
</script>

<template>
  <div class="space-y-3">
    <button
      v-if="showApprove"
      type="button"
      class="w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#030213] text-white text-base font-medium hover:opacity-90 transition-all disabled:opacity-50"
      :disabled="loading"
      @click="emit('approve')"
    >
      <svg
        class="size-5 shrink-0 text-white"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M18.457 5.98234C18.7429 5.68284 19.2179 5.67131 19.5175 5.95695C19.817 6.24284 19.8286 6.71785 19.5429 7.0175L9.04291 18.0175C8.9035 18.1636 8.71063 18.2476 8.50873 18.2499C8.30681 18.2523 8.11246 18.173 7.96967 18.0302L4.46967 14.5302C4.17678 14.2373 4.17678 13.7625 4.46967 13.4696C4.76256 13.1768 5.23732 13.1768 5.53022 13.4696L8.48725 16.4267L18.457 5.98234Z"
          fill="white"
        />
      </svg>
      <span>{{ loading ? 'Зачекайте...' : 'Затвердити' }}</span>
    </button>

    <button
      v-if="showRevise"
      type="button"
      :class="[
        'w-full h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl border text-base font-medium transition-all disabled:opacity-50',
        warning
          ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-black/10 text-foreground hover:bg-black/[0.02]',
      ]"
      :disabled="loading"
      @click="emit('revise')"
    >
      <svg
        class="size-5 shrink-0 text-[#0A0A0A]"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4.02642 11.4179C4.321 11.1776 4.75571 11.195 5.03032 11.4697L8.03032 14.4697C8.32319 14.7626 8.32321 15.2373 8.03032 15.5302C7.73744 15.8231 7.26266 15.8231 6.96978 15.5302L5.28521 13.8456C5.2963 14.1344 5.3099 14.4225 5.32622 14.7099L5.38579 15.6054V15.6064C5.4433 16.3849 5.77911 17.1169 6.33111 17.6689C6.8831 18.2209 7.61509 18.5567 8.39361 18.6142H8.39458C10.7948 18.7953 13.2053 18.7953 15.6055 18.6142H15.6065C16.385 18.5567 17.117 18.2209 17.669 17.6689C18.221 17.1169 18.5568 16.3849 18.6143 15.6064V15.6044C18.631 15.389 18.6454 15.1709 18.6592 14.9521C18.6856 14.539 19.042 14.2249 19.4551 14.2509C19.8684 14.2771 20.1822 14.6336 20.1563 15.0468C20.1422 15.2687 20.1267 15.4925 20.1094 15.7157L20.1104 15.7167C20.0264 16.8539 19.5358 17.9231 18.7295 18.7294C17.9232 19.5357 16.854 20.0263 15.7168 20.1103L15.7159 20.1093C13.2418 20.2959 10.7573 20.296 8.28325 20.1093V20.1103C7.14609 20.0263 6.07686 19.5357 5.27056 18.7294C4.46426 17.9231 3.9737 16.8539 3.8897 15.7167V15.7157C3.84081 15.0728 3.80554 14.4265 3.78228 13.7773L2.03032 15.5302C1.73744 15.8231 1.26266 15.8231 0.969777 15.5302C0.676894 15.2373 0.676914 14.7626 0.969777 14.4697L3.96978 11.4697L4.02642 11.4179ZM8.2813 3.89055C10.7567 3.7038 13.2434 3.70282 15.7188 3.88958L15.7178 3.89055C16.8548 3.97468 17.9234 4.46427 18.7295 5.27044C19.5357 6.07663 20.0263 7.14515 20.1104 8.28216H20.1094C20.1584 8.92547 20.1936 9.57201 20.2168 10.2216L21.9698 8.46966C22.2627 8.17676 22.7374 8.17676 23.0303 8.46966C23.3232 8.76255 23.3232 9.23732 23.0303 9.5302L20.0303 12.5302C19.7374 12.8231 19.2627 12.8231 18.9698 12.5302L15.9698 9.5302C15.6769 9.23732 15.6769 8.76255 15.9698 8.46966C16.2627 8.17676 16.7374 8.17676 17.0303 8.46966L18.7139 10.1532C18.6913 9.56423 18.6587 8.9777 18.6143 8.39446V8.39348C18.5568 7.61497 18.221 6.88298 17.669 6.33098C17.117 5.77898 16.385 5.44318 15.6065 5.38567H15.6055C13.2053 5.2046 10.7948 5.2046 8.39458 5.38567H8.39361C7.61508 5.44318 6.88311 5.77898 6.33111 6.33098C5.77912 6.88298 5.4433 7.61497 5.38579 8.39348V8.39544C5.36916 8.61071 5.35473 8.82811 5.34087 9.0468C5.31469 9.46009 4.95822 9.77399 4.54497 9.74798C4.13159 9.72179 3.81761 9.36546 3.8438 8.95208C3.85788 8.72977 3.87242 8.50589 3.8897 8.28216C3.97379 7.14515 4.46438 6.07663 5.27056 5.27044C6.07649 4.4645 7.14469 3.97488 8.2813 3.89055Z"
          fill="#0A0A0A"
        />
      </svg>
      <span>Повернути на доопрацювання</span>
    </button>

    <p v-if="warning" class="text-sm text-amber-700 flex items-center gap-2" role="alert">
      <svg
        class="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span>{{ warning }}</span>
    </p>
  </div>
</template>
